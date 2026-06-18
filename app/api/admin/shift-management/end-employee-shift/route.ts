import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

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
  effectiveRole?: string;
  [key: string]: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

type CloseSessionsResult = {
  closedCount: number;
  createdFallback: boolean;
  sessionId: string;
  startedAt: Date | null;
  endedAt: Date;
  durationSeconds: number;
  touchedCollections: string[];
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseAdminEndEmployeeShiftCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseAdminEndEmployeeShiftCache ||
  (global.mongooseAdminEndEmployeeShiftCache = {
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
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanLower(value: unknown) {
  return cleanStr(value).toLowerCase();
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

function toObjectId(value: unknown) {
  const clean = cleanStr(value);
  if (!clean || !mongoose.Types.ObjectId.isValid(clean)) return null;
  return new mongoose.Types.ObjectId(clean);
}

function safeDate(value: unknown) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function durationSecondsBetween(start: Date | null, end: Date) {
  if (!start) return 0;

  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

function durationMinutesFromSeconds(seconds: number) {
  return Math.round((seconds / 60) * 100) / 100;
}

function durationHoursFromSeconds(seconds: number) {
  return Math.round((seconds / 3600) * 10000) / 10000;
}

function getFirstDate(doc: any, fields: string[]) {
  for (const field of fields) {
    const date = safeDate(doc?.[field]);
    if (date) return date;
  }

  return null;
}

function getStatusShiftStart(statusDoc: any) {
  return getFirstDate(statusDoc, [
    "shiftStartedAt",
    "shiftStartAt",
    "shiftStartTime",
    "startedAt",
    "startAt",
    "statusStartedAt",
    "since",
    "availabilitySince",
    "lastSeenAt",
    "updatedAt",
    "createdAt",
  ]);
}

function getSessionStart(session: any, fallback: Date | null) {
  return (
    getFirstDate(session, [
      "startedAt",
      "startAt",
      "startTime",
      "shiftStartedAt",
      "createdAt",
    ]) || fallback
  );
}

function buildSessionCloseSet(params: {
  now: Date;
  startedAt: Date | null;
  adminId: string;
  adminEmail: string;
}) {
  const durationSeconds = durationSecondsBetween(params.startedAt, params.now);

  return {
    status: "closed",
    active: false,
    isActive: false,
    endedAt: params.now,
    endAt: params.now,
    endTime: params.now,
    updatedAt: params.now,
    endedBy: "admin",
    endedByAdmin: true,
    endedByAdminId: params.adminId,
    endedByAdminEmail: params.adminEmail,
    endReason: "admin_force_end_shift",
    closeReason: "admin_force_end_shift",
    durationSeconds,
    durationMinutes: durationMinutesFromSeconds(durationSeconds),
    durationHours: durationHoursFromSeconds(durationSeconds),
  };
}

async function requireAdmin(req: NextRequest) {
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
    const role = cleanLower(decoded.effectiveRole || decoded.role);

    if (decoded.isAdmin === true || role === "admin" || role === "super_admin" || role === "owner") {
      return {
        ok: true as const,
        adminId: getUserId(decoded),
        adminEmail: cleanStr(decoded.email),
      };
    }

    await connectMongo();

    const userId = getUserId(decoded);
    const email = cleanLower(decoded.email);
    const or: Record<string, unknown>[] = [];

    const objectId = toObjectId(userId);
    if (objectId) or.push({ _id: objectId });
    if (userId) {
      or.push({ id: userId });
      or.push({ userId });
    }
    if (email) or.push({ email });

    const user = or.length
      ? await mongoose.connection.collection("users").findOne({ $or: or })
      : null;

    const userRole = cleanLower(user?.role);

    if (
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "owner" &&
      user?.isAdmin !== true
    ) {
      return {
        ok: false as const,
        status: 403,
        error: "FORBIDDEN_ADMIN_ONLY",
      };
    }

    return {
      ok: true as const,
      adminId: cleanStr(user?._id?.toString?.()) || userId,
      adminEmail: cleanStr(user?.email) || email,
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

async function collectionExists(name: string) {
  const db = mongoose.connection.db;
  if (!db) return false;

  const found = await db.listCollections({ name }).toArray();
  return found.length > 0;
}

async function getCollection(name: string, createIfMissing = false) {
  const db = mongoose.connection.db;
  if (!db) return null;

  if (!createIfMissing && !(await collectionExists(name))) return null;

  return db.collection(name);
}

function buildEmployeeOr(employeeId: string, employeeEmail: string) {
  const employeeObjectId = toObjectId(employeeId);
  const employeeOr: Record<string, unknown>[] = [];

  if (employeeId) {
    employeeOr.push({ agentId: employeeId });
    employeeOr.push({ employeeId });
    employeeOr.push({ staffId: employeeId });
    employeeOr.push({ userId: employeeId });
    employeeOr.push({ id: employeeId });
  }

  if (employeeObjectId) {
    employeeOr.push({ agentId: employeeObjectId });
    employeeOr.push({ employeeId: employeeObjectId });
    employeeOr.push({ staffId: employeeObjectId });
    employeeOr.push({ userId: employeeObjectId });
    employeeOr.push({ _id: employeeObjectId });
  }

  if (employeeEmail) {
    employeeOr.push({ agentEmail: employeeEmail });
    employeeOr.push({ employeeEmail });
    employeeOr.push({ staffEmail: employeeEmail });
    employeeOr.push({ email: employeeEmail });
  }

  return employeeOr;
}

function buildOpenSessionQuery(params: {
  employeeId: string;
  employeeEmail: string;
  shiftSessionId: string;
}) {
  const employeeObjectId = toObjectId(params.employeeId);
  const shiftObjectId = toObjectId(params.shiftSessionId);

  const identityOr: Record<string, unknown>[] = [];

  if (params.shiftSessionId) {
    identityOr.push({ id: params.shiftSessionId });
    identityOr.push({ shiftSessionId: params.shiftSessionId });
    identityOr.push({ sessionId: params.shiftSessionId });
    identityOr.push({ _id: params.shiftSessionId });
  }

  if (shiftObjectId) {
    identityOr.push({ _id: shiftObjectId });
    identityOr.push({ shiftSessionId: shiftObjectId });
    identityOr.push({ sessionId: shiftObjectId });
  }

  if (params.employeeId) {
    identityOr.push({ agentId: params.employeeId });
    identityOr.push({ employeeId: params.employeeId });
    identityOr.push({ staffId: params.employeeId });
    identityOr.push({ userId: params.employeeId });
  }

  if (employeeObjectId) {
    identityOr.push({ agentId: employeeObjectId });
    identityOr.push({ employeeId: employeeObjectId });
    identityOr.push({ staffId: employeeObjectId });
    identityOr.push({ userId: employeeObjectId });
  }

  if (params.employeeEmail) {
    identityOr.push({ agentEmail: params.employeeEmail });
    identityOr.push({ employeeEmail: params.employeeEmail });
    identityOr.push({ staffEmail: params.employeeEmail });
    identityOr.push({ email: params.employeeEmail });
  }

  if (!identityOr.length) return null;

  return {
    $and: [
      { $or: identityOr },
      {
        $or: [
          { status: "open" },
          { status: "active" },
          { status: "started" },
          { endedAt: null },
          { endedAt: { $exists: false } },
          { endAt: null },
          { endAt: { $exists: false } },
          { active: true },
          { isActive: true },
        ],
      },
    ],
  };
}

async function findSoftphoneStatus(params: {
  employeeId: string;
  employeeEmail: string;
}) {
  const employeeOr = buildEmployeeOr(params.employeeId, params.employeeEmail);

  if (!employeeOr.length) return null;

  return mongoose.connection.collection("softphonestatuses").findOne(
    { $or: employeeOr },
    {
      sort: {
        shiftStartedAt: -1,
        statusStartedAt: -1,
        updatedAt: -1,
        lastSeenAt: -1,
        createdAt: -1,
      },
    },
  );
}

async function closeOpenShiftSessions(params: {
  employeeId: string;
  employeeEmail: string;
  shiftSessionId: string;
  now: Date;
  adminId: string;
  adminEmail: string;
  fallbackStartedAt: Date | null;
}): Promise<CloseSessionsResult> {
  const names = [
    "softphoneshiftsessions",
    "SoftphoneShiftSessions",
    "employeeshiftsessions",
    "EmployeeShiftSessions",
    "softphone_shift_sessions",
    "staffshiftsessions",
    "StaffShiftSessions",
    "workhours",
    "WorkHours",
    "employeehours",
    "EmployeeHours",
  ];

  let closedCount = 0;
  let lastSessionId = params.shiftSessionId;
  let lastStartedAt: Date | null = params.fallbackStartedAt;
  let lastDurationSeconds = durationSecondsBetween(params.fallbackStartedAt, params.now);
  const touchedCollections: string[] = [];

  for (const name of names) {
    const collection = await getCollection(name);
    if (!collection) continue;

    const query = buildOpenSessionQuery({
      employeeId: params.employeeId,
      employeeEmail: params.employeeEmail,
      shiftSessionId: params.shiftSessionId,
    });

    if (!query) continue;

    const sessions = await collection
      .find(query)
      .sort({ startedAt: -1, startAt: -1, createdAt: -1 })
      .limit(20)
      .toArray();

    for (const session of sessions) {
      const startedAt = getSessionStart(session, params.fallbackStartedAt);
      const set = buildSessionCloseSet({
        now: params.now,
        startedAt,
        adminId: params.adminId,
        adminEmail: params.adminEmail,
      });

      await collection.updateOne(
        { _id: session._id },
        {
          $set: set,
          $setOnInsert: {
            createdAt: params.now,
          },
        },
      );

      closedCount += 1;
      touchedCollections.push(name);
      lastSessionId = cleanStr(session._id?.toString?.()) || cleanStr(session.id) || lastSessionId;
      lastStartedAt = startedAt;
      lastDurationSeconds = set.durationSeconds;
    }
  }

  if (closedCount > 0) {
    return {
      closedCount,
      createdFallback: false,
      sessionId: lastSessionId,
      startedAt: lastStartedAt,
      endedAt: params.now,
      durationSeconds: lastDurationSeconds,
      touchedCollections: Array.from(new Set(touchedCollections)),
    };
  }

  const fallbackCollection = await getCollection("softphoneshiftsessions", true);
  const fallbackId = new mongoose.Types.ObjectId();
  const employeeObjectId = toObjectId(params.employeeId);
  const startedAt = params.fallbackStartedAt || params.now;
  const durationSeconds = durationSecondsBetween(startedAt, params.now);

  await fallbackCollection?.insertOne({
    _id: fallbackId,
    id: fallbackId.toString(),
    shiftSessionId: fallbackId.toString(),
    sessionId: fallbackId.toString(),

    agentId: employeeObjectId || params.employeeId || undefined,
    employeeId: employeeObjectId || params.employeeId || undefined,
    staffId: employeeObjectId || params.employeeId || undefined,
    userId: employeeObjectId || params.employeeId || undefined,
    employeeIdString: params.employeeId || undefined,
    staffIdString: params.employeeId || undefined,
    userIdString: params.employeeId || undefined,

    agentEmail: params.employeeEmail || undefined,
    employeeEmail: params.employeeEmail || undefined,
    staffEmail: params.employeeEmail || undefined,
    email: params.employeeEmail || undefined,

    status: "closed",
    active: false,
    isActive: false,

    startedAt,
    startAt: startedAt,
    startTime: startedAt,
    endedAt: params.now,
    endAt: params.now,
    endTime: params.now,

    durationSeconds,
    durationMinutes: durationMinutesFromSeconds(durationSeconds),
    durationHours: durationHoursFromSeconds(durationSeconds),

    source: "admin_force_end_shift_fallback",
    createdBy: "admin",
    createdByAdmin: true,
    endedBy: "admin",
    endedByAdmin: true,
    endedByAdminId: params.adminId,
    endedByAdminEmail: params.adminEmail,
    endReason: "admin_force_end_shift",
    closeReason: "admin_force_end_shift",
    createdAt: params.now,
    updatedAt: params.now,
  });

  return {
    closedCount: 1,
    createdFallback: true,
    sessionId: fallbackId.toString(),
    startedAt,
    endedAt: params.now,
    durationSeconds,
    touchedCollections: ["softphoneshiftsessions"],
  };
}

async function markSoftphoneOffline(params: {
  employeeId: string;
  employeeEmail: string;
  now: Date;
  adminId: string;
  adminEmail: string;
  sessionResult: CloseSessionsResult;
}) {
  const employeeOr = buildEmployeeOr(params.employeeId, params.employeeEmail);

  if (!employeeOr.length) return { matchedCount: 0, modifiedCount: 0, inserted: false };

  const setPayload = {
    status: "offline",
    softphoneStatus: "offline",
    availabilityStatus: "offline",
    rawAgentStatus: "offline",
    reason: "admin_force_end_shift",
    reasonLabel: "המשמרת הסתיימה על ידי אדמין",
    currentCall: null,
    activeCallNumber: "",
    callDirection: "none",
    activeBusyReason: null,
    busyReason: "",
    shiftStarted: false,
    shiftEndedAt: params.now,
    shiftEndAt: params.now,
    shiftSessionId: "",
    currentShiftSessionId: "",
    shiftStartedAt: null,
    forceEndedAt: params.now,
    forceEndedByAdminId: params.adminId,
    forceEndedByAdminEmail: params.adminEmail,
    endedAt: params.now,
    endedBy: "admin",
    endReason: "admin_force_end_shift",
    lastClosedShiftSessionId: params.sessionResult.sessionId,
    lastClosedShiftStartedAt: params.sessionResult.startedAt,
    lastClosedShiftEndedAt: params.sessionResult.endedAt,
    lastClosedShiftDurationSeconds: params.sessionResult.durationSeconds,
    updatedAt: params.now,
    lastSeenAt: params.now,
  };

  const result = await mongoose.connection.collection("softphonestatuses").updateMany(
    { $or: employeeOr },
    {
      $set: setPayload,
    },
  );

  if (result.matchedCount > 0) {
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      inserted: false,
    };
  }

  const employeeObjectId = toObjectId(params.employeeId);

  await mongoose.connection.collection("softphonestatuses").insertOne({
    agentId: employeeObjectId || params.employeeId || undefined,
    employeeId: employeeObjectId || params.employeeId || undefined,
    staffId: employeeObjectId || params.employeeId || undefined,
    userId: employeeObjectId || params.employeeId || undefined,
    employeeIdString: params.employeeId || undefined,
    agentEmail: params.employeeEmail || undefined,
    employeeEmail: params.employeeEmail || undefined,
    staffEmail: params.employeeEmail || undefined,
    email: params.employeeEmail || undefined,
    ...setPayload,
    createdAt: params.now,
  });

  return {
    matchedCount: 0,
    modifiedCount: 0,
    inserted: true,
  };
}

async function closeActiveCalls(params: {
  employeeId: string;
  employeeEmail: string;
  now: Date;
  adminId: string;
  adminEmail: string;
}) {
  const employeeOr = buildEmployeeOr(params.employeeId, params.employeeEmail);

  if (!employeeOr.length) return { modifiedCount: 0 };

  const result = await mongoose.connection.collection("softphonecalls").updateMany(
    {
      $and: [
        { $or: employeeOr },
        {
          $or: [
            { active: true },
            { isActive: true },
            { source: "softphone-live-current" },
            { status: { $in: ["initiated", "dialing", "ringing", "answered", "in_call", "bridged"] } },
            { callStatus: { $in: ["initiated", "dialing", "ringing", "answered", "in_call", "bridged"] } },
          ],
        },
      ],
    },
    {
      $set: {
        active: false,
        isActive: false,
        status: "completed",
        callStatus: "completed",
        endedAt: params.now,
        updatedAt: params.now,
        endedBy: "admin",
        endedByAdminId: params.adminId,
        endedByAdminEmail: params.adminEmail,
        endReason: "admin_force_end_shift",
      },
    },
  );

  return { modifiedCount: result.modifiedCount };
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    if (!admin.ok) {
      return jsonError(
        admin.error,
        admin.status,
        "details" in admin ? admin.details : undefined,
      );
    }

    await connectMongo();

    const body = await req.json().catch(() => ({}));

    const employeeId = cleanStr(
      body?.employeeId || body?.agentId || body?.staffId || body?.userId,
    );
    const employeeEmail = cleanLower(body?.employeeEmail || body?.agentEmail || body?.email);
    const shiftSessionId = cleanStr(body?.shiftSessionId || body?.sessionId);

    if (!employeeId && !employeeEmail) {
      return jsonError("MISSING_EMPLOYEE_ID_OR_EMAIL", 400);
    }

    const now = new Date();

    const statusDoc = await findSoftphoneStatus({
      employeeId,
      employeeEmail,
    });

    const fallbackStartedAt =
      safeDate(body?.shiftStartedAt) ||
      safeDate(body?.startedAt) ||
      getStatusShiftStart(statusDoc) ||
      now;

    const sessionResult = await closeOpenShiftSessions({
      employeeId,
      employeeEmail,
      shiftSessionId,
      now,
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      fallbackStartedAt,
    });

    const statusResult = await markSoftphoneOffline({
      employeeId,
      employeeEmail,
      now,
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      sessionResult,
    });

    const callsResult = await closeActiveCalls({
      employeeId,
      employeeEmail,
      now,
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
    });

    return NextResponse.json({
      success: true,
      message: "EMPLOYEE_SHIFT_ENDED_BY_ADMIN",
      employeeId,
      employeeEmail,
      requestedShiftSessionId: shiftSessionId,
      endedBy: "admin",
      endedAt: now,
      session: {
        sessionId: sessionResult.sessionId,
        startedAt: sessionResult.startedAt,
        endedAt: sessionResult.endedAt,
        durationSeconds: sessionResult.durationSeconds,
        durationMinutes: durationMinutesFromSeconds(sessionResult.durationSeconds),
        durationHours: durationHoursFromSeconds(sessionResult.durationSeconds),
        closedCount: sessionResult.closedCount,
        createdFallback: sessionResult.createdFallback,
        touchedCollections: sessionResult.touchedCollections,
      },
      softphoneStatus: statusResult,
      calls: callsResult,
    });
  } catch (error) {
    console.error("ADMIN END EMPLOYEE SHIFT FAILED:", error);

    return jsonError(
      "ADMIN_END_EMPLOYEE_SHIFT_FAILED",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
