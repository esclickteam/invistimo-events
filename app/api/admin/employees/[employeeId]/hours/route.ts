import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id: string;
  role?: string;
  businessId?: string;
  email?: string;
  name?: string;
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
  totalMinutes: number;
  note: string;
  status: string;
  manualOverride?: boolean;
};

const APPROVAL_COLLECTION = "employeehoursapprovals";

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
  "employeeschedules",
  "employee_schedules",
  "employeeShiftSchedules",
  "employeeshiftschedules",
];

const SOFTPHONE_COLLECTIONS_TO_TRY = [
  "softphoneworksessions",
  "softphone_work_sessions",
  "softphonesessions",
  "softphone_sessions",
  "softphoneworklogs",
  "softphone_work_logs",
  "softphonelogs",
  "softphone_logs",
  "staffsoftphonesessions",
  "staff_softphone_sessions",
  "employeehours",
  "employee_hours",
  "employeehourlogs",
  "employee_hour_logs",
  "worklogs",
  "work_logs",
  "shiftlogs",
  "shift_logs",
  "telnyxsessions",
  "telnyx_sessions",
  "calllogs",
  "call_logs",
];

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
      decoded.id || decoded._id || decoded.userId || decoded.sub || ""
    );

    if (!id) return null;

    return {
      id,
      role: decoded.role,
      businessId: decoded.businessId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

function isAdmin(role?: string) {
  const normalized = String(role || "").toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner"
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getMonthParts(monthValue: string) {
  const month = cleanStr(monthValue);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date();

    return {
      monthKey: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
    };
  }

  const [yearRaw, monthRaw] = month.split("-");

  return {
    monthKey: month,
    year: Number(yearRaw),
    monthIndex: Number(monthRaw) - 1,
  };
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
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
      totalMinutes: 0,
      note: "",
      status: "draft",
      manualOverride: false,
    };
  });
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

  return date.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getByPath(item: any, path: string) {
  return path.split(".").reduce((obj, key) => {
    if (!obj || typeof obj !== "object") return undefined;
    return obj[key];
  }, item);
}

function getValueByKeys(item: any, keys: string[]) {
  for (const key of keys) {
    const value = key.includes(".") ? getByPath(item, key) : item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
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

function normalizeEmployeeIdQuery(employeeId: string) {
  const objectId = toObjectId(employeeId);

  const stringConditions = [
    { employeeId },
    { employeeIdString: employeeId },
    { userId: employeeId },
    { staffId: employeeId },
    { workerId: employeeId },
    { assignedEmployeeId: employeeId },
    { assignedStaffId: employeeId },
    { createdBy: employeeId },

    { "employee._id": employeeId },
    { "employee.id": employeeId },
    { "user._id": employeeId },
    { "user.id": employeeId },
    { "staff._id": employeeId },
    { "staff.id": employeeId },
  ];

  if (!objectId) return stringConditions;

  return [
    { employeeId: objectId },
    { userId: objectId },
    { staffId: objectId },
    { workerId: objectId },
    { assignedEmployeeId: objectId },
    { assignedStaffId: objectId },
    { createdBy: objectId },

    { "employee._id": objectId },
    { "user._id": objectId },
    { "staff._id": objectId },

    ...stringConditions,
  ];
}

function dateQuery(monthKey: string) {
  const { start, end } = makeMonthDateRange(monthKey);

  return [
    { date: { $gte: start, $lt: end } },
    { workDate: { $gte: start, $lt: end } },
    { day: { $gte: start, $lt: end } },
    { shiftDate: { $gte: start, $lt: end } },

    { startedAt: { $gte: start, $lt: end } },
    { endedAt: { $gte: start, $lt: end } },

    { startAt: { $gte: start, $lt: end } },
    { endAt: { $gte: start, $lt: end } },

    { startTime: { $gte: start, $lt: end } },
    { endTime: { $gte: start, $lt: end } },

    { clockInAt: { $gte: start, $lt: end } },
    { clockOutAt: { $gte: start, $lt: end } },

    { loginAt: { $gte: start, $lt: end } },
    { logoutAt: { $gte: start, $lt: end } },

    { scheduledStart: { $gte: start, $lt: end } },
    { scheduledEnd: { $gte: start, $lt: end } },

    { createdAt: { $gte: start, $lt: end } },
    { updatedAt: { $gte: start, $lt: end } },

    { date: { $gte: monthKey, $lte: `${monthKey}-31` } },
    { workDate: { $gte: monthKey, $lte: `${monthKey}-31` } },
    { day: { $gte: monthKey, $lte: `${monthKey}-31` } },
    { shiftDate: { $gte: monthKey, $lte: `${monthKey}-31` } },
  ];
}

async function findUserBusinessId(employeeId: string) {
  const database = mongoose.connection.db;
  if (!database) return "";

  const objectId = toObjectId(employeeId);

  const user = await database.collection("users").findOne({
    $or: objectId
      ? [{ _id: objectId }, { id: employeeId }]
      : [{ id: employeeId }],
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

async function loadFromCollections(
  collectionNames: string[],
  employeeId: string,
  monthKey: string,
  limit: number
) {
  const database = mongoose.connection.db;
  if (!database) return { items: [], collections: [] as string[] };

  const existingCollections = await listExistingCollections();
  const employeeConditions = normalizeEmployeeIdQuery(employeeId);

  const allItems: any[] = [];
  const collections: string[] = [];

  for (const collectionName of collectionNames) {
    if (!existingCollections.has(collectionName)) continue;

    collections.push(collectionName);

    const results = await database
      .collection(collectionName)
      .find({
        $and: [
          { $or: employeeConditions },
          { $or: dateQuery(monthKey) },
        ],
      })
      .limit(limit)
      .toArray();

    allItems.push(
      ...results.map((item) => ({
        ...item,
        __collectionName: collectionName,
      }))
    );
  }

  return { items: allItems, collections };
}

async function loadShifts(employeeId: string, monthKey: string) {
  return loadFromCollections(
    SHIFT_COLLECTIONS_TO_TRY,
    employeeId,
    monthKey,
    2000
  );
}

async function loadSoftphoneSessions(employeeId: string, monthKey: string) {
  return loadFromCollections(
    SOFTPHONE_COLLECTIONS_TO_TRY,
    employeeId,
    monthKey,
    5000
  );
}

function mergeShiftsIntoRows(rows: DayRow[], shifts: any[]) {
  const rowsMap = new Map(rows.map((row) => [row.date, row]));

  for (const shift of shifts) {
    const dateKey = normalizeDateKey(
      getValueByKeys(shift, [
        "date",
        "workDate",
        "day",
        "shiftDate",
        "scheduledDate",
        "scheduledStart",
        "startAt",
        "startTime",
        "createdAt",
      ])
    );

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
        ])
      ) || "משובץ";

    row.scheduledStart = formatTime(scheduledStart);
    row.scheduledEnd = formatTime(scheduledEnd);
  }

  return Array.from(rowsMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

function mergeSoftphoneIntoRows(rows: DayRow[], sessions: any[]) {
  const rowsMap = new Map(rows.map((row) => [row.date, row]));

  const grouped = new Map<
    string,
    {
      starts: Date[];
      ends: Date[];
      totalMinutes: number;
      notes: string[];
    }
  >();

  for (const session of sessions) {
    const startValue = getValueByKeys(session, [
      "startedAt",
      "actualStart",
      "softphoneStart",
      "clockIn",
      "clockInAt",
      "loginAt",
      "startAt",
      "startTime",
      "shiftStartAt",
      "createdAt",
    ]);

    const endValue = getValueByKeys(session, [
      "endedAt",
      "actualEnd",
      "softphoneEnd",
      "clockOut",
      "clockOutAt",
      "logoutAt",
      "endAt",
      "endTime",
      "shiftEndAt",
      "updatedAt",
    ]);

    const dateKey =
      normalizeDateKey(
        getValueByKeys(session, [
          "date",
          "workDate",
          "day",
          "shiftDate",
          "startedAt",
          "clockInAt",
          "startAt",
          "createdAt",
        ])
      ) || normalizeDateKey(startValue || endValue);

    if (!dateKey || !rowsMap.has(dateKey)) continue;

    const current =
      grouped.get(dateKey) ||
      {
        starts: [],
        ends: [],
        totalMinutes: 0,
        notes: [],
      };

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (startValue && !Number.isNaN(startDate.getTime())) {
      current.starts.push(startDate);
    }

    if (endValue && !Number.isNaN(endDate.getTime())) {
      current.ends.push(endDate);
    }

    const directMinutes = Number(
      getValueByKeys(session, [
        "totalMinutes",
        "workMinutes",
        "minutes",
        "durationMinutes",
        "duration",
      ])
    );

    current.totalMinutes +=
      Number.isFinite(directMinutes) && directMinutes > 0
        ? Math.round(directMinutes)
        : minutesBetween(startValue, endValue);

    const note = cleanStr(
      getValueByKeys(session, [
        "note",
        "notes",
        "employeeNote",
        "employeeNotes",
        "adminNote",
        "comment",
        "comments",
        "shiftNote",
      ])
    );

    if (note) current.notes.push(note);

    grouped.set(dateKey, current);
  }

  for (const [dateKey, data] of grouped.entries()) {
    const row = rowsMap.get(dateKey);
    if (!row) continue;

    const sortedStarts = data.starts.sort((a, b) => a.getTime() - b.getTime());
    const sortedEnds = data.ends.sort((a, b) => b.getTime() - a.getTime());

    row.actualStart = sortedStarts[0] ? formatTime(sortedStarts[0]) : "";
    row.actualEnd = sortedEnds[0] ? formatTime(sortedEnds[0]) : "";
    row.totalMinutes = Math.round(data.totalMinutes);

    if (data.notes.length > 0) {
      row.note = data.notes.join(" | ");
    }
  }

  return Array.from(rowsMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

function hasManualOverride(saved: any, sourceRow: DayRow) {
  if (saved?.manualOverride === true) return true;

  const savedStart = cleanStr(saved?.actualStart);
  const savedEnd = cleanStr(saved?.actualEnd);
  const savedNote = cleanStr(saved?.note);
  const savedMinutes = Number(saved?.totalMinutes);

  if (savedStart && savedStart !== sourceRow.actualStart) return true;
  if (savedEnd && savedEnd !== sourceRow.actualEnd) return true;
  if (savedNote && savedNote !== sourceRow.note) return true;

  if (
    Number.isFinite(savedMinutes) &&
    savedMinutes > 0 &&
    savedMinutes !== Number(sourceRow.totalMinutes || 0)
  ) {
    return true;
  }

  return false;
}

function mergeApprovalIntoRows(rows: DayRow[], approval: any) {
  if (!approval?.rows || !Array.isArray(approval.rows)) {
    return rows.map((row) => ({
      ...row,
      status: approval?.status || row.status,
    }));
  }

  const savedMap = new Map<string, any>();

  for (const savedRow of approval.rows) {
    const date = cleanStr(savedRow?.date);
    if (date) savedMap.set(date, savedRow);
  }

  return rows.map((row) => {
    const saved = savedMap.get(row.date);

    if (!saved) {
      return {
        ...row,
        status: approval.status || row.status,
      };
    }

    const shouldOverride = hasManualOverride(saved, row);

    if (!shouldOverride) {
      return {
        ...row,
        status: approval.status || row.status,
      };
    }

    const actualStart =
      "actualStart" in saved ? cleanStr(saved.actualStart) : row.actualStart;

    const actualEnd =
      "actualEnd" in saved ? cleanStr(saved.actualEnd) : row.actualEnd;

    const note = "note" in saved ? cleanStr(saved.note) : row.note;
    const savedMinutes = Number(saved.totalMinutes);

    return {
      ...row,
      actualStart,
      actualEnd,
      note,
      totalMinutes:
        Number.isFinite(savedMinutes) && savedMinutes >= 0
          ? Math.round(savedMinutes)
          : minutesBetween(actualStart, actualEnd),
      status: approval.status || row.status,
      manualOverride: true,
    };
  });
}

function sanitizeRows(rawRows: any[], sourceRows: DayRow[]): DayRow[] {
  const sourceMap = new Map(sourceRows.map((row) => [row.date, row]));

  return rawRows
    .filter((row) => cleanStr(row?.date))
    .map((row) => {
      const date = cleanStr(row.date);
      const source = sourceMap.get(date);

      const actualStart = cleanStr(row.actualStart);
      const actualEnd = cleanStr(row.actualEnd);
      const note = cleanStr(row.note);

      const directMinutes = Number(row.totalMinutes);
      const totalMinutes =
        Number.isFinite(directMinutes) && directMinutes >= 0
          ? Math.round(directMinutes)
          : minutesBetween(actualStart, actualEnd);

      const next: DayRow = {
        id: cleanStr(row.id || date),
        date,
        dayName: cleanStr(row.dayName),
        isScheduled: Boolean(row.isScheduled),
        shiftLabel: cleanStr(row.shiftLabel) || "לא משובץ",
        scheduledStart: cleanStr(row.scheduledStart),
        scheduledEnd: cleanStr(row.scheduledEnd),
        actualStart,
        actualEnd,
        totalMinutes,
        note,
        status: cleanStr(row.status) || "draft",
        manualOverride: false,
      };

      if (source) {
        next.manualOverride =
          actualStart !== cleanStr(source.actualStart) ||
          actualEnd !== cleanStr(source.actualEnd) ||
          note !== cleanStr(source.note) ||
          totalMinutes !== Number(source.totalMinutes || 0);
      } else {
        next.manualOverride =
          Boolean(actualStart || actualEnd || note) || totalMinutes > 0;
      }

      return next;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildSummary(
  rows: DayRow[],
  monthKey: string,
  status: string,
  approval: any = {}
) {
  const totalMinutes = rows.reduce(
    (sum, row) => sum + Number(row.totalMinutes || 0),
    0
  );

  const scheduledDays = rows.filter((row) => row.isScheduled).length;

  const workedDays = rows.filter(
    (row) => row.actualStart || row.actualEnd || row.totalMinutes > 0
  ).length;

  return {
    month: monthKey,
    totalMinutes,
    scheduledDays,
    workedDays,
    status,
    submittedAt: approval?.submittedAt || null,
    approvedAt: approval?.approvedAt || null,
    rejectedAt: approval?.rejectedAt || null,
    rejectionReason: cleanStr(approval?.rejectionReason),
  };
}

async function buildSyncedHours(employeeId: string, monthKey: string) {
  let rows = getDaysInMonth(monthKey);

  const [shiftsResult, sessionsResult] = await Promise.all([
    loadShifts(employeeId, monthKey),
    loadSoftphoneSessions(employeeId, monthKey),
  ]);

  rows = mergeShiftsIntoRows(rows, shiftsResult.items);
  rows = mergeSoftphoneIntoRows(rows, sessionsResult.items);

  return {
    rows,
    debug: {
      shiftCollectionsChecked: shiftsResult.collections,
      softphoneCollectionsChecked: sessionsResult.collections,
      shiftsFound: shiftsResult.items.length,
      sessionsFound: sessionsResult.items.length,
    },
  };
}

async function buildHours(employeeId: string, monthKey: string) {
  const [approval, synced] = await Promise.all([
    loadApproval(employeeId, monthKey),
    buildSyncedHours(employeeId, monthKey),
  ]);

  const rows = mergeApprovalIntoRows(synced.rows, approval);
  const summary = buildSummary(rows, monthKey, approval?.status || "draft", approval);

  return {
    rows,
    summary,
    approval,
    debug: {
      ...synced.debug,
      approvalFound: Boolean(approval),
      manualRows: rows.filter((row) => row.manualOverride).length,
    },
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id || !isAdmin(authUser.role)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const employeeId = decodeURIComponent(cleanStr(params.employeeId));

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עובד" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const { monthKey } = getMonthParts(cleanStr(url.searchParams.get("month")));

    const businessId = await findUserBusinessId(employeeId);
    const { rows, summary, debug } = await buildHours(employeeId, monthKey);

    return NextResponse.json({
      success: true,
      employeeId,
      businessId,
      month: monthKey,
      rows,
      summary,
      debug,
    });
  } catch (error) {
    console.error("GET ADMIN EMPLOYEE HOURS FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בטעינת שעות עובד",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id || !isAdmin(authUser.role)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const employeeId = decodeURIComponent(cleanStr(params.employeeId));

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עובד" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const { monthKey } = getMonthParts(cleanStr(body.month));
    const action = cleanStr(body.action);

    const database = mongoose.connection.db;

    if (!database) {
      return NextResponse.json(
        { success: false, error: "DATABASE_NOT_READY" },
        { status: 500 }
      );
    }

    const synced = await buildSyncedHours(employeeId, monthKey);
    const rows = sanitizeRows(Array.isArray(body.rows) ? body.rows : [], synced.rows);

    const collection = database.collection(APPROVAL_COLLECTION);
    const objectId = toObjectId(employeeId);

    const existing = await loadApproval(employeeId, monthKey);

    const now = new Date();

    let status = existing?.status || "submitted";

    if (action === "approve") status = "approved";
    if (action === "reject") status = "rejected";
    if (action === "save") status = existing?.status || "submitted";

    const totalMinutes = rows.reduce(
      (sum, row) => sum + Number(row.totalMinutes || 0),
      0
    );

    const setDoc: any = {
      employeeId,
      employeeIdString: employeeId,
      month: monthKey,
      rows,
      status,
      totalMinutes,
      workedDays: rows.filter(
        (row) => row.actualStart || row.actualEnd || row.totalMinutes > 0
      ).length,
      scheduledDays: rows.filter((row) => row.isScheduled).length,
      hourlyRate: Number(body.hourlyRate || 0),
      totalSalary: Number(body.totalSalary || 0),
      updatedAt: now,
      updatedBy: authUser.id,
    };

    if (objectId) {
      setDoc.employeeObjectId = objectId;
    }

    if (!existing?.submittedAt) {
      setDoc.submittedAt = now;
    }

    if (status === "approved") {
      setDoc.approvedAt = now;
      setDoc.approvedBy = authUser.id;
      setDoc.rejectedAt = null;
      setDoc.rejectionReason = "";
    }

    if (status === "rejected") {
      setDoc.rejectedAt = now;
      setDoc.rejectedBy = authUser.id;
      setDoc.rejectionReason = cleanStr(body.rejectionReason);
      setDoc.approvedAt = null;
    }

    if (existing?._id) {
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: setDoc,
        }
      );
    } else {
      await collection.insertOne({
        ...setDoc,
        createdAt: now,
      });
    }

    const approval = await loadApproval(employeeId, monthKey);
    const finalRows = mergeApprovalIntoRows(synced.rows, approval);
    const summary = buildSummary(finalRows, monthKey, status, approval);

    return NextResponse.json({
      success: true,
      employeeId,
      month: monthKey,
      rows: finalRows,
      summary,
      debug: {
        ...synced.debug,
        approvalFound: Boolean(approval),
        manualRows: finalRows.filter((row) => row.manualOverride).length,
      },
    });
  } catch (error) {
    console.error("PATCH ADMIN EMPLOYEE HOURS FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בשמירת שעות עובד",
      },
      { status: 500 }
    );
  }
}