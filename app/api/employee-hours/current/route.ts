import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id: string;
  _id?: string;
  userId?: string;
  role?: string;
  businessId?: string;
  email?: string;
  name?: string;
};

type WorkSession = {
  id: string;
  start: string;
  end: string;
};

type DayRow = {
  id: string;
  date: string;
  dayName: string;
  isScheduled: boolean;
  shiftLabel: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  workSessions: WorkSession[];
  sessions: WorkSession[];
  totalMinutes: number;
  note: string;
  status: string;
  manualOverride?: boolean;
};

const APPROVAL_COLLECTION = "employeehoursapprovals";

/**
 * אפשר לעדכן כאן בהמשך לפי שמות הקולקשנים האמיתיים שלך.
 * הקוד לא ייפול אם אחד הקולקשנים לא קיים.
 */
const SHIFT_COLLECTIONS_TO_TRY = [
  "employeeshifts",
  "employee_shifts",
  "staffshifts",
  "staff_shifts",
  "workshifts",
  "work_shifts",
  "workschedules",
  "work_schedules",
  "schedules",
  "shifts",
];

/*
  מקור האמת לשעות בפועל: רק סשנים שנפתחים/נסגרים
  בכפתורי התחל/סיים משמרת (SoftphoneWorkSession).
*/
const SOFTPHONE_COLLECTIONS_TO_TRY = ["softphoneworksessions"];

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      decoded.userId ||
        decoded.id ||
        decoded._id ||
        decoded.sub ||
        decoded.employeeId ||
        "",
    );

    if (!id) return null;

    return {
      id,
      _id: decoded._id,
      userId: decoded.userId,
      role: decoded.role,
      businessId: decoded.businessId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

function isAdminLike(role?: string) {
  const normalized = String(role || "").toLowerCase();
  return normalized === "admin" || normalized === "staff" || normalized === "employee_admin";
}

function getMonthParts(monthValue: string) {
  const month = cleanStr(monthValue);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date();
    return {
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
    };
  }

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw);

  return {
    monthKey: month,
    year,
    monthIndex: monthNumber - 1,
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function calculateSessionsMinutes(sessions: WorkSession[]) {
  return sessions.reduce((sum, session) => {
    return sum + minutesBetween(session.start, session.end);
  }, 0);
}

function getFirstSessionStart(sessions: WorkSession[]) {
  return sessions.find((session) => session.start)?.start || "";
}

function getLastSessionEnd(sessions: WorkSession[]) {
  const reversed = [...sessions].reverse();
  return reversed.find((session) => session.end)?.end || "";
}

function toDateKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function makeMonthDateRange(monthKey: string) {
  const { year, monthIndex } = getMonthParts(monthKey);

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  return { start, end };
}

function getDaysInMonth(monthKey: string): DayRow[] {
  const { year, monthIndex } = getMonthParts(monthKey);
  const daysCount = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysCount }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

    const dayName = new Date(year, monthIndex, day).toLocaleDateString("he-IL", {
      weekday: "long",
    });

    return {
      id: date,
      date,
      dayName,
      isScheduled: false,
      shiftLabel: "לא משובץ",
      scheduledStart: "",
      scheduledEnd: "",
      actualStart: "",
      actualEnd: "",
      workSessions: [],
      sessions: [],
      totalMinutes: 0,
      note: "",
      status: "draft",
    };
  });
}

function getValueByKeys(item: any, keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function normalizeEmployeeIdQuery(employeeId: string) {
  const objectId = toObjectId(employeeId);

  return objectId
    ? [
        { employeeId: objectId },
        { employeeId },
        { employeeIdString: employeeId },
        { userId: objectId },
        { userId: employeeId },
        { staffId: objectId },
        { staffId: employeeId },
        { agentId: objectId },
        { agentId: employeeId },
        { assignedEmployeeId: objectId },
        { assignedEmployeeId: employeeId },
        { assignedStaffId: objectId },
        { assignedStaffId: employeeId },
      ]
    : [
        { employeeId },
        { employeeIdString: employeeId },
        { userId: employeeId },
        { staffId: employeeId },
        { agentId: employeeId },
        { assignedEmployeeId: employeeId },
        { assignedStaffId: employeeId },
      ];
}

function normalizeDateKey(value: any) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return toDateKey(date);
}

function formatTime(value: any) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesBetween(startValue: any, endValue: any) {
  if (!startValue || !endValue) return 0;

  const start =
    typeof startValue === "string" && /^\d{2}:\d{2}$/.test(startValue)
      ? new Date(`1970-01-01T${startValue}:00`)
      : new Date(startValue);

  const end =
    typeof endValue === "string" && /^\d{2}:\d{2}$/.test(endValue)
      ? new Date(`1970-01-01T${endValue}:00`)
      : new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

async function listExistingCollections() {
  const database = mongoose.connection.db;
  if (!database) return new Set<string>();

  const collections = await database.listCollections().toArray();

  return new Set(collections.map((collection) => collection.name));
}

async function findUserBusinessId(employeeId: string) {
  const database = mongoose.connection.db;
  if (!database) return "";

  const objectId = toObjectId(employeeId);

  const user = await database.collection("users").findOne({
    $or: objectId ? [{ _id: objectId }, { id: employeeId }] : [{ id: employeeId }],
  });

  const rawBusinessId = user?.businessId || user?.business || "";

  if (!rawBusinessId) return "";

  if (typeof rawBusinessId === "string") return rawBusinessId;

  return String(rawBusinessId?._id || rawBusinessId?.id || rawBusinessId || "");
}

async function loadApproval(employeeId: string, monthKey: string) {
  const database = mongoose.connection.db;
  if (!database) return null;

  const objectId = toObjectId(employeeId);

  return database.collection(APPROVAL_COLLECTION).findOne({
    month: monthKey,
    $or: objectId
      ? [
          { employeeId: objectId },
          { employeeId },
          { employeeIdString: employeeId },
        ]
      : [{ employeeId }, { employeeIdString: employeeId }],
  });
}

async function loadShifts(employeeId: string, monthKey: string) {
  const database = mongoose.connection.db;
  if (!database) return [];

  const existingCollections = await listExistingCollections();
  const { start, end } = makeMonthDateRange(monthKey);
  const employeeConditions = normalizeEmployeeIdQuery(employeeId);

  const allItems: any[] = [];

  for (const collectionName of SHIFT_COLLECTIONS_TO_TRY) {
    if (!existingCollections.has(collectionName)) continue;

    const collection = database.collection(collectionName);

    const results = await collection
      .find({
        $and: [
          { $or: employeeConditions },
          {
            $or: [
              { date: { $gte: start, $lt: end } },
              { shiftDate: { $gte: start, $lt: end } },
              { startAt: { $gte: start, $lt: end } },
              { startTime: { $gte: start, $lt: end } },
              { scheduledStart: { $gte: start, $lt: end } },
              { date: { $gte: monthKey, $lte: `${monthKey}-31` } },
            ],
          },
        ],
      })
      .limit(1000)
      .toArray();

    allItems.push(...results);
  }

  return allItems;
}

async function loadSoftphoneSessions(employeeId: string, monthKey: string) {
  const database = mongoose.connection.db;
  if (!database) return [];

  const existingCollections = await listExistingCollections();
  const { start, end } = makeMonthDateRange(monthKey);
  const employeeConditions = normalizeEmployeeIdQuery(employeeId);

  const allItems: any[] = [];

  for (const collectionName of SOFTPHONE_COLLECTIONS_TO_TRY) {
    if (!existingCollections.has(collectionName)) continue;

    const collection = database.collection(collectionName);

    const results = await collection
      .find({
        $and: [
          { $or: employeeConditions },
          {
            $or: [
              // SoftphoneWorkSession החדש
              { month: monthKey },
              { date: { $gte: `${monthKey}-01`, $lte: `${monthKey}-31` } },

              // תמיכה בקולקשנים ישנים/אחרים עם Date
              { date: { $gte: start, $lt: end } },
              { startedAt: { $gte: start, $lt: end } },
              { startAt: { $gte: start, $lt: end } },
              { clockInAt: { $gte: start, $lt: end } },
              { loginAt: { $gte: start, $lt: end } },
              { createdAt: { $gte: start, $lt: end } },
            ],
          },
        ],
      })
      .limit(3000)
      .toArray();

    allItems.push(...results);
  }

  return allItems;
}

function mergeShiftsIntoRows(rows: DayRow[], shifts: any[]) {
  const rowsMap = new Map(rows.map((row) => [row.date, row]));

  for (const shift of shifts) {
    const dateKey =
      normalizeDateKey(
        getValueByKeys(shift, [
          "date",
          "shiftDate",
          "startAt",
          "startTime",
          "scheduledStart",
          "createdAt",
        ]),
      ) || "";

    if (!dateKey || !rowsMap.has(dateKey)) continue;

    const row = rowsMap.get(dateKey)!;

    const scheduledStart = getValueByKeys(shift, [
      "scheduledStart",
      "shiftStart",
      "startAt",
      "startTime",
      "from",
      "start",
    ]);

    const scheduledEnd = getValueByKeys(shift, [
      "scheduledEnd",
      "shiftEnd",
      "endAt",
      "endTime",
      "to",
      "end",
    ]);

    row.isScheduled = true;
    row.shiftLabel =
      cleanStr(
        getValueByKeys(shift, [
          "shiftLabel",
          "shiftTitle",
          "shiftName",
          "title",
          "name",
          "role",
        ]),
      ) || "משמרת";

    row.scheduledStart = formatTime(scheduledStart);
    row.scheduledEnd = formatTime(scheduledEnd);
  }

  return Array.from(rowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeSoftphoneIntoRows(rows: DayRow[], sessions: any[]) {
  const rowsMap = new Map(rows.map((row) => [row.date, row]));

  const grouped = new Map<
    string,
    {
      workSessions: WorkSession[];
      totalMinutes: number;
    }
  >();

  for (const session of sessions) {
    const startValue = getValueByKeys(session, [
      // SoftphoneWorkSession החדש
      "startedAt",

      // תמיכה בשמות קיימים/עתידיים
      "actualStart",
      "softphoneStart",
      "clockIn",
      "clockInAt",
      "loginAt",
      "startAt",
      "createdAt",
    ]);

    const sessionStatus = String(session?.status || "").toLowerCase();
    const hasClosedStatus = sessionStatus === "closed" || sessionStatus === "ended";
    const hasRealEndedAt =
      session?.endedAt != null && session?.endedAt !== "";
    const isOpenSession = !hasClosedStatus && !hasRealEndedAt;

    /*
      משמרת פתוחה: לא משתמשים ב-updatedAt כשעת סיום.
      רק endedAt אמיתי נסגר ע״י סיום משמרת / התנתקות.
    */
    const endValue = isOpenSession
      ? null
      : getValueByKeys(session, [
          // SoftphoneWorkSession החדש
          "endedAt",

          // תמיכה בשמות קיימים/עתידיים
          "actualEnd",
          "softphoneEnd",
          "clockOut",
          "clockOutAt",
          "logoutAt",
          "endAt",
          "updatedAt",
        ]);

    const dateKey =
      normalizeDateKey(
        getValueByKeys(session, [
          "date",
          "workDate",
          "day",
          "startedAt",
          "clockInAt",
          "createdAt",
        ]),
      ) || normalizeDateKey(startValue);

    if (!dateKey || !rowsMap.has(dateKey)) continue;

    const start = formatTime(startValue);
    const end = formatTime(endValue);

    if (!start && !end) continue;

    const current =
      grouped.get(dateKey) ||
      {
        workSessions: [],
        totalMinutes: 0,
      };

    /*
      כל מקטע נרשם לחוד — לא מאחדים להתחלה/סיום אחת ליום.
    */
    current.workSessions.push({
      id: cleanStr(session?._id || session?.id) || makeSessionId(),
      start,
      end,
    });

    if (start && end) {
      current.totalMinutes += minutesBetween(start, end);
    } else if (start && isOpenSession) {
      // משמרת פתוחה — זמן רץ עד עכשיו ביום הנוכחי
      current.totalMinutes += minutesBetween(startValue, new Date());
    }

    grouped.set(dateKey, current);
  }

  for (const [dateKey, data] of grouped.entries()) {
    const row = rowsMap.get(dateKey);
    if (!row) continue;

    const sortedSessions = data.workSessions.sort((a, b) =>
      String(a.start || "99:99").localeCompare(String(b.start || "99:99")),
    );

    row.workSessions = sortedSessions;
    row.sessions = sortedSessions;
    row.actualStart = getFirstSessionStart(sortedSessions);
    row.actualEnd = getLastSessionEnd(sortedSessions);
    row.totalMinutes =
      data.totalMinutes > 0
        ? Math.round(data.totalMinutes)
        : calculateSessionsMinutes(sortedSessions);
  }

  return Array.from(rowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeApprovalWorkSessions(row: any): WorkSession[] {
  const rawSessions: any[] = Array.isArray(row?.workSessions)
    ? row.workSessions
    : Array.isArray(row?.sessions)
      ? row.sessions
      : [];

  const sessions = rawSessions
    .map((session: any) => {
      const start =
        cleanStr(session?.start) ||
        cleanStr(session?.actualStart) ||
        formatTime(session?.startedAt) ||
        formatTime(session?.startAt);

      const end =
        cleanStr(session?.end) ||
        cleanStr(session?.actualEnd) ||
        formatTime(session?.endedAt) ||
        formatTime(session?.endAt);

      return {
        id: cleanStr(session?.id || session?._id) || makeSessionId(),
        start,
        end,
      } satisfies WorkSession;
    })
    .filter((session) => session.start || session.end);

  if (sessions.length > 0) return sessions;

  const actualStart = cleanStr(row?.actualStart);
  const actualEnd = cleanStr(row?.actualEnd);

  if (actualStart || actualEnd) {
    return [
      {
        id: makeSessionId(),
        start: actualStart,
        end: actualEnd,
      },
    ];
  }

  return [];
}

function hasManualOverride(saved: any) {
  /*
    רק עריכה מפורשת של אדמין קובעת.
    רשומות ישנות עם הערות בלבד (בלי manualOverride) לא דורסות את הסופטפון.
  */
  return saved?.manualOverride === true;
}

function mergeApprovalIntoRows(rows: DayRow[], approval: any) {
  if (!approval?.rows || !Array.isArray(approval.rows)) {
    return rows.map((row) => ({
      ...row,
      status: approval?.status || row.status,
      manualOverride: false,
    }));
  }

  const savedMap = new Map<string, any>();

  for (const savedRow of approval.rows) {
    const date = cleanStr(savedRow?.date);
    if (date) savedMap.set(date, savedRow);
  }

  return rows.map((row) => {
    const saved = savedMap.get(row.date);
    const noteFromSaved =
      saved && "note" in saved ? cleanStr(saved.note) : row.note;

    if (!saved) {
      return {
        ...row,
        status: approval.status || row.status,
        manualOverride: false,
      };
    }

    const shouldOverride = hasManualOverride(saved);

    if (!shouldOverride) {
      return {
        ...row,
        note: noteFromSaved,
        status: approval.status || row.status,
        manualOverride: false,
      };
    }

    const workSessions = normalizeApprovalWorkSessions(saved);
    const totalMinutesFromSessions = calculateSessionsMinutes(workSessions);
    const savedMinutes = Number(saved.totalMinutes);

    const totalMinutes =
      Number.isFinite(savedMinutes) && savedMinutes >= 0
        ? Math.round(savedMinutes)
        : totalMinutesFromSessions;

    return {
      ...row,
      workSessions,
      sessions: workSessions,
      actualStart: getFirstSessionStart(workSessions),
      actualEnd: getLastSessionEnd(workSessions),
      note: noteFromSaved,
      totalMinutes,
      status: approval.status || row.status,
      manualOverride: true,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const requestedEmployeeId = cleanStr(url.searchParams.get("employeeId"));
    const monthParam = cleanStr(url.searchParams.get("month"));

    const { monthKey } = getMonthParts(monthParam);

    const employeeId =
      requestedEmployeeId && isAdminLike(authUser.role)
        ? requestedEmployeeId
        : authUser.id;

    const businessId = authUser.businessId || (await findUserBusinessId(employeeId));

    let rows = getDaysInMonth(monthKey);

    const [approval, shifts, softphoneSessions] = await Promise.all([
      loadApproval(employeeId, monthKey),
      loadShifts(employeeId, monthKey),
      loadSoftphoneSessions(employeeId, monthKey),
    ]);

    rows = mergeShiftsIntoRows(rows, shifts);
    rows = mergeSoftphoneIntoRows(rows, softphoneSessions);
    rows = mergeApprovalIntoRows(rows, approval);

    const totalMinutes = rows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0);
    const scheduledDays = rows.filter((row) => row.isScheduled).length;
    const workedDays = rows.filter(
      (row) => row.actualStart || row.actualEnd || row.totalMinutes > 0,
    ).length;

    return NextResponse.json({
      success: true,
      employeeId,
      businessId,
      month: monthKey,
      rows,
      summary: {
        month: monthKey,
        totalMinutes,
        scheduledDays,
        workedDays,
        status: approval?.status || "draft",
        submittedAt: approval?.submittedAt || null,
        approvedAt: approval?.approvedAt || null,
        rejectedAt: approval?.rejectedAt || null,
        rejectionReason: approval?.rejectionReason || "",
      },
    });
  } catch (error) {
    console.error("GET EMPLOYEE HOURS CURRENT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בטעינת שעות העובד/ת",
      },
      { status: 500 },
    );
  }
}