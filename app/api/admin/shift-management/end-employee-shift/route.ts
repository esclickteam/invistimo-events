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
  effectiveRole?: string;
  email?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

type SessionCloseResult = {
  collectionName: string;
  sessionId: string;
  startedAt: Date;
  endedAt: Date;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  createdFallback: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseAdminEndEmployeeShiftFinalCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseAdminEndEmployeeShiftFinalCache ||
  (global.mongooseAdminEndEmployeeShiftFinalCache = {
    conn: null,
    promise: null,
  });

const SHIFT_SESSION_COLLECTIONS = [
  "softphoneshiftsessions",
  "SoftphoneShiftSessions",
  "employeeshiftsessions",
  "EmployeeShiftSessions",
  "softphone_shift_sessions",
];

const DAILY_SUMMARY_COLLECTION = "softphoneshiftdailysummaries";

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

function toObjectId(value: unknown) {
  const clean = cleanStr(value);
  if (!clean || !mongoose.Types.ObjectId.isValid(clean)) return null;
  return new mongoose.Types.ObjectId(clean);
}

function safeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function secondsBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
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
    const role = cleanStr(decoded.effectiveRole || decoded.role).toLowerCase();

    if (
      decoded.isAdmin === true ||
      role === "admin" ||
      role === "super_admin" ||
      role === "owner"
    ) {
      return {
        ok: true as const,
        adminId: getUserId(decoded),
        adminEmail: cleanStr(decoded.email).toLowerCase(),
      };
    }

    await connectMongo();

    const userId = getUserId(decoded);
    const email = cleanStr(decoded.email).toLowerCase();
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

    const userRole = cleanStr(user?.role).toLowerCase();

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
      adminEmail: cleanStr(user?.email).toLowerCase() || email,
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

function buildEmployeeOr(employeeId: string, employeeEmail: string) {
  const employeeObjectId = toObjectId(employeeId);
  const or: Record<string, unknown>[] = [];

  if (employeeId) {
    or.push({ agentId: employeeId });
    or.push({ employeeId });
    or.push({ staffId: employeeId });
    or.push({ userId: employeeId });
    or.push({ id: employeeId });
  }

  if (employeeObjectId) {
    or.push({ agentId: employeeObjectId });
    or.push({ employeeId: employeeObjectId });
    or.push({ staffId: employeeObjectId });
    or.push({ userId: employeeObjectId });
    or.push({ _id: employeeObjectId });
  }

  if (employeeEmail) {
    or.push({ agentEmail: employeeEmail });
    or.push({ employeeEmail });
    or.push({ staffEmail: employeeEmail });
    or.push({ email: employeeEmail });
  }

  return or;
}

function getEmployeeKey(employeeId: string, employeeEmail: string) {
  return employeeId || employeeEmail;
}

function getSessionId(doc: any) {
  return cleanStr(doc?._id?.toString?.()) || cleanStr(doc?.id);
}

function getSessionStart(doc: any) {
  return (
    safeDate(doc?.startedAt) ||
    safeDate(doc?.startAt) ||
    safeDate(doc?.startsAt) ||
    safeDate(doc?.shiftStartedAt) ||
    safeDate(doc?.statusStartedAt) ||
    safeDate(doc?.since) ||
    safeDate(doc?.createdAt)
  );
}

function getStatusStart(statusDoc: any, now: Date) {
  const start =
    safeDate(statusDoc?.shiftStartedAt) ||
    safeDate(statusDoc?.currentShiftStartedAt) ||
    safeDate(statusDoc?.shift?.startedAt) ||
    safeDate(statusDoc?.statusStartedAt) ||
    safeDate(statusDoc?.since) ||
    safeDate(statusDoc?.availabilitySince) ||
    safeDate(statusDoc?.availability?.since) ||
    safeDate(statusDoc?.softphone?.updatedAt) ||
    safeDate(statusDoc?.updatedAt) ||
    safeDate(statusDoc?.lastSeenAt);

  if (!start || start.getTime() > now.getTime()) return now;
  return start;
}

function isStatusConnected(statusDoc: any) {
  const raw = cleanStr(
    statusDoc?.status ||
      statusDoc?.softphoneStatus ||
      statusDoc?.availabilityStatus ||
      statusDoc?.rawAgentStatus,
  ).toLowerCase();

  if (statusDoc?.shiftStarted === true) return true;
  if (statusDoc?.isOnline === true || statusDoc?.online === true) return true;
  if (!raw) return false;

  return ![
    "offline",
    "disconnected",
    "unknown",
    "not_in_shift",
    "מחוץ למשמרת",
    "מנותק",
  ].includes(raw);
}

async function getExistingCollection(name: string) {
  const db = mongoose.connection.db;
  if (!db) return null;

  const found = await db.listCollections({ name }).toArray();
  if (!found.length) return null;

  return mongoose.connection.collection(name);
}

async function getWritableShiftCollection() {
  for (const name of SHIFT_SESSION_COLLECTIONS) {
    const collection = await getExistingCollection(name);
    if (collection) return { name, collection };
  }

  return {
    name: SHIFT_SESSION_COLLECTIONS[0],
    collection: mongoose.connection.collection(SHIFT_SESSION_COLLECTIONS[0]),
  };
}

async function findSoftphoneStatus(employeeOr: Record<string, unknown>[]) {
  if (!employeeOr.length) return null;

  return mongoose.connection.collection("softphonestatuses").findOne(
    { $or: employeeOr },
    {
      sort: {
        updatedAt: -1,
        lastSeenAt: -1,
        createdAt: -1,
      },
    },
  );
}

async function incrementDailySummary(params: {
  employeeId: string;
  employeeEmail: string;
  startedAt: Date;
  endedAt: Date;
  totalSeconds: number;
  endedBy: "admin" | "employee";
  adminId?: string;
  adminEmail?: string;
  sessionId?: string;
}) {
  if (params.totalSeconds <= 0) return;

  const dateKey = getDayKey(params.startedAt);
  const monthKey = getMonthKey(params.startedAt);
  const employeeKey = getEmployeeKey(params.employeeId, params.employeeEmail);
  const now = new Date();

  await mongoose.connection.collection(DAILY_SUMMARY_COLLECTION).updateOne(
    {
      employeeKey,
      dateKey,
    },
    {
      $setOnInsert: {
        employeeKey,
        employeeId: params.employeeId || "",
        employeeEmail: params.employeeEmail || "",
        date: dateKey,
        dateKey,
        month: monthKey,
        monthKey,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
        lastEndedAt: params.endedAt,
        lastEndedBy: params.endedBy,
        lastAdminId: params.adminId || "",
        lastAdminEmail: params.adminEmail || "",
      },
      $inc: {
        totalSeconds: params.totalSeconds,
        totalMinutes: params.totalSeconds / 60,
        totalHours: params.totalSeconds / 3600,
        sessionsCount: 1,
      },
      $min: {
        firstStartedAt: params.startedAt,
      },
      $addToSet: {
        sessionIds: params.sessionId || "",
      },
    },
    { upsert: true },
  );
}

async function closeOpenShiftSessions(params: {
  employeeId: string;
  employeeEmail: string;
  shiftSessionId: string;
  employeeOr: Record<string, unknown>[];
  statusDoc: any;
  now: Date;
  endedBy: "admin" | "employee";
  adminId?: string;
  adminEmail?: string;
}) {
  const results: SessionCloseResult[] = [];

  for (const name of SHIFT_SESSION_COLLECTIONS) {
    const collection = await getExistingCollection(name);
    if (!collection) continue;

    const shiftObjectId = toObjectId(params.shiftSessionId);
    const sessionOr: Record<string, unknown>[] = [];

    if (params.shiftSessionId) {
      sessionOr.push({ id: params.shiftSessionId });
      sessionOr.push({ _id: params.shiftSessionId });
    }

    if (shiftObjectId) {
      sessionOr.push({ _id: shiftObjectId });
    }

    const queryParts: Record<string, unknown>[] = [];

    if (sessionOr.length) {
      queryParts.push({ $or: sessionOr });
    } else if (params.employeeOr.length) {
      queryParts.push({ $or: params.employeeOr });
    }

    queryParts.push({
      $or: [
        { status: "open" },
        { status: "active" },
        { endedAt: null },
        { endedAt: { $exists: false } },
        { active: true },
        { isActive: true },
      ],
    });

    const openSessions = await collection
      .find({ $and: queryParts })
      .sort({ startedAt: 1, startAt: 1, createdAt: 1 })
      .toArray();

    for (const session of openSessions) {
      const startedAt = getSessionStart(session) || getStatusStart(params.statusDoc, params.now);
      const totalSeconds = secondsBetween(startedAt, params.now);
      const totalMinutes = totalSeconds / 60;
      const totalHours = totalSeconds / 3600;
      const dateKey = getDayKey(startedAt);
      const monthKey = getMonthKey(startedAt);
      const sessionId = getSessionId(session);

      await collection.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "closed",
            active: false,
            isActive: false,
            endedAt: params.now,
            endAt: params.now,
            updatedAt: params.now,
            endedBy: params.endedBy,
            endedByAdminId: params.adminId || "",
            endedByAdminEmail: params.adminEmail || "",
            endReason:
              params.endedBy === "admin"
                ? "admin_force_end_shift"
                : "employee_end_shift",
            totalSeconds,
            durationSeconds: totalSeconds,
            totalMinutes,
            durationMinutes: totalMinutes,
            totalHours,
            durationHours: totalHours,
            date: session.date || dateKey,
            dateKey,
            month: session.month || monthKey,
            monthKey,
          },
          $setOnInsert: {
            createdAt: params.now,
          },
        },
      );

      await incrementDailySummary({
        employeeId: params.employeeId,
        employeeEmail: params.employeeEmail,
        startedAt,
        endedAt: params.now,
        totalSeconds,
        endedBy: params.endedBy,
        adminId: params.adminId,
        adminEmail: params.adminEmail,
        sessionId,
      });

      results.push({
        collectionName: name,
        sessionId,
        startedAt,
        endedAt: params.now,
        totalSeconds,
        totalMinutes,
        totalHours,
        createdFallback: false,
      });
    }
  }

  if (results.length) return results;

  if (!params.statusDoc || !isStatusConnected(params.statusDoc)) {
    return results;
  }

  const startedAt = getStatusStart(params.statusDoc, params.now);
  const totalSeconds = secondsBetween(startedAt, params.now);

  if (totalSeconds <= 0) return results;

  const totalMinutes = totalSeconds / 60;
  const totalHours = totalSeconds / 3600;
  const dateKey = getDayKey(startedAt);
  const monthKey = getMonthKey(startedAt);
  const writable = await getWritableShiftCollection();
  const _id = new mongoose.Types.ObjectId();

  await writable.collection.insertOne({
    _id,
    employeeId: params.employeeId || "",
    staffId: params.employeeId || "",
    userId: params.employeeId || "",
    employeeEmail: params.employeeEmail || "",
    staffEmail: params.employeeEmail || "",
    email: params.employeeEmail || "",
    date: dateKey,
    dateKey,
    month: monthKey,
    monthKey,
    startedAt,
    startAt: startedAt,
    endedAt: params.now,
    endAt: params.now,
    status: "closed",
    active: false,
    isActive: false,
    totalSeconds,
    durationSeconds: totalSeconds,
    totalMinutes,
    durationMinutes: totalMinutes,
    totalHours,
    durationHours: totalHours,
    createdFallback: true,
    source: "admin-end-employee-shift-fallback",
    endedBy: params.endedBy,
    endedByAdminId: params.adminId || "",
    endedByAdminEmail: params.adminEmail || "",
    endReason:
      params.endedBy === "admin"
        ? "admin_force_end_shift"
        : "employee_end_shift",
    createdAt: params.now,
    updatedAt: params.now,
  });

  await incrementDailySummary({
    employeeId: params.employeeId,
    employeeEmail: params.employeeEmail,
    startedAt,
    endedAt: params.now,
    totalSeconds,
    endedBy: params.endedBy,
    adminId: params.adminId,
    adminEmail: params.adminEmail,
    sessionId: _id.toString(),
  });

  results.push({
    collectionName: writable.name,
    sessionId: _id.toString(),
    startedAt,
    endedAt: params.now,
    totalSeconds,
    totalMinutes,
    totalHours,
    createdFallback: true,
  });

  return results;
}

async function updateSoftphoneStatus(params: {
  employeeOr: Record<string, unknown>[];
  employeeId: string;
  employeeEmail: string;
  now: Date;
  adminId: string;
  adminEmail: string;
}) {
  const query = params.employeeOr.length
    ? { $or: params.employeeOr }
    : { employeeEmail: params.employeeEmail || "__missing__" };

  await mongoose.connection.collection("softphonestatuses").updateOne(
    query,
    {
      $set: {
        agentId: params.employeeId || "",
        employeeId: params.employeeId || "",
        staffId: params.employeeId || "",
        userId: params.employeeId || "",
        agentEmail: params.employeeEmail || "",
        employeeEmail: params.employeeEmail || "",
        staffEmail: params.employeeEmail || "",
        email: params.employeeEmail || "",
        status: "offline",
        softphoneStatus: "offline",
        availabilityStatus: "offline",
        rawAgentStatus: "offline",
        reason: "admin_force_end_shift",
        reasonLabel: "המשמרת הסתיימה על ידי אדמין",
        currentCall: null,
        activeCallNumber: "",
        callDirection: "none",
        shiftStarted: false,
        shiftEndedAt: params.now,
        forceEndedAt: params.now,
        forceEndedByAdminId: params.adminId,
        forceEndedByAdminEmail: params.adminEmail,
        endedAt: params.now,
        endedBy: "admin",
        updatedAt: params.now,
        lastSeenAt: params.now,
        statusStartedAt: params.now,
        since: params.now,
      },
      $setOnInsert: {
        createdAt: params.now,
      },
    },
    { upsert: true },
  );
}

async function closeActiveCalls(params: {
  employeeOr: Record<string, unknown>[];
  now: Date;
  endedBy: "admin" | "employee";
}) {
  if (!params.employeeOr.length) return;

  await mongoose.connection.collection("softphonecalls").updateMany(
    {
      $and: [
        { $or: params.employeeOr },
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
        endedBy: params.endedBy,
        endReason:
          params.endedBy === "admin"
            ? "admin_force_end_shift"
            : "employee_end_shift",
      },
    },
  );
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
    const employeeEmail = cleanStr(
      body?.employeeEmail || body?.agentEmail || body?.email,
    ).toLowerCase();
    const shiftSessionId = cleanStr(body?.shiftSessionId);

    if (!employeeId && !employeeEmail) {
      return jsonError("MISSING_EMPLOYEE_ID_OR_EMAIL", 400);
    }

    const now = new Date();
    const employeeOr = buildEmployeeOr(employeeId, employeeEmail);
    const statusDoc = await findSoftphoneStatus(employeeOr);

    const closedSessions = await closeOpenShiftSessions({
      employeeId,
      employeeEmail,
      shiftSessionId,
      employeeOr,
      statusDoc,
      now,
      endedBy: "admin",
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
    });

    await updateSoftphoneStatus({
      employeeOr,
      employeeId,
      employeeEmail,
      now,
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
    });

    await closeActiveCalls({
      employeeOr,
      now,
      endedBy: "admin",
    });

    const totalSecondsAdded = closedSessions.reduce(
      (sum, item) => sum + item.totalSeconds,
      0,
    );

    return NextResponse.json({
      success: true,
      employeeId,
      employeeEmail,
      shiftSessionId,
      endedBy: "admin",
      endedAt: now,
      closedSessions,
      summary: {
        addedSeconds: totalSecondsAdded,
        addedMinutes: totalSecondsAdded / 60,
        addedHours: totalSecondsAdded / 3600,
        sessionsClosed: closedSessions.length,
      },
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
