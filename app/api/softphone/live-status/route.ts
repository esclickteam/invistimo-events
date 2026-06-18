import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AgentStatus =
  | "available"
  | "dialing"
  | "ringing"
  | "in_call"
  | "after_call"
  | "break"
  | "unavailable"
  | "offline";

type CallDirection = "none" | "outbound" | "inbound";

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
  [key: string]: unknown;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseSoftphoneLiveStatusCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseSoftphoneLiveStatusCache ||
  (global.mongooseSoftphoneLiveStatusCache = {
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

function getTokenFromCookies(req: NextRequest) {
  const names = [
    "token",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "staffToken",
    "staff_token",
    "employeeToken",
    "employee_token",
    "adminToken",
    "admin_token",
  ];

  for (const name of names) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }

  return "";
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
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

function extractUserId(decoded: JwtPayload) {
  return cleanStr(decoded.userId) || cleanStr(decoded.id) || cleanStr(decoded._id);
}

function buildName(decoded: JwtPayload) {
  const direct =
    cleanStr(decoded.name) ||
    cleanStr(decoded.fullName) ||
    cleanStr(decoded.displayName);

  if (direct) return direct;

  return `${cleanStr(decoded.firstName)} ${cleanStr(decoded.lastName)}`.trim();
}

function normalizeUserDoc(doc: any, fallback: JwtPayload): AuthUser {
  const fallbackId = extractUserId(fallback);
  const fallbackEmail = cleanStr(fallback.email);
  const fallbackName = buildName(fallback);

  const id = cleanStr(doc?._id?.toString?.()) || cleanStr(doc?.id);
  const email = cleanStr(doc?.email);
  const name =
    cleanStr(doc?.name) ||
    cleanStr(doc?.fullName) ||
    cleanStr(doc?.displayName) ||
    `${cleanStr(doc?.firstName)} ${cleanStr(doc?.lastName)}`.trim();

  return {
    id: id || fallbackId || fallbackEmail || "unknown-employee",
    name: name || fallbackName || email || fallbackEmail || "עובד",
    email: email || fallbackEmail || "",
    role: cleanStr(doc?.role) || cleanStr(fallback.role) || "",
  };
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
      orQuery.push({ employeeId: userId });
      orQuery.push({ staffId: userId });
    }

    if (email) {
      orQuery.push({ email });
    }

    const userDoc = orQuery.length
      ? await mongoose.connection.collection("users").findOne({ $or: orQuery })
      : null;

    return {
      ok: true as const,
      user: normalizeUserDoc(userDoc, decoded),
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

  let clean = value.trim().replace(/[^\d+]/g, "");

  if (!clean) return "";

  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));

  if (clean.startsWith("00")) clean = `+${clean.slice(2)}`;
  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("972")) return `+${clean}`;
  if (clean.startsWith("0") && clean.length >= 8) return `+972${clean.slice(1)}`;
  if (clean.length === 9 && clean.startsWith("5")) return `+972${clean}`;

  return clean;
}

function normalizeStatus(value: unknown): AgentStatus {
  const status = cleanStr(value).toLowerCase();

  if (status === "available") return "available";
  if (status === "dialing") return "dialing";
  if (status === "ringing") return "ringing";
  if (status === "in_call") return "in_call";
  if (status === "after_call") return "after_call";
  if (status === "break") return "break";
  if (status === "unavailable") return "unavailable";
  if (status === "offline") return "offline";

  return "unavailable";
}

function normalizeDirection(value: unknown): CallDirection {
  const direction = cleanStr(value).toLowerCase();

  if (direction === "outbound") return "outbound";
  if (direction === "inbound") return "inbound";

  return "none";
}

function statusForAdmin(status: AgentStatus) {
  if (status === "available") return "online";
  if (status === "dialing") return "dialing";
  if (status === "ringing") return "ringing";
  if (status === "in_call") return "in_call";
  if (status === "break") return "break";
  if (status === "after_call") return "busy";
  if (status === "unavailable") return "not_available";
  if (status === "offline") return "offline";

  return "unknown";
}

function isLiveCallStatus(status: AgentStatus) {
  return status === "dialing" || status === "ringing" || status === "in_call";
}

function softphoneCallStatus(status: AgentStatus) {
  if (status === "dialing") return "initiated";
  if (status === "ringing") return "ringing";
  if (status === "in_call") return "answered";

  return "completed";
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser.ok) {
      return jsonError(
        currentUser.error,
        currentUser.status,
        "details" in currentUser ? currentUser.details : undefined,
      );
    }

    await connectMongo();

    const user = currentUser.user;

    const statusDoc = await mongoose.connection
      .collection("softphonestatuses")
      .findOne({
        $or: [
          { agentId: user.id },
          { employeeId: user.id },
          { staffId: user.id },
          { userId: user.id },
          { agentEmail: user.email },
          { employeeEmail: user.email },
        ],
      });

    return NextResponse.json({
      success: true,
      status: statusDoc || null,
    });
  } catch (error) {
    return jsonError(
      "SOFTPHONE_LIVE_STATUS_GET_FAILED",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser.ok) {
      return jsonError(
        currentUser.error,
        currentUser.status,
        "details" in currentUser ? currentUser.details : undefined,
      );
    }

    await connectMongo();

    const body = await req.json().catch(() => ({}));

    const user = currentUser.user;
    const now = new Date();

    const status = normalizeStatus(body?.status);
    const adminStatus = statusForAdmin(status);
    const direction = normalizeDirection(body?.direction);

    const rawNumber = cleanStr(body?.number || body?.phone || body?.to || body?.from);
    const normalizedNumber = normalizePhoneNumber(rawNumber) || rawNumber;

    const reason = cleanStr(body?.reason);
    const reasonLabel = cleanStr(body?.reasonLabel);
    const callerNumber = normalizePhoneNumber(body?.callerNumber) || cleanStr(body?.callerNumber);

    const shiftSessionId = cleanStr(body?.shiftSessionId);
    const taskId = cleanStr(body?.taskId);
    const guestName = cleanStr(body?.guestName || body?.label);
    const localCallId = cleanStr(body?.localCallId || body?.callId);

    const statusStartedAt = body?.statusStartedAt
      ? new Date(body.statusStartedAt)
      : now;

    const activeCall = isLiveCallStatus(status);

    const currentCall = activeCall
      ? {
          active: true,
          isActive: true,
          direction: direction === "none" ? "outbound" : direction,
          status: status === "dialing" ? "dialing" : status,
          callStatus: softphoneCallStatus(status),

          startedAt: statusStartedAt,
          answeredAt: status === "in_call" ? statusStartedAt : null,
          connectedAt: status === "in_call" ? statusStartedAt : null,

          customerName: guestName,
          customerPhone: normalizedNumber,
          guestName,
          guestPhone: normalizedNumber,
          clientName: guestName,
          clientPhone: normalizedNumber,

          from: direction === "inbound" ? normalizedNumber : callerNumber,
          to: direction === "outbound" || direction === "none" ? normalizedNumber : callerNumber,

          phone: normalizedNumber,
          taskId,
          localCallId,
        }
      : null;

    const statusFilter = {
      $or: [
        { agentId: user.id },
        { employeeId: user.id },
        { staffId: user.id },
        { userId: user.id },
        { agentEmail: user.email },
        { employeeEmail: user.email },
      ],
    };

    await mongoose.connection.collection("softphonestatuses").updateOne(
      statusFilter,
      {
        $set: {
          agentId: user.id,
          employeeId: user.id,
          staffId: user.id,
          userId: user.id,

          agentName: user.name,
          employeeName: user.name,
          staffName: user.name,

          agentEmail: user.email,
          employeeEmail: user.email,
          staffEmail: user.email,

          role: user.role,

          status: adminStatus,
          softphoneStatus: adminStatus,
          availabilityStatus: adminStatus,

          rawAgentStatus: status,
          reason,
          reasonLabel,

          number: normalizedNumber,
          phone: normalizedNumber,
          direction,

          currentCall,

          shiftSessionId,
          lastSeenAt: now,
          updatedAt: now,
          statusStartedAt,
          since: statusStartedAt,

          source: "softphone-live-status",
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    if (activeCall) {
      await mongoose.connection.collection("softphonecalls").updateOne(
        {
          source: "softphone-live-current",
          agentId: user.id,
        },
        {
          $set: {
            source: "softphone-live-current",

            active: true,
            isActive: true,

            agentId: user.id,
            employeeId: user.id,
            staffId: user.id,
            userId: user.id,

            agentName: user.name,
            employeeName: user.name,
            staffName: user.name,

            agentEmail: user.email,
            employeeEmail: user.email,
            staffEmail: user.email,

            status: softphoneCallStatus(status),
            callStatus: softphoneCallStatus(status),
            liveAgentStatus: status,

            direction: direction === "none" ? "outbound" : direction,

            from: direction === "inbound" ? normalizedNumber : callerNumber,
            to: direction === "outbound" || direction === "none" ? normalizedNumber : callerNumber,

            customerName: guestName,
            customerPhone: normalizedNumber,
            guestName,
            guestPhone: normalizedNumber,
            clientName: guestName,
            clientPhone: normalizedNumber,
            phone: normalizedNumber,

            taskId,
            localCallId,

            startedAt: statusStartedAt,
            answeredAt: status === "in_call" ? statusStartedAt : null,
            connectedAt: status === "in_call" ? statusStartedAt : null,

            updatedAt: now,
            lastSeenAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );
    } else {
      await mongoose.connection.collection("softphonecalls").updateMany(
        {
          source: "softphone-live-current",
          agentId: user.id,
          active: true,
        },
        {
          $set: {
            active: false,
            isActive: false,
            status: softphoneCallStatus(status),
            callStatus: softphoneCallStatus(status),
            endedAt: now,
            updatedAt: now,
            lastSeenAt: now,
          },
        },
      );
    }

    return NextResponse.json({
      success: true,
      status: adminStatus,
      rawAgentStatus: status,
      currentCall,
      updatedAt: now,
    });
  } catch (error) {
    console.error("SOFTPHONE LIVE STATUS POST FAILED:", error);

    return jsonError(
      "SOFTPHONE_LIVE_STATUS_POST_FAILED",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}