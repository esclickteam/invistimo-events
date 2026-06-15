import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallTask from "@/models/CallTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Config
============================================================ */

const TIMEZONE = "Asia/Jerusalem";

const OPEN_TASK_STATUSES = [
  "pending",
  "open",
  "assigned",
  "in_progress",
  "active",
];

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

type EmployeeInfo = {
  id: string;
  objectId: Types.ObjectId | null;
  name: string;
  email: string;
  role: string;
};

type Summary = {
  total: number;
  pending: number;
  in_progress: number;
  confirmed: number;
  declined: number;
  no_answer: number;
  callback: number;
  wrong_number: number;
  completed: number;
  cancelled: number;
  completedLogical: number;
  remaining: number;
};

/* ============================================================
   Helpers
============================================================ */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function normalize(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function extractIdString(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value instanceof mongoose.Types.ObjectId) {
    return String(value);
  }

  if (typeof value === "object") {
    const anyValue = value as any;

    if (anyValue._id) return extractIdString(anyValue._id);
    if (anyValue.id) return extractIdString(anyValue.id);
    if (anyValue.$oid) return extractIdString(anyValue.$oid);
  }

  return String(value || "");
}

function toObjectId(value: unknown) {
  const id = extractIdString(value);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function safeNumber(value: unknown) {
  const n = Number(value || 0);

  return Number.isFinite(n) ? n : 0;
}

/* ============================================================
   Timezone helpers - Asia/Jerusalem
============================================================ */

function getTimeZoneParts(date: Date, timeZone = TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getDateKeyInIsrael(date = new Date()) {
  const parts = getTimeZoneParts(date, TIMEZONE);

  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function getTimeZoneOffsetMs(date: Date, timeZone = TIMEZONE) {
  const parts = getTimeZoneParts(date, timeZone);

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  );

  return asUtc - date.getTime();
}

function makeDateInTimeZone(
  dateKey: string,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  );

  const offset = getTimeZoneOffsetMs(utcGuess, TIMEZONE);

  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
      offset
  );
}

function normalizeDateKey(value: unknown) {
  const raw = cleanStr(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (raw) {
    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return getDateKeyInIsrael(date);
    }
  }

  return getDateKeyInIsrael(new Date());
}

function startOfDateKey(dateKey: string) {
  return makeDateInTimeZone(dateKey, 0, 0, 0, 0);
}

function endOfDateKey(dateKey: string) {
  return makeDateInTimeZone(dateKey, 23, 59, 59, 999);
}

/* ============================================================
   Auth
============================================================ */

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
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

async function requireEmployee() {
  const auth = await getAuthUser();

  if (!auth?.id && !auth?.email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "לא מחובר",
        },
        { status: 401 }
      ),
    };
  }

  const authObjectId = toObjectId(auth.id);
  const email = cleanStr(auth.email).toLowerCase();

  const userConditions: any[] = [];

  if (authObjectId) {
    userConditions.push({ _id: authObjectId });
  }

  if (auth.id) {
    userConditions.push({ id: auth.id });
    userConditions.push({ userId: auth.id });
  }

  if (email) {
    userConditions.push({ email });
  }

  const currentUser = await User.findOne({
    $or: userConditions,
  })
    .select("_id id name email role phone")
    .lean();

  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "משתמש לא נמצא",
        },
        { status: 404 }
      ),
    };
  }

  const employeeId = extractIdString((currentUser as any)._id || auth.id);
  const employeeObjectId = toObjectId(employeeId);

  if (!employeeId && !email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "מזהה עובד לא תקין",
        },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true as const,
    employee: {
      id: employeeId,
      objectId: employeeObjectId,
      name:
        cleanStr((currentUser as any).name) ||
        cleanStr((currentUser as any).email) ||
        "עובד",
      email: cleanStr((currentUser as any).email).toLowerCase(),
      role: cleanStr((currentUser as any).role),
    } as EmployeeInfo,
  };
}

/* ============================================================
   Task status logic
============================================================ */

function getTaskResultKey(task: any) {
  const result = normalize(
    task?.result ||
      task?.callResult ||
      task?.outcome ||
      task?.callStatus ||
      ""
  );

  const status = normalize(task?.status);

  const raw = result || status;

  if (
    [
      "confirmed",
      "coming",
      "attending",
      "yes",
      "approved",
      "אישר",
      "אישרה",
      "מאשר",
      "מאשרת",
      "מגיע",
      "מגיעה",
    ].includes(raw)
  ) {
    return "confirmed";
  }

  if (
    [
      "declined",
      "not_coming",
      "no",
      "not_attending",
      "לא מגיע",
      "לא מגיעה",
      "סירב",
      "סירבה",
    ].includes(raw)
  ) {
    return "declined";
  }

  if (
    [
      "no_answer",
      "not_answered",
      "busy",
      "voicemail",
      "no_response",
      "אין מענה",
      "לא ענה",
      "לא ענתה",
      "עסוק",
      "תא קולי",
    ].includes(raw)
  ) {
    return "no_answer";
  }

  if (
    [
      "callback",
      "call_later",
      "later",
      "לחזור",
      "לחזור אליו",
      "לחזור אליה",
    ].includes(raw)
  ) {
    return "callback";
  }

  if (
    [
      "wrong_number",
      "bad_number",
      "invalid_number",
      "מספר שגוי",
      "טלפון שגוי",
    ].includes(raw)
  ) {
    return "wrong_number";
  }

  if (
    ["cancelled", "canceled", "cancel", "בוטל", "בוטלה"].includes(raw)
  ) {
    return "cancelled";
  }

  if (["in_progress", "active", "started", "בטיפול"].includes(status)) {
    return "in_progress";
  }

  if (
    ["done", "completed", "closed", "finished", "טופל", "הושלם"].includes(
      status
    )
  ) {
    return "completed";
  }

  return "pending";
}

function isTaskRemaining(task: any) {
  const status = normalize(task?.status);
  const result = normalize(task?.result || task?.callResult || task?.outcome);

  if (result) {
    return false;
  }

  return OPEN_TASK_STATUSES.includes(status || "pending");
}

function matchesStatusFilter(task: any, statusFilter: string) {
  const filter = normalize(statusFilter);

  if (!filter || filter === "all") return true;

  const resultKey = getTaskResultKey(task);

  if (filter === "open") {
    return isTaskRemaining(task);
  }

  if (filter === "done") {
    return !isTaskRemaining(task);
  }

  return resultKey === filter || normalize(task?.status) === filter;
}

function emptySummary(): Summary {
  return {
    total: 0,
    pending: 0,
    in_progress: 0,
    confirmed: 0,
    declined: 0,
    no_answer: 0,
    callback: 0,
    wrong_number: 0,
    completed: 0,
    cancelled: 0,
    completedLogical: 0,
    remaining: 0,
  };
}

function countTasks(tasks: any[]) {
  const summary = emptySummary();

  for (const task of tasks) {
    summary.total += 1;

    const key = getTaskResultKey(task);

    if (key === "pending") summary.pending += 1;
    else if (key === "in_progress") summary.in_progress += 1;
    else if (key === "confirmed") summary.confirmed += 1;
    else if (key === "declined") summary.declined += 1;
    else if (key === "no_answer") summary.no_answer += 1;
    else if (key === "callback") summary.callback += 1;
    else if (key === "wrong_number") summary.wrong_number += 1;
    else if (key === "cancelled") summary.cancelled += 1;
    else if (key === "completed") summary.completed += 1;

    if (isTaskRemaining(task)) {
      summary.remaining += 1;
    } else {
      summary.completedLogical += 1;
    }
  }

  return summary;
}

/* ============================================================
   Query helpers
============================================================ */

function buildEmployeeTaskMatch(employee: EmployeeInfo) {
  const idValues: any[] = [];

  if (employee.objectId) {
    idValues.push(employee.objectId);
    idValues.push(String(employee.objectId));
  }

  if (employee.id) {
    idValues.push(employee.id);
  }

  const uniqueValues: any[] = [];

  for (const value of idValues) {
    const id = extractIdString(value);
    if (!id) continue;

    const objectId = toObjectId(id);

    if (objectId) uniqueValues.push(objectId);
    uniqueValues.push(id);
  }

  const uniqueIdValues = Array.from(
    new Map(uniqueValues.map((value) => [String(value), value])).values()
  );

  const or: any[] = [];

  if (uniqueIdValues.length) {
    or.push({ employeeId: { $in: uniqueIdValues } });
    or.push({ assignedEmployeeId: { $in: uniqueIdValues } });
    or.push({ assignedToEmployeeId: { $in: uniqueIdValues } });
  }

  if (employee.email) {
    or.push({ employeeEmail: employee.email });
    or.push({ assignedEmployeeEmail: employee.email });
    or.push({ assignedToEmployeeEmail: employee.email });
  }

  if (!or.length) {
    return { _id: null };
  }

  return { $or: or };
}

function buildDateMatch(dateKey: string) {
  const start = startOfDateKey(dateKey);
  const end = endOfDateKey(dateKey);

  return {
    $or: [
      { workDate: { $gte: start, $lte: end } },
      { scheduledFor: { $gte: start, $lte: end } },
      { configuredRoundAt: { $gte: start, $lte: end } },
      { assignedAt: { $gte: start, $lte: end } },

      { workDate: dateKey },
      { scheduledFor: dateKey },
      { configuredRoundAt: dateKey },
    ],
  };
}

function getSortDate(value: any) {
  const raw =
    value?.configuredRoundAt ||
    value?.scheduledFor ||
    value?.workDate ||
    value?.createdAt ||
    null;

  const date = raw ? new Date(raw) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

/* ============================================================
   Serialization
============================================================ */

function serializeWorkOrderFromGroup(input: {
  workOrder: any | null;
  tasks: any[];
}) {
  const { workOrder, tasks } = input;

  const firstTask = tasks[0] || {};
  const summary = countTasks(tasks);

  const id =
    extractIdString(workOrder?._id) ||
    extractIdString(firstTask?.workOrderId) ||
    `${extractIdString(firstTask?.invitationId)}-${safeNumber(
      firstTask?.round || firstTask?.callRound || 1
    )}`;

  const total = summary.total;
  const completedLogical = summary.completedLogical;
  const remaining = summary.remaining;

  const progress =
    total > 0 ? Math.round((completedLogical / total) * 100) : 0;

  const status =
    remaining <= 0 && total > 0
      ? "completed"
      : summary.in_progress > 0
        ? "in_progress"
        : cleanStr(workOrder?.status) || "open";

  return {
    id,
    _id: id,

    type: cleanStr(workOrder?.type || firstTask?.type) || "rsvp_calls",
    status,

    title:
      cleanStr(workOrder?.title) ||
      cleanStr(firstTask?.title) ||
      "הוראת עבודה לשיחות",

    description:
      cleanStr(workOrder?.description) ||
      cleanStr(firstTask?.description) ||
      "",

    invitationId: extractIdString(
      workOrder?.invitationId || firstTask?.invitationId
    ),

    clientName: cleanStr(workOrder?.clientName || firstTask?.clientName),
    clientEmail: cleanStr(workOrder?.clientEmail || firstTask?.clientEmail),

    eventName: cleanStr(workOrder?.eventName || firstTask?.eventName),
    eventDate: workOrder?.eventDate || firstTask?.eventDate || null,

    round: safeNumber(
      workOrder?.round || firstTask?.round || firstTask?.callRound || 1
    ),
    sourceAudience: cleanStr(
      workOrder?.sourceAudience || firstTask?.sourceAudience
    ),

    workDate: workOrder?.workDate || firstTask?.workDate || null,
    configuredRoundAt:
      workOrder?.configuredRoundAt || firstTask?.configuredRoundAt || null,
    autoOpenAt: workOrder?.autoOpenAt || firstTask?.autoOpenAt || null,
    timezone: cleanStr(workOrder?.timezone || firstTask?.timezone) || TIMEZONE,

    myTasksTotal: total,
    myTasksCompleted: completedLogical,
    myTasksRemaining: remaining,
    myProgressPercent: progress,

    myPendingTasks: summary.pending,
    myInProgressTasks: summary.in_progress,
    myConfirmedTasks: summary.confirmed,
    myDeclinedTasks: summary.declined,
    myNoAnswerTasks: summary.no_answer,
    myCallbackTasks: summary.callback,
    myWrongNumberTasks: summary.wrong_number,
    myCancelledTasks: summary.cancelled,

    createdAt: workOrder?.createdAt || firstTask?.createdAt || null,
    updatedAt: workOrder?.updatedAt || firstTask?.updatedAt || null,
  };
}

/* ============================================================
   GET - הוראות העבודה של העובד המחובר
============================================================ */

export async function GET(req: NextRequest) {
  try {
    await db();

    const employeeResult = await requireEmployee();

    if (!employeeResult.ok) {
      return employeeResult.response;
    }

    const employee = employeeResult.employee;
    const url = new URL(req.url);

    const showAllDates =
      url.searchParams.get("all") === "1" ||
      url.searchParams.get("all") === "true" ||
      url.searchParams.get("date") === "all";

    const dateKey = normalizeDateKey(url.searchParams.get("date"));

    const statusFilter = cleanStr(url.searchParams.get("status") || "all");

    const limit = Math.min(
      500,
      Math.max(1, Number(url.searchParams.get("limit") || 200))
    );

    const employeeMatch = buildEmployeeTaskMatch(employee);

    const andConditions: any[] = [employeeMatch];

    if (!showAllDates) {
      andConditions.push(buildDateMatch(dateKey));
    }

    const mongoQuery =
      andConditions.length === 1
        ? andConditions[0]
        : {
            $and: andConditions,
          };

    const allTasksForEmployee = await CallTask.collection
      .find(mongoQuery)
      .sort({
        workDate: -1,
        configuredRoundAt: -1,
        createdAt: -1,
        sortOrder: 1,
      })
      .limit(50000)
      .toArray();

    const filteredTasks = allTasksForEmployee.filter((task) =>
      matchesStatusFilter(task, statusFilter)
    );

    const summary = countTasks(filteredTasks);

    const workOrderIdsMap = new Map<string, Types.ObjectId>();

    for (const task of filteredTasks) {
      const workOrderObjectId = toObjectId(task?.workOrderId);

      if (workOrderObjectId) {
        workOrderIdsMap.set(String(workOrderObjectId), workOrderObjectId);
      }
    }

    const workOrderIds = Array.from(workOrderIdsMap.values());

    const workOrdersRaw = workOrderIds.length
      ? await CallWorkOrder.collection
          .find({
            _id: {
              $in: workOrderIds,
            },
          })
          .toArray()
      : [];

    const workOrderById = new Map<string, any>();

    for (const order of workOrdersRaw) {
      workOrderById.set(String(order._id), order);
    }

    const tasksByWorkOrder = new Map<string, any[]>();

    for (const task of filteredTasks) {
      const workOrderId = extractIdString(task?.workOrderId);

      const groupKey =
        workOrderId ||
        `${extractIdString(task?.invitationId)}:${safeNumber(
          task?.round || task?.callRound || 1
        )}:${extractIdString(task?.workDate)}`;

      if (!tasksByWorkOrder.has(groupKey)) {
        tasksByWorkOrder.set(groupKey, []);
      }

      tasksByWorkOrder.get(groupKey)!.push(task);
    }

    const serializedWorkOrders = Array.from(tasksByWorkOrder.entries())
      .map(([workOrderId, tasks]) => {
        return serializeWorkOrderFromGroup({
          workOrder: workOrderById.get(workOrderId) || null,
          tasks,
        });
      })
      .sort((a, b) => getSortDate(b) - getSortDate(a))
      .slice(0, limit);

    const activeWorkOrders = serializedWorkOrders.filter(
      (order) => safeNumber(order.myTasksRemaining) > 0
    );

    const completedWorkOrders = serializedWorkOrders.filter(
      (order) =>
        safeNumber(order.myTasksTotal) > 0 &&
        safeNumber(order.myTasksRemaining) <= 0
    );

    return NextResponse.json({
      success: true,

      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },

      count: serializedWorkOrders.length,
      summary,

      workOrders: serializedWorkOrders,
      activeWorkOrders,
      completedWorkOrders,

      debug: {
        dateKey,
        showAllDates,
        statusFilter,
        employeeId: employee.id,
        employeeEmail: employee.email,
        rawTasksFound: allTasksForEmployee.length,
        filteredTasksFound: filteredTasks.length,
        workOrdersFound: serializedWorkOrders.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/employee/work-orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בטעינת הוראות העבודה",
      },
      { status: 500 }
    );
  }
}