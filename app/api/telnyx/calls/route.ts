import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import CallRecording from "@/models/CallRecording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateTelnyxCallRequest = {
  to?: string;
  from?: string;

  /**
   * נשאר לתאימות לאחור, אבל לא מסתמכים עליו כמקור אמת.
   * מקור האמת לעובד הוא המשתמש המחובר מה-JWT.
   */
  agentId?: string;
  clientState?: Record<string, unknown>;
};

type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  email?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  isAdmin?: boolean;
  isSystemStaff?: boolean;
  effectiveRole?: string;
  [key: string]: unknown;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type TelnyxCreateCallResponse = {
  data?: {
    call_control_id?: string;
    call_leg_id?: string;
    call_session_id?: string;
    connection_id?: string;
    from?: string;
    to?: string;
    [key: string]: unknown;
  };
  errors?: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseTelnyxCallsCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseTelnyxCallsCache ||
  (global.mongooseTelnyxCallsCache = {
    conn: null,
    promise: null,
  });

async function connectMongo() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

  if (!uri) {
    throw new Error("Mongo connection string is missing. Set MONGODB_URI or MONGO_URI.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function getTokenFromCookies(req: NextRequest) {
  const possibleCookieNames = [
    "token",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "adminToken",
    "admin_token",
    "staffToken",
    "staff_token",
    "employeeToken",
    "employee_token",
  ];

  for (const name of possibleCookieNames) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }

  return "";
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

function buildNameFromDecoded(decoded: JwtPayload) {
  const directName =
    cleanStr(decoded.name) ||
    cleanStr(decoded.fullName) ||
    cleanStr(decoded.displayName);

  if (directName) return directName;

  const firstName = cleanStr(decoded.firstName);
  const lastName = cleanStr(decoded.lastName);
  const combined = `${firstName} ${lastName}`.trim();

  return combined;
}

function extractUserId(decoded: JwtPayload) {
  return cleanStr(decoded.userId) || cleanStr(decoded.id) || cleanStr(decoded._id);
}

function normalizeUserDoc(doc: any, fallback: JwtPayload): AuthUser {
  const fallbackId = extractUserId(fallback);
  const fallbackEmail = cleanStr(fallback.email);
  const fallbackName = buildNameFromDecoded(fallback);

  const docId = cleanStr(doc?._id?.toString?.()) || cleanStr(doc?.id);
  const docEmail = cleanStr(doc?.email);
  const docName =
    cleanStr(doc?.name) ||
    cleanStr(doc?.fullName) ||
    cleanStr(doc?.displayName) ||
    `${cleanStr(doc?.firstName)} ${cleanStr(doc?.lastName)}`.trim();

  return {
    id: docId || fallbackId || fallbackEmail || "unknown-user",
    name: docName || fallbackName || docEmail || fallbackEmail || "עובד",
    email: docEmail || fallbackEmail || "",
    role: cleanStr(doc?.role) || cleanStr(fallback.role) || "",
  };
}

async function findUserFromToken(decoded: JwtPayload): Promise<AuthUser> {
  const fallbackUser = normalizeUserDoc(null, decoded);

  try {
    await connectMongo();

    const userId = extractUserId(decoded);
    const email = cleanStr(decoded.email).toLowerCase();

    const orQuery: Record<string, unknown>[] = [];

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      orQuery.push({ _id: new mongoose.Types.ObjectId(userId) });
    }

    if (userId) {
      orQuery.push({ id: userId });
      orQuery.push({ userId });
    }

    if (email) {
      orQuery.push({ email });
    }

    if (!orQuery.length) {
      return fallbackUser;
    }

    /**
     * לא מייבאים כאן User model כדי לא להיתקע על שם מודל שונה.
     * קוראים ישירות לקולקציה users.
     */
    const userDoc = await mongoose.connection.collection("users").findOne({
      $or: orQuery,
    });

    if (!userDoc) {
      return fallbackUser;
    }

    return normalizeUserDoc(userDoc, decoded);
  } catch (error) {
    console.warn("FIND USER FROM TOKEN FAILED, USING JWT FALLBACK:", error);
    return fallbackUser;
  }
}

async function getCurrentUser(req: NextRequest) {
  const token = getBearerToken(req) || getTokenFromCookies(req);

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED_NO_TOKEN",
    };
  }

  const secret = getJwtSecret();

  if (!secret) {
    return {
      ok: false as const,
      status: 500,
      error: "JWT_SECRET is missing",
    };
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await findUserFromToken(decoded);

    return {
      ok: true as const,
      user,
      decoded,
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED_INVALID_TOKEN",
      details: error instanceof Error ? error.message : error,
    };
  }
}

function normalizePhoneNumber(value: unknown) {
  if (typeof value !== "string") return "";

  let clean = value.trim();

  clean = clean.replace(/[^\d+]/g, "");

  if (!clean) return "";

  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));

  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }

  if (clean.startsWith("+")) {
    return clean;
  }

  if (clean.startsWith("972")) {
    return `+${clean}`;
  }

  if (clean.startsWith("0") && clean.length >= 8) {
    return `+972${clean.slice(1)}`;
  }

  if (clean.length === 9 && clean.startsWith("5")) {
    return `+972${clean}`;
  }

  if (clean.length === 8 && /^[23489]/.test(clean)) {
    return `+972${clean}`;
  }

  return clean;
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }

  return req.nextUrl.origin;
}

function encodeClientState(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function safeClientState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Telnyx outbound calls endpoint is alive",
  });
}

export async function POST(req: NextRequest) {
  let localCallRecordingId = "";

  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser.ok) {
      return jsonError(
        currentUser.error || "UNAUTHORIZED",
        currentUser.status || 401,
        "details" in currentUser ? currentUser.details : undefined
      );
    }

    const apiKey = process.env.TELNYX_API_KEY;
    const connectionId = process.env.TELNYX_CONNECTION_ID;
    const defaultFrom = process.env.TELNYX_FROM_NUMBER || "+97283761556";

    if (!apiKey) {
      return jsonError("TELNYX_API_KEY is missing", 500);
    }

    if (!connectionId) {
      return jsonError("TELNYX_CONNECTION_ID is missing", 500);
    }

    const body = (await req.json().catch(() => ({}))) as CreateTelnyxCallRequest;

    const originalTo = typeof body.to === "string" ? body.to : "";
    const originalFrom =
      typeof body.from === "string" && body.from.trim()
        ? body.from
        : defaultFrom;

    const to = normalizePhoneNumber(originalTo);
    const from = normalizePhoneNumber(originalFrom);

    if (!to) {
      return jsonError("Missing destination phone number: to", 400, {
        receivedTo: body.to || null,
      });
    }

    if (!from) {
      return jsonError("Missing caller ID phone number: from", 400, {
        receivedFrom: body.from || null,
        defaultFrom,
      });
    }

    await connectMongo();

    const baseUrl = getBaseUrl(req);
    const webhookUrl =
      process.env.TELNYX_VOICE_WEBHOOK_URL ||
      `${baseUrl}/api/telnyx/voice/webhook`;

    const user = currentUser.user;
    const now = new Date();

    /**
     * קודם יוצרים רשומת שיחה מקומית.
     * זה מה שהיה חסר אצלך.
     * ככה גם אם ה-recording.saved מגיע אחר כך לבד,
     * יהיה לנו כבר מי העובד, מה המייל שלו, ולאיזה מספר הוא חייג.
     */
    const initialCallRecording = await CallRecording.create({
      provider: "telnyx",
      source: "softphone",

      callStatus: "initiated",
      recordingStatus: "pending",

      direction: "outbound",

      from,
      to,
      customerPhone: to,
      customerName: "",

      agentId: user.id,
      agentName: user.name,
      agentEmail: user.email,

      connectionId,

      startedAt: now,
      answeredAt: null,
      endedAt: null,
      recordedAt: null,
      durationSeconds: 0,

      clientState: {},
      rawPayload: {
        source: "create-outbound-call-route",
        stage: "created-before-telnyx",
        requestedAt: now.toISOString(),
        originalTo,
        originalFrom,
        normalizedTo: to,
        normalizedFrom: from,
        agentId: user.id,
        agentName: user.name,
        agentEmail: user.email,
      },
    });

    localCallRecordingId = initialCallRecording._id.toString();

    /**
     * חשוב:
     * קודם מכניסים clientState מהפרונט,
     * ואז דורסים agentId / agentName / agentEmail לפי היוזר המחובר.
     * ככה אי אפשר לזייף עובד מהפרונט.
     *
     * בנוסף מוסיפים localCallRecordingId,
     * כדי שה-webhook יוכל למצוא את הרשומה בוודאות.
     */
    const clientStateObject: Record<string, unknown> = {
      ...safeClientState(body.clientState),

      source: "invistimo-softphone",
      requestedAt: now.toISOString(),

      localCallRecordingId,
      callRecordingId: localCallRecordingId,

      originalTo,
      originalFrom,
      normalizedTo: to,
      normalizedFrom: from,

      customerPhone: to,
      dialedPhone: to,
      destinationPhone: to,

      agentId: user.id,
      agentName: user.name,
      agentEmail: user.email,
      agentRole: user.role,
    };

    await CallRecording.updateOne(
      { _id: initialCallRecording._id },
      {
        $set: {
          clientState: clientStateObject,
          rawPayload: {
            source: "create-outbound-call-route",
            stage: "client-state-prepared",
            requestedAt: now.toISOString(),
            originalTo,
            originalFrom,
            normalizedTo: to,
            normalizedFrom: from,
            webhookUrl,
            localCallRecordingId,
            agentId: user.id,
            agentName: user.name,
            agentEmail: user.email,
          },
        },
      }
    );

    const clientState = encodeClientState(clientStateObject);

    const telnyxPayload = {
      connection_id: connectionId,
      to,
      from,
      webhook_url: webhookUrl,
      webhook_url_method: "POST",
      client_state: clientState,
    };

    console.log("TELNYX CREATE OUTBOUND CALL REQUEST:", {
      localCallRecordingId,
      connectionId,
      originalTo,
      originalFrom,
      normalizedTo: to,
      normalizedFrom: from,
      webhookUrl,
      agentId: user.id,
      agentName: user.name,
      agentEmail: user.email,
    });

    const telnyxRes = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(telnyxPayload),
    });

    const telnyxData =
      (await telnyxRes.json().catch(() => null)) as
        | TelnyxCreateCallResponse
        | null;

    if (!telnyxRes.ok) {
      console.error("TELNYX CREATE OUTBOUND CALL FAILED:", {
        localCallRecordingId,
        status: telnyxRes.status,
        originalTo,
        originalFrom,
        normalizedTo: to,
        normalizedFrom: from,
        agentId: user.id,
        agentName: user.name,
        agentEmail: user.email,
        data: telnyxData,
      });

      await CallRecording.updateOne(
        { _id: initialCallRecording._id },
        {
          $set: {
            callStatus: "failed",
            telnyxCallStatus: "create_call_failed",
            endedAt: new Date(),
            lastWebhookEvent: "telnyx_create_call_failed",
            rawPayload: {
              source: "create-outbound-call-route",
              stage: "telnyx-create-failed",
              status: telnyxRes.status,
              requestedAt: now.toISOString(),
              failedAt: new Date().toISOString(),
              originalTo,
              originalFrom,
              normalizedTo: to,
              normalizedFrom: from,
              localCallRecordingId,
              agentId: user.id,
              agentName: user.name,
              agentEmail: user.email,
              telnyx: telnyxData,
            },
          },
        }
      );

      return jsonError(
        "TELNYX_CREATE_OUTBOUND_CALL_FAILED",
        telnyxRes.status,
        {
          localCallRecordingId,
          originalTo,
          originalFrom,
          normalizedTo: to,
          normalizedFrom: from,
          agentId: user.id,
          agentName: user.name,
          agentEmail: user.email,
          telnyx: telnyxData,
        }
      );
    }

    const callControlId = telnyxData?.data?.call_control_id || "";
    const callLegId = telnyxData?.data?.call_leg_id || "";
    const callSessionId = telnyxData?.data?.call_session_id || "";
    const telnyxConnectionId = telnyxData?.data?.connection_id || connectionId;

    await CallRecording.updateOne(
      { _id: initialCallRecording._id },
      {
        $set: {
          callControlId,
          callLegId,
          callSessionId,
          connectionId: telnyxConnectionId,

          callStatus: "initiated",
          telnyxCallStatus: "created",
          lastWebhookEvent: "telnyx_create_call_success",

          from: telnyxData?.data?.from || from,
          to: telnyxData?.data?.to || to,
          customerPhone: telnyxData?.data?.to || to,

          rawPayload: {
            source: "create-outbound-call-route",
            stage: "telnyx-create-success",
            requestedAt: now.toISOString(),
            createdAt: new Date().toISOString(),
            originalTo,
            originalFrom,
            normalizedTo: to,
            normalizedFrom: from,
            localCallRecordingId,
            callControlId,
            callLegId,
            callSessionId,
            connectionId: telnyxConnectionId,
            agentId: user.id,
            agentName: user.name,
            agentEmail: user.email,
            telnyx: telnyxData,
          },
        },
      }
    );

    console.log("TELNYX CREATE OUTBOUND CALL SUCCESS:", {
      localCallRecordingId,
      callControlId,
      callLegId,
      callSessionId,
      to,
      from,
      agentId: user.id,
      agentName: user.name,
      agentEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      call: {
        localCallRecordingId,

        callControlId: callControlId || null,
        callLegId: callLegId || null,
        callSessionId: callSessionId || null,
        connectionId: telnyxConnectionId,

        from,
        to,
        originalTo,
        originalFrom,

        agentId: user.id,
        agentName: user.name,
        agentEmail: user.email,
      },
      telnyx: telnyxData,
    });
  } catch (error) {
    console.error("TELNYX OUTBOUND CALL ROUTE ERROR:", {
      localCallRecordingId,
      error,
    });

    if (localCallRecordingId && mongoose.Types.ObjectId.isValid(localCallRecordingId)) {
      try {
        await CallRecording.updateOne(
          { _id: new mongoose.Types.ObjectId(localCallRecordingId) },
          {
            $set: {
              callStatus: "failed",
              telnyxCallStatus: "route_error",
              endedAt: new Date(),
              lastWebhookEvent: "create_call_route_error",
              rawPayload: {
                source: "create-outbound-call-route",
                stage: "route-error",
                failedAt: new Date().toISOString(),
                error: error instanceof Error ? error.message : error,
              },
            },
          }
        );
      } catch (mongoError) {
        console.error("FAILED TO UPDATE CALL RECORDING AFTER ROUTE ERROR:", mongoError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "TELNYX_OUTBOUND_CALL_ROUTE_FAILED",
        details: error instanceof Error ? error.message : error,
        localCallRecordingId: localCallRecordingId || null,
      },
      { status: 500 }
    );
  }
}