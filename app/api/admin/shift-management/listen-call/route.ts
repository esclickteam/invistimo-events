import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  email?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseAdminListenCallCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseAdminListenCallCache ||
  (global.mongooseAdminListenCallCache = {
    conn: null,
    promise: null,
  });

async function connectMongo() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

  if (!uri) {
    throw new Error("Mongo connection string is missing");
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
    { status },
  );
}

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  return "";
}

function getTokenFromCookies(req: NextRequest) {
  const names = [
    "token",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "adminToken",
    "admin_token",
  ];

  for (const name of names) {
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

function getUserId(decoded: JwtPayload) {
  return cleanStr(decoded.userId) || cleanStr(decoded.id) || cleanStr(decoded._id);
}

function mergeAnd(...queries: Record<string, unknown>[]) {
  const cleanQueries = queries.filter((query) => {
    return query && typeof query === "object" && Object.keys(query).length > 0;
  });

  if (cleanQueries.length === 0) return {};
  if (cleanQueries.length === 1) return cleanQueries[0];

  return {
    $and: cleanQueries,
  };
}

async function getCurrentAdmin(req: NextRequest) {
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

    await connectMongo();

    const userId = getUserId(decoded);
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

    const userDoc = orQuery.length
      ? await mongoose.connection.collection("users").findOne({ $or: orQuery })
      : null;

    const role = cleanStr(userDoc?.role || decoded.role).toLowerCase();

    const isAdmin =
      decoded.isAdmin === true ||
      role === "admin" ||
      role === "super_admin" ||
      role === "owner";

    if (!isAdmin) {
      return {
        ok: false as const,
        status: 403,
        error: "FORBIDDEN_ADMIN_ONLY",
      };
    }

    return {
      ok: true as const,
      admin: {
        id: cleanStr(userDoc?._id?.toString?.()) || userId || email,
        email: cleanStr(userDoc?.email) || email,
        role,
      },
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

function signMonitorToken(payload: Record<string, unknown>) {
  const secret =
    process.env.CALL_MONITOR_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";

  if (!secret) return "";

  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function buildEmployeeMatchQuery(employeeId: string, employeeEmail: string) {
  const or: Record<string, unknown>[] = [];

  if (employeeId) {
    or.push({ agentId: employeeId });
    or.push({ employeeId });
    or.push({ staffId: employeeId });
    or.push({ userId: employeeId });

    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      const objectId = new mongoose.Types.ObjectId(employeeId);

      or.push({ agentId: objectId });
      or.push({ employeeId: objectId });
      or.push({ staffId: objectId });
      or.push({ userId: objectId });
    }
  }

  if (employeeEmail) {
    or.push({ agentEmail: employeeEmail });
    or.push({ employeeEmail });
    or.push({ staffEmail: employeeEmail });
  }

  return or.length ? { $or: or } : {};
}

function buildCallIdQuery(callControlId: string) {
  return {
    $or: [
      { callControlId },
      { call_control_id: callControlId },
      { callLegId: callControlId },
      { call_leg_id: callControlId },
      { "currentCall.callControlId": callControlId },
      { "currentCall.call_control_id": callControlId },
      { "currentCall.callLegId": callControlId },
      { "currentCall.call_leg_id": callControlId },
    ],
  };
}

function buildActiveCallQuery() {
  return {
    $or: [
      { active: true },
      { isActive: true },
      { "currentCall.active": true },
      { "currentCall.isActive": true },
      { status: { $in: ["initiated", "dialing", "ringing", "answered", "in_call", "bridged"] } },
      { callStatus: { $in: ["initiated", "dialing", "ringing", "answered", "in_call", "bridged"] } },
      { "currentCall.status": { $in: ["initiated", "dialing", "ringing", "answered", "in_call", "bridged"] } },
      { "currentCall.callStatus": { $in: ["initiated", "dialing", "ringing", "answered", "in_call", "bridged"] } },
    ],
  };
}

async function findCurrentCall({
  employeeId,
  employeeEmail,
  callControlId,
}: {
  employeeId: string;
  employeeEmail: string;
  callControlId: string;
}) {
  const employeeQuery = buildEmployeeMatchQuery(employeeId, employeeEmail);
  const byCallId = buildCallIdQuery(callControlId);
  const activeCallQuery = buildActiveCallQuery();

  const statusDoc = await mongoose.connection
    .collection("softphonestatuses")
    .findOne(
      mergeAnd(employeeQuery, byCallId, activeCallQuery),
      {
        sort: {
          updatedAt: -1,
          lastSeenAt: -1,
          createdAt: -1,
        },
      },
    );

  if (statusDoc) return statusDoc;

  const callDoc = await mongoose.connection
    .collection("softphonecalls")
    .findOne(
      mergeAnd(employeeQuery, byCallId, activeCallQuery),
      {
        sort: {
          updatedAt: -1,
          lastSeenAt: -1,
          createdAt: -1,
        },
      },
    );

  if (callDoc) return callDoc;

  const recordingDoc = await mongoose.connection
    .collection("callrecordings")
    .findOne(
      byCallId,
      {
        sort: {
          updatedAt: -1,
          createdAt: -1,
        },
      },
    );

  return recordingDoc;
}

function getMonitorAudioUrl({
  monitorSessionId,
  token,
  req,
}: {
  monitorSessionId: string;
  token: string;
  req: NextRequest;
}) {
  const explicitUrl =
    process.env.NEXT_PUBLIC_CALL_MONITOR_AUDIO_URL ||
    process.env.CALL_MONITOR_AUDIO_URL ||
    "";

  if (explicitUrl) {
    const separator = explicitUrl.includes("?") ? "&" : "?";

    return `${explicitUrl}${separator}session=${encodeURIComponent(
      monitorSessionId,
    )}&token=${encodeURIComponent(token)}`;
  }

  const baseUrl = getBaseUrl(req);

  return `${baseUrl}/api/admin/shift-management/listen-audio?session=${encodeURIComponent(
    monitorSessionId,
  )}&token=${encodeURIComponent(token)}`;
}

function getMonitorStreamUrl({
  monitorSessionId,
  token,
}: {
  monitorSessionId: string;
  token: string;
}) {
  const explicitUrl =
    process.env.NEXT_PUBLIC_CALL_MONITOR_STREAM_URL ||
    process.env.CALL_MONITOR_STREAM_URL ||
    "";

  if (!explicitUrl) return "";

  const separator = explicitUrl.includes("?") ? "&" : "?";

  return `${explicitUrl}${separator}session=${encodeURIComponent(
    monitorSessionId,
  )}&token=${encodeURIComponent(token)}`;
}

async function tryStartTelnyxFork({
  callControlId,
  monitorSessionId,
}: {
  callControlId: string;
  monitorSessionId: string;
}) {
  const apiKey = process.env.TELNYX_API_KEY || "";
  const websocketUrl = process.env.TELNYX_CALL_MONITOR_WS_URL || "";

  if (!apiKey || !websocketUrl) {
    return {
      attempted: false,
      ok: false,
      reason: !apiKey
        ? "TELNYX_API_KEY_MISSING"
        : "TELNYX_CALL_MONITOR_WS_URL_MISSING",
    };
  }

  const telnyxRes = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId,
    )}/actions/fork_start`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        target: "websocket",
        target_url: websocketUrl,
        stream_type: "raw",
        client_state: Buffer.from(
          JSON.stringify({
            source: "admin-live-monitor",
            monitorSessionId,
            callControlId,
            requestedAt: new Date().toISOString(),
          }),
          "utf8",
        ).toString("base64"),
      }),
    },
  );

  const data = await telnyxRes.json().catch(() => null);

  return {
    attempted: true,
    ok: telnyxRes.ok,
    status: telnyxRes.status,
    data,
  };
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await getCurrentAdmin(req);

    if (!currentAdmin.ok) {
      return jsonError(
        currentAdmin.error,
        currentAdmin.status,
        "details" in currentAdmin ? currentAdmin.details : undefined,
      );
    }

    await connectMongo();

    const body = await req.json().catch(() => ({}));

    const employeeId = cleanStr(body?.employeeId);
    const employeeEmail = cleanStr(body?.employeeEmail).toLowerCase();
    const callControlId = cleanStr(body?.callControlId);

    if (!employeeId && !employeeEmail) {
      return jsonError("Missing employeeId or employeeEmail", 400);
    }

    if (!callControlId) {
      return jsonError("Missing callControlId", 400);
    }

    const currentCall = await findCurrentCall({
      employeeId,
      employeeEmail,
      callControlId,
    });

    if (!currentCall) {
      return jsonError("CALL_NOT_FOUND_OR_NOT_ACTIVE", 404);
    }

    const now = new Date();
    const monitorSessionId = new mongoose.Types.ObjectId().toString();

    const monitorToken = signMonitorToken({
      monitorSessionId,
      callControlId,
      employeeId,
      employeeEmail,
      adminId: currentAdmin.admin.id,
      adminEmail: currentAdmin.admin.email,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30).toISOString(),
    });

    if (!monitorToken) {
      return jsonError("CALL_MONITOR_SECRET_OR_JWT_SECRET_MISSING", 500);
    }

    const baseUrl = getBaseUrl(req);

    const monitorUrl = `${baseUrl}/admin/shift-management/listen?session=${encodeURIComponent(
      monitorSessionId,
    )}&token=${encodeURIComponent(monitorToken)}`;

    const audioUrl = getMonitorAudioUrl({
      monitorSessionId,
      token: monitorToken,
      req,
    });

    const streamUrl = getMonitorStreamUrl({
      monitorSessionId,
      token: monitorToken,
    });

    await mongoose.connection.collection("callmonitorsessions").insertOne({
      _id: new mongoose.Types.ObjectId(monitorSessionId),
      monitorSessionId,
      callControlId,
      employeeId,
      employeeEmail,
      adminId: currentAdmin.admin.id,
      adminEmail: currentAdmin.admin.email,
      monitorToken,
      monitorUrl,
      audioUrl,
      streamUrl,
      status: "created",
      source: "admin-shift-management-inline-row",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30),
      currentCall,
    });

    const forkResult = await tryStartTelnyxFork({
      callControlId,
      monitorSessionId,
    });

    const nextStatus =
      forkResult.attempted && forkResult.ok
        ? "fork_started"
        : "monitor_page_created";

    await mongoose.connection.collection("callmonitorsessions").updateOne(
      { monitorSessionId },
      {
        $set: {
          forkResult,
          status: nextStatus,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      monitorSessionId,
      monitorUrl,
      audioUrl,
      streamUrl,
      forkResult,
      status: nextStatus,
      message:
        forkResult.attempted && forkResult.ok
          ? "LISTEN_SESSION_CREATED_AND_FORK_STARTED"
          : "LISTEN_SESSION_CREATED_MONITOR_WS_NOT_CONFIGURED",
    });
  } catch (error) {
    console.error("ADMIN LISTEN CALL FAILED:", error);

    return jsonError(
      "ADMIN_LISTEN_CALL_FAILED",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}