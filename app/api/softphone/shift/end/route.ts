import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import SoftphoneWorkSession from "@/models/SoftphoneWorkSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthUser = {
  id: string;
  _id?: string;
  userId?: string;
  role?: string;
  businessId?: string;
  email?: string;
  name?: string;
};

type EndShiftBody = {
  employeeId?: string;
  employeeEmail?: string;
  source?: string;
  meta?: Record<string, unknown>;
};

type EmployeeIdentity = {
  employeeId: string;
  employeeObjectId: mongoose.Types.ObjectId;
  employeeEmail: string;
  businessId: string;
};

const WORK_TIMEZONE = process.env.WORK_TIMEZONE || "Asia/Jerusalem";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLower(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function toObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function isAdminLike(role?: string) {
  const normalized = String(role || "").toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner" ||
    normalized === "staff" ||
    normalized === "employee_admin"
  );
}

function calculateTotalSeconds(startedAt: Date, endedAt: Date) {
  const diffMs = endedAt.getTime() - startedAt.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Math.floor(diffMs / 1000);
}

function calculateTotalMinutes(startedAt: Date, endedAt: Date) {
  const seconds = calculateTotalSeconds(startedAt, endedAt);

  if (seconds <= 0) return 0;

  return Math.round(seconds / 60);
}

function safeDate(value: unknown) {
  if (!value) return null;

  const date = new Date(value as any);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getDayKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getLooseDayRange(referenceDate: Date) {
  const start = new Date(referenceDate);
  start.setUTCDate(start.getUTCDate() - 2);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(referenceDate);
  end.setUTCDate(end.getUTCDate() + 2);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

function normalizeSession(session: any) {
  if (!session) return null;

  const raw = typeof session.toObject === "function" ? session.toObject() : session;

  return {
    ...raw,
    _id: String(raw._id || ""),
    employeeId: String(raw.employeeId || raw.employeeIdString || ""),
    businessId: raw.businessId ? String(raw.businessId) : raw.businessIdString || "",
    startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : null,
    endedAt: raw.endedAt ? new Date(raw.endedAt).toISOString() : null,
  };
}

async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("authToken")?.value ||
    cookieStore.get("jwt")?.value ||
    cookieStore.get("session")?.value ||
    "";

  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as any;

    const id = String(
      decoded.id ||
        decoded._id ||
        decoded.userId ||
        decoded.sub ||
        decoded.employeeId ||
        "",
    );

    if (!id) return null;

    return {
      id,
      _id: decoded._id,
      userId: decoded.userId,
      role: decoded.role || decoded.effectiveRole,
      businessId: decoded.businessId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

function buildEmployeeOrQuery(identity: EmployeeIdentity) {
  const employeeId = identity.employeeId;
  const employeeObjectId = identity.employeeObjectId;
  const employeeEmail = identity.employeeEmail;

  const or: Record<string, unknown>[] = [
    { employeeId: employeeObjectId },
    { employeeIdString: employeeId },
    { userId: employeeObjectId },
    { userId: employeeId },
    { staffId: employeeObjectId },
    { staffId: employeeId },
    { agentId: employeeObjectId },
    { agentId: employeeId },
  ];

  if (employeeEmail) {
    or.push({ employeeEmail });
    or.push({ staffEmail: employeeEmail });
    or.push({ agentEmail: employeeEmail });
    or.push({ email: employeeEmail });
  }

  return { $or: or };
}

function buildEmployeeOpenSessionQuery(identity: EmployeeIdentity) {
  return {
    $and: [
      buildEmployeeOrQuery(identity),
      {
        $or: [
          { status: "open" },
          { endedAt: null },
          { endedAt: { $exists: false } },
          { active: true },
          { isActive: true },
        ],
      },
    ],
  };
}

async function getSoftphoneStatus(identity: EmployeeIdentity) {
  const statusDoc = await mongoose.connection
    .collection("softphonestatuses")
    .findOne(buildEmployeeOrQuery(identity), {
      sort: {
        updatedAt: -1,
        lastSeenAt: -1,
        createdAt: -1,
      },
    });

  return statusDoc;
}

function isStatusConnected(statusDoc: any) {
  if (!statusDoc) return false;

  const status = cleanLower(
    statusDoc.status ||
      statusDoc.softphoneStatus ||
      statusDoc.availabilityStatus ||
      statusDoc.rawAgentStatus,
  );

  if (!status) return false;

  if (
    status === "offline" ||
    status === "disconnected" ||
    status === "unknown" ||
    status === "not_in_shift"
  ) {
    return false;
  }

  return true;
}

function getFallbackStartedAt(statusDoc: any, now: Date) {
  const candidates = [
    statusDoc?.shiftStartedAt,
    statusDoc?.workStartedAt,
    statusDoc?.sessionStartedAt,
    statusDoc?.statusStartedAt,
    statusDoc?.availabilitySince,
    statusDoc?.since,
    statusDoc?.createdAt,
    statusDoc?.updatedAt,
    statusDoc?.lastSeenAt,
  ];

  for (const candidate of candidates) {
    const date = safeDate(candidate);

    if (date && date.getTime() < now.getTime()) {
      return date;
    }
  }

  return now;
}

async function closeOpenSession({
  openSession,
  identity,
  now,
  source,
  request,
  body,
  endedBy,
}: {
  openSession: any;
  identity: EmployeeIdentity;
  now: Date;
  source: string;
  request: NextRequest;
  body: EndShiftBody;
  endedBy: "employee" | "admin";
}) {
  const startedAt =
    safeDate(openSession.startedAt) ||
    safeDate(openSession.startAt) ||
    safeDate(openSession.createdAt) ||
    now;

  const totalSeconds = calculateTotalSeconds(startedAt, now);
  const totalMinutes = calculateTotalMinutes(startedAt, now);
  const totalHours = Number((totalMinutes / 60).toFixed(2));

  openSession.endedAt = now;
  openSession.endAt = now;
  openSession.closedAt = now;
  openSession.totalSeconds = totalSeconds;
  openSession.totalMinutes = totalMinutes;
  openSession.totalHours = totalHours;
  openSession.durationSeconds = totalSeconds;
  openSession.durationMinutes = totalMinutes;
  openSession.durationHours = totalHours;
  openSession.status = "closed";
  openSession.active = false;
  openSession.isActive = false;
  openSession.source = source || openSession.source || "softphone";
  openSession.endedBy = endedBy;
  openSession.endReason =
    endedBy === "admin" ? "admin_end_shift" : "employee_end_shift";
  openSession.employeeId = identity.employeeObjectId;
  openSession.employeeIdString = identity.employeeId;
  openSession.employeeEmail = identity.employeeEmail || openSession.employeeEmail || "";
  openSession.businessIdString = identity.businessId || openSession.businessIdString || "";
  openSession.dayKey = getDayKey(startedAt);
  openSession.workDate = getDayKey(startedAt);
  openSession.timezone = WORK_TIMEZONE;
  openSession.updatedAt = now;
  openSession.endMeta = {
    userAgent: request.headers.get("user-agent") || "",
    ip:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "",
    ...(body.meta && typeof body.meta === "object" ? body.meta : {}),
  };

  await openSession.save();

  await SoftphoneWorkSession.collection.updateOne(
    { _id: openSession._id },
    {
      $set: {
        endedAt: now,
        endAt: now,
        closedAt: now,
        totalSeconds,
        totalMinutes,
        totalHours,
        durationSeconds: totalSeconds,
        durationMinutes: totalMinutes,
        durationHours: totalHours,
        status: "closed",
        active: false,
        isActive: false,
        source: source || "softphone",
        endedBy,
        endReason: endedBy === "admin" ? "admin_end_shift" : "employee_end_shift",
        employeeId: identity.employeeObjectId,
        employeeIdString: identity.employeeId,
        employeeEmail: identity.employeeEmail,
        businessIdString: identity.businessId,
        dayKey: getDayKey(startedAt),
        workDate: getDayKey(startedAt),
        timezone: WORK_TIMEZONE,
        updatedAt: now,
        endMeta: openSession.endMeta,
      },
    },
  );

  return {
    session: openSession,
    startedAt,
    endedAt: now,
    totalSeconds,
    totalMinutes,
    totalHours,
  };
}

async function createFallbackClosedSession({
  identity,
  startedAt,
  now,
  source,
  request,
  body,
  endedBy,
}: {
  identity: EmployeeIdentity;
  startedAt: Date;
  now: Date;
  source: string;
  request: NextRequest;
  body: EndShiftBody;
  endedBy: "employee" | "admin";
}) {
  const totalSeconds = calculateTotalSeconds(startedAt, now);
  const totalMinutes = calculateTotalMinutes(startedAt, now);
  const totalHours = Number((totalMinutes / 60).toFixed(2));
  const dayKey = getDayKey(startedAt);

  const session = await SoftphoneWorkSession.create({
    employeeId: identity.employeeObjectId,
    employeeIdString: identity.employeeId,
    employeeEmail: identity.employeeEmail,
    businessIdString: identity.businessId,
    startedAt,
    startAt: startedAt,
    endedAt: now,
    endAt: now,
    closedAt: now,
    totalSeconds,
    totalMinutes,
    totalHours,
    durationSeconds: totalSeconds,
    durationMinutes: totalMinutes,
    durationHours: totalHours,
    status: "closed",
    active: false,
    isActive: false,
    source: source || "softphone",
    endedBy,
    endReason: endedBy === "admin" ? "admin_end_shift_fallback" : "employee_end_shift_fallback",
    dayKey,
    workDate: dayKey,
    timezone: WORK_TIMEZONE,
    createdAt: startedAt,
    updatedAt: now,
    endMeta: {
      fallbackCreated: true,
      userAgent: request.headers.get("user-agent") || "",
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "",
      ...(body.meta && typeof body.meta === "object" ? body.meta : {}),
    },
  });

  await SoftphoneWorkSession.collection.updateOne(
    { _id: session._id },
    {
      $set: {
        employeeId: identity.employeeObjectId,
        employeeIdString: identity.employeeId,
        employeeEmail: identity.employeeEmail,
        businessIdString: identity.businessId,
        startedAt,
        startAt: startedAt,
        endedAt: now,
        endAt: now,
        closedAt: now,
        totalSeconds,
        totalMinutes,
        totalHours,
        durationSeconds: totalSeconds,
        durationMinutes: totalMinutes,
        durationHours: totalHours,
        status: "closed",
        active: false,
        isActive: false,
        source: source || "softphone",
        endedBy,
        endReason: endedBy === "admin" ? "admin_end_shift_fallback" : "employee_end_shift_fallback",
        dayKey,
        workDate: dayKey,
        timezone: WORK_TIMEZONE,
        updatedAt: now,
      },
    },
  );

  return {
    session,
    startedAt,
    endedAt: now,
    totalSeconds,
    totalMinutes,
    totalHours,
  };
}

async function updateSoftphoneStatusAfterEnd({
  identity,
  now,
  endedBy,
}: {
  identity: EmployeeIdentity;
  now: Date;
  endedBy: "employee" | "admin";
}) {
  await mongoose.connection.collection("softphonestatuses").updateMany(
    buildEmployeeOrQuery(identity),
    {
      $set: {
        status: "offline",
        softphoneStatus: "offline",
        availabilityStatus: "offline",
        rawAgentStatus: "offline",
        reason: endedBy === "admin" ? "admin_end_shift" : "employee_end_shift",
        reasonLabel:
          endedBy === "admin"
            ? "המשמרת הסתיימה על ידי אדמין"
            : "המשמרת הסתיימה על ידי העובד",
        currentCall: null,
        shiftStarted: false,
        shiftActive: false,
        active: false,
        isActive: false,
        shiftEndedAt: now,
        endedAt: now,
        endedBy,
        updatedAt: now,
        lastSeenAt: now,
      },
      $unset: {
        shiftStartedAt: "",
        workStartedAt: "",
        sessionStartedAt: "",
      },
    },
  );
}

async function closeActiveCalls({
  identity,
  now,
  endedBy,
}: {
  identity: EmployeeIdentity;
  now: Date;
  endedBy: "employee" | "admin";
}) {
  await mongoose.connection.collection("softphonecalls").updateMany(
    {
      $and: [
        buildEmployeeOrQuery(identity),
        {
          $or: [
            { active: true },
            { isActive: true },
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
        endedAt: now,
        updatedAt: now,
        endedBy,
        endReason: endedBy === "admin" ? "admin_end_shift" : "employee_end_shift",
      },
    },
  );
}

async function recalculateDailyTotals({
  identity,
  referenceDate,
}: {
  identity: EmployeeIdentity;
  referenceDate: Date;
}) {
  const dayKey = getDayKey(referenceDate);
  const { start, end } = getLooseDayRange(referenceDate);

  const sessions = await SoftphoneWorkSession.find({
    $and: [
      buildEmployeeOrQuery(identity),
      {
        $or: [
          { startedAt: { $gte: start, $lte: end } },
          { startAt: { $gte: start, $lte: end } },
          { dayKey },
          { workDate: dayKey },
        ],
      },
    ],
  })
    .sort({ startedAt: 1, startAt: 1, createdAt: 1 })
    .lean();

  let totalSeconds = 0;
  let closedSessions = 0;
  let openSessions = 0;

  const normalizedSessions = sessions
    .map((session: any) => {
      const startedAt =
        safeDate(session.startedAt) ||
        safeDate(session.startAt) ||
        safeDate(session.createdAt);

      const endedAt =
        safeDate(session.endedAt) ||
        safeDate(session.endAt) ||
        safeDate(session.closedAt);

      if (!startedAt) return null;

      const sessionDayKey = cleanStr(session.dayKey || session.workDate) || getDayKey(startedAt);

      if (sessionDayKey !== dayKey) return null;

      const isClosed =
        Boolean(endedAt) ||
        cleanLower(session.status) === "closed" ||
        session.active === false ||
        session.isActive === false;

      if (!isClosed || !endedAt) {
        openSessions += 1;
        return {
          _id: String(session._id || ""),
          startedAt,
          endedAt: null,
          totalSeconds: 0,
          totalMinutes: 0,
          status: "open",
        };
      }

      const sessionSeconds =
        typeof session.totalSeconds === "number" && session.totalSeconds > 0
          ? session.totalSeconds
          : calculateTotalSeconds(startedAt, endedAt);

      totalSeconds += sessionSeconds;
      closedSessions += 1;

      return {
        _id: String(session._id || ""),
        startedAt,
        endedAt,
        totalSeconds: sessionSeconds,
        totalMinutes: Math.round(sessionSeconds / 60),
        status: "closed",
      };
    })
    .filter(Boolean) as Array<{
      _id: string;
      startedAt: Date;
      endedAt: Date | null;
      totalSeconds: number;
      totalMinutes: number;
      status: string;
    }>;

  const totalMinutes = Math.round(totalSeconds / 60);
  const totalHours = Number((totalMinutes / 60).toFixed(2));

  const dailyPayload = {
    employeeId: identity.employeeObjectId,
    employeeIdString: identity.employeeId,
    employeeEmail: identity.employeeEmail,
    businessIdString: identity.businessId,
    dayKey,
    workDate: dayKey,
    timezone: WORK_TIMEZONE,
    totalSeconds,
    totalMinutes,
    totalHours,
    closedSessions,
    openSessions,
    sessionsCount: normalizedSessions.length,
    sessions: normalizedSessions.map((session) => ({
      _id: session._id,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
      totalSeconds: session.totalSeconds,
      totalMinutes: session.totalMinutes,
      status: session.status,
    })),
    updatedAt: new Date(),
  };

  await mongoose.connection.collection("softphoneworkdays").updateOne(
    {
      employeeIdString: identity.employeeId,
      dayKey,
    },
    {
      $set: dailyPayload,
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  await mongoose.connection.collection("employeeworkdays").updateOne(
    {
      employeeIdString: identity.employeeId,
      dayKey,
    },
    {
      $set: dailyPayload,
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  await SoftphoneWorkSession.collection.updateMany(
    {
      $and: [
        buildEmployeeOrQuery(identity),
        {
          $or: [{ dayKey }, { workDate: dayKey }],
        },
      ],
    },
    {
      $set: {
        dayTotalSeconds: totalSeconds,
        dayTotalMinutes: totalMinutes,
        dayTotalHours: totalHours,
        daySessionsCount: normalizedSessions.length,
        dayKey,
        workDate: dayKey,
        timezone: WORK_TIMEZONE,
        dailySummaryUpdatedAt: new Date(),
      },
    },
  );

  return {
    dayKey,
    totalSeconds,
    totalMinutes,
    totalHours,
    closedSessions,
    openSessions,
    sessionsCount: normalizedSessions.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as EndShiftBody;

    const requestedEmployeeId = cleanStr(body.employeeId);
    const requestedEmployeeEmail = cleanLower(body.employeeEmail);

    const adminRequest = Boolean(requestedEmployeeId) && isAdminLike(authUser.role);

    const employeeId = adminRequest ? requestedEmployeeId : authUser.id;
    const employeeEmail = adminRequest
      ? requestedEmployeeEmail
      : cleanLower(authUser.email);

    const employeeObjectId = toObjectId(employeeId);

    if (!employeeObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EMPLOYEE_ID",
        },
        { status: 400 },
      );
    }

    const identity: EmployeeIdentity = {
      employeeId,
      employeeObjectId,
      employeeEmail,
      businessId: cleanStr(authUser.businessId),
    };

    const source = cleanStr(body.source) || "softphone";
    const endedBy: "employee" | "admin" = adminRequest ? "admin" : "employee";

    const now = new Date();

    const openSession = await SoftphoneWorkSession.findOne(
      buildEmployeeOpenSessionQuery(identity),
    ).sort({ startedAt: -1, startAt: -1, createdAt: -1 });

    let result:
      | Awaited<ReturnType<typeof closeOpenSession>>
      | Awaited<ReturnType<typeof createFallbackClosedSession>>
      | null = null;

    if (openSession) {
      result = await closeOpenSession({
        openSession,
        identity,
        now,
        source,
        request,
        body,
        endedBy,
      });
    } else {
      const statusDoc = await getSoftphoneStatus(identity);
      const connected = isStatusConnected(statusDoc);

      if (!connected) {
        await updateSoftphoneStatusAfterEnd({
          identity,
          now,
          endedBy,
        });

        const dailySummary = await recalculateDailyTotals({
          identity,
          referenceDate: now,
        });

        return NextResponse.json({
          success: true,
          message: "NO_OPEN_SHIFT_FOUND_STATUS_CLEANED",
          noOpenShift: true,
          dailySummary,
        });
      }

      const fallbackStartedAt = getFallbackStartedAt(statusDoc, now);

      result = await createFallbackClosedSession({
        identity,
        startedAt: fallbackStartedAt,
        now,
        source,
        request,
        body,
        endedBy,
      });
    }

    await updateSoftphoneStatusAfterEnd({
      identity,
      now,
      endedBy,
    });

    await closeActiveCalls({
      identity,
      now,
      endedBy,
    });

    const dailySummary = await recalculateDailyTotals({
      identity,
      referenceDate: result.startedAt || now,
    });

    return NextResponse.json({
      success: true,
      message: "SHIFT_ENDED",
      endedBy,
      session: normalizeSession(result.session),
      summary: {
        startedAt: result.startedAt.toISOString(),
        endedAt: result.endedAt.toISOString(),
        totalSeconds: result.totalSeconds,
        totalMinutes: result.totalMinutes,
        totalHours: result.totalHours,
      },
      dailySummary,
    });
  } catch (error) {
    console.error("END SOFTPHONE SHIFT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "שגיאה בסיום משמרת",
      },
      { status: 500 },
    );
  }
}