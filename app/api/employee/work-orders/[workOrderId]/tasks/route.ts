import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types, type SortOrder } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallTask from "@/models/CallTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    workOrderId: string;
  }>;
};

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

type TaskStatus =
  | "pending"
  | "in_progress"
  | "confirmed"
  | "declined"
  | "no_answer"
  | "callback"
  | "undecided"
  | "will_reply_message"
  | "wrong_number"
  | "completed"
  | "cancelled";

type TaskStatusCount = {
  total: number;
  pending: number;
  in_progress: number;
  confirmed: number;
  declined: number;
  no_answer: number;
  callback: number;
  undecided: number;
  will_reply_message: number;
  wrong_number: number;
  completed: number;
  cancelled: number;
};

/* ============================================================
   Helpers
============================================================ */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  return new mongoose.Types.ObjectId(id);
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function toBool(value: unknown) {
  const v = cleanStr(value).toLowerCase();

  return (
    value === true ||
    value === 1 ||
    v === "true" ||
    v === "1" ||
    v === "yes"
  );
}

function isValidStatus(value: string): value is TaskStatus {
  return [
    "pending",
    "in_progress",
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "undecided",
    "will_reply_message",
    "wrong_number",
    "completed",
    "cancelled",
  ].includes(value);
}

function isCompletedStatus(status: string) {
  return [
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "undecided",
    "will_reply_message",
    "wrong_number",
    "completed",
    "cancelled",
  ].includes(status);
}

function emptyCounts(): TaskStatusCount {
  return {
    total: 0,
    pending: 0,
    in_progress: 0,
    confirmed: 0,
    declined: 0,
    no_answer: 0,
    callback: 0,
    undecided: 0,
    will_reply_message: 0,
    wrong_number: 0,
    completed: 0,
    cancelled: 0,
  };
}

function addCount(target: TaskStatusCount, status: string, count: number) {
  const normalized = cleanStr(status) || "pending";

  target.total += count;

  if (normalized === "pending") target.pending += count;
  if (normalized === "in_progress") target.in_progress += count;
  if (normalized === "confirmed") target.confirmed += count;
  if (normalized === "declined") target.declined += count;
  if (normalized === "no_answer") target.no_answer += count;
  if (normalized === "callback") target.callback += count;
  if (normalized === "undecided") target.undecided += count;
  if (normalized === "will_reply_message") target.will_reply_message += count;
  if (normalized === "wrong_number") target.wrong_number += count;
  if (normalized === "completed") target.completed += count;
  if (normalized === "cancelled") target.cancelled += count;
}

function getCompletedFromCounts(counts: TaskStatusCount) {
  return (
    counts.confirmed +
    counts.declined +
    counts.no_answer +
    counts.callback +
    counts.undecided +
    counts.will_reply_message +
    counts.wrong_number +
    counts.completed +
    counts.cancelled
  );
}

function normalizeStatusParam(value: unknown) {
  const status = cleanStr(value).toLowerCase();

  if (!status || status === "all") return "";

  if (status === "open") {
    return ["pending", "in_progress"];
  }

  if (status === "done" || status === "completed_all") {
    return [
      "confirmed",
      "declined",
      "no_answer",
      "callback",
      "undecided",
      "will_reply_message",
      "wrong_number",
      "completed",
      "cancelled",
    ];
  }

  if (isValidStatus(status)) return status;

  return "";
}

function buildRegex(value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

function serializeWorkOrder(order: any, counts: TaskStatusCount) {
  const completed = getCompletedFromCounts(counts);
  const remaining = Math.max(0, counts.total - completed);

  return {
    id: String(order?._id || ""),
    _id: String(order?._id || ""),

    type: order?.type || "rsvp_calls",
    status: order?.status || "open",

    title: cleanStr(order?.title),
    description: cleanStr(order?.description),

    invitationId: String(order?.invitationId || ""),

    clientName: cleanStr(order?.clientName),
    clientEmail: cleanStr(order?.clientEmail),

    eventName: cleanStr(order?.eventName),
    eventDate: order?.eventDate || null,

    round: Number(order?.round || 1),
    sourceAudience: cleanStr(order?.sourceAudience),

    workDate: order?.workDate || null,
    configuredRoundAt: order?.configuredRoundAt || null,
    autoOpenAt: order?.autoOpenAt || null,
    timezone: cleanStr(order?.timezone) || "Asia/Jerusalem",

    myTasksTotal: counts.total,
    myTasksCompleted: completed,
    myTasksRemaining: remaining,
    myProgressPercent:
      counts.total > 0 ? Math.round((completed / counts.total) * 100) : 0,

    myPendingTasks: counts.pending,
    myInProgressTasks: counts.in_progress,
    myConfirmedTasks: counts.confirmed,
    myDeclinedTasks: counts.declined,
    myNoAnswerTasks: counts.no_answer,
    myCallbackTasks: counts.callback,
    myUndecidedTasks: counts.undecided,
    myWillReplyMessageTasks: counts.will_reply_message,
    myWrongNumberTasks: counts.wrong_number,
    myCancelledTasks: counts.cancelled,

    totalTasks: counts.total,
    completedTasks: completed,
    remainingTasks: remaining,
    progressPercent:
      counts.total > 0 ? Math.round((completed / counts.total) * 100) : 0,

    pendingTasks: counts.pending,
    inProgressTasks: counts.in_progress,
    confirmedTasks: counts.confirmed,
    declinedTasks: counts.declined,
    noAnswerTasks: counts.no_answer,
    callbackTasks: counts.callback,
    undecidedTasks: counts.undecided,
    willReplyMessageTasks: counts.will_reply_message,
    wrongNumberTasks: counts.wrong_number,
    cancelledTasks: counts.cancelled,

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
  };
}

function serializeTask(task: any) {
  const status = cleanStr(task?.status) || "pending";

  return {
    id: String(task?._id || ""),
    _id: String(task?._id || ""),

    type: task?.type || "rsvp_call",

    workOrderId: String(task?.workOrderId || ""),
    invitationId: String(task?.invitationId || ""),
    guestId: String(task?.guestId || ""),

    clientName: cleanStr(task?.clientName),
    clientEmail: cleanStr(task?.clientEmail),
    eventName: cleanStr(task?.eventName),
    eventDate: task?.eventDate || null,

    guestName: cleanStr(task?.guestName),
    guestPhone: cleanStr(task?.guestPhone),
    guestEmail: cleanStr(task?.guestEmail),
    guestGroup: cleanStr(task?.guestGroup),
    guestSide: cleanStr(task?.guestSide),
    guestTable: cleanStr(task?.guestTable),
    guestNotes: cleanStr(task?.guestNotes),

    round: Number(task?.round || 1),
    sourceAudience: cleanStr(task?.sourceAudience),

    workDate: task?.workDate || null,

    status,
    result: task?.result || null,

    priority: Number(task?.priority || 0),
    sortOrder: Number(task?.sortOrder || 0),

    assignedAt: task?.assignedAt || null,
    startedAt: task?.startedAt || null,
    completedAt: task?.completedAt || null,
    lastAttemptAt: task?.lastAttemptAt || null,

    attemptsCount: Number(task?.attemptsCount || 0),

    rsvpStatus: cleanStr(task?.rsvpStatus),
    attendingCount:
      typeof task?.attendingCount === "number" ? task.attendingCount : null,

    note: cleanStr(task?.note),

    isCompleted: isCompletedStatus(status),

    canStart: ["pending", "in_progress"].includes(status),
    canUpdate: status !== "cancelled",
  };
}

/* ============================================================
   Auth
============================================================ */

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

  if (!auth?.id) {
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

  const userObjectId = toObjectId(auth.id);

  const userConditions: any[] = [];

  if (userObjectId) {
    userConditions.push({ _id: userObjectId });
  }

  userConditions.push({ id: auth.id });

  if (auth.email) {
    userConditions.push({ email: auth.email.toLowerCase() });
  }

  const currentUser = await User.findOne({
    $or: userConditions,
  })
    .select("_id id name email role")
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

  const employeeObjectId = toObjectId((currentUser as any)._id);

  if (!employeeObjectId) {
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
    auth,
    currentUser,
    employeeId: employeeObjectId,
    employeeIdString: String(employeeObjectId),
  };
}

/* ============================================================
   Data
============================================================ */

function buildEmployeeAssignmentMatch(employeeId: Types.ObjectId) {
  return {
    $or: [
      { assignedToEmployeeId: employeeId },
      { assignedEmployeeId: employeeId },
      { employeeId },
    ],
  };
}

async function getCountsForEmployeeWorkOrder(input: {
  workOrderId: Types.ObjectId;
  employeeId: Types.ObjectId;
}) {
  const rows = await CallTask.aggregate([
    {
      $match: {
        workOrderId: input.workOrderId,
        ...buildEmployeeAssignmentMatch(input.employeeId),
      },
    },
    {
      $group: {
        _id: "$status",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const counts = emptyCounts();

  for (const row of rows) {
    const status = String(row?._id || "pending");
    const count = Number(row?.count || 0);

    addCount(counts, status, count);
  }

  return counts;
}

function buildTaskQuery(input: {
  searchParams: URLSearchParams;
  workOrderId: Types.ObjectId;
  employeeId: Types.ObjectId;
}) {
  const { searchParams, workOrderId, employeeId } = input;

  const query: any = {
    workOrderId,
    ...buildEmployeeAssignmentMatch(employeeId),
  };

  const statusParam = normalizeStatusParam(searchParams.get("status"));

  if (Array.isArray(statusParam)) {
    query.status = {
      $in: statusParam,
    };
  } else if (statusParam) {
    query.status = statusParam;
  }

  const q = cleanStr(searchParams.get("q") || searchParams.get("search"));

  if (q) {
    const regex = buildRegex(q);

    query.$and = query.$and || [];

    query.$and.push({
      $or: [
        { guestName: regex },
        { guestPhone: regex },
        { guestEmail: regex },
        { guestGroup: regex },
        { guestSide: regex },
        { guestTable: regex },
        { note: regex },
      ],
    });
  }

  return query;
}

function getSort(searchParams: URLSearchParams): Record<string, SortOrder> {
  const sort = cleanStr(searchParams.get("sort")).toLowerCase();

  if (sort === "newest") {
    return {
      createdAt: -1,
      sortOrder: 1,
    };
  }

  if (sort === "oldest") {
    return {
      createdAt: 1,
      sortOrder: 1,
    };
  }

  if (sort === "name") {
    return {
      guestName: 1,
      sortOrder: 1,
    };
  }

  if (sort === "status") {
    return {
      status: 1,
      sortOrder: 1,
    };
  }

  return {
    sortOrder: 1,
    createdAt: 1,
  };
}

/* ============================================================
   GET - רשימת השיחות של העובד בתוך הוראת עבודה
============================================================ */

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const employee = await requireEmployee();

    if (!employee.ok) {
      return employee.response;
    }

    const params = await context.params;
    const workOrderId = cleanStr(params.workOrderId);
    const workOrderObjectId = toObjectId(workOrderId);

    if (!workOrderObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה הוראת עבודה לא תקין",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    const allMode =
      toBool(searchParams.get("all")) ||
      toBool(searchParams.get("noPagination")) ||
      toBool(searchParams.get("full"));

    const requestedPage = Math.max(1, Number(searchParams.get("page") || 1));
    const requestedLimit = Math.max(
      1,
      Number(searchParams.get("limit") || 100)
    );

    const page = allMode ? 1 : requestedPage;

    const limit = allMode
      ? Math.min(5000, Math.max(1, requestedLimit))
      : Math.min(300, Math.max(1, requestedLimit));

    const skip = allMode ? 0 : (page - 1) * limit;

    const counts = await getCountsForEmployeeWorkOrder({
      workOrderId: workOrderObjectId,
      employeeId: employee.employeeId,
    });

    if (counts.total <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "הוראת העבודה לא נמצאה או לא משויכת לעובד המחובר",
        },
        { status: 404 }
      );
    }

    const workOrder = await CallWorkOrder.findOne({
      _id: workOrderObjectId,
      type: "rsvp_calls",
    }).lean();

    if (!workOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "הוראת העבודה לא נמצאה",
        },
        { status: 404 }
      );
    }

    const taskQuery = buildTaskQuery({
      searchParams,
      workOrderId: workOrderObjectId,
      employeeId: employee.employeeId,
    });

    const totalFiltered = await CallTask.countDocuments(taskQuery);

    const tasksQuery = CallTask.find(taskQuery).sort(getSort(searchParams));

    if (!allMode) {
      tasksQuery.skip(skip).limit(limit);
    } else {
      tasksQuery.limit(limit);
    }

    const tasks = await tasksQuery.lean();

    const completed = getCompletedFromCounts(counts);
    const remaining = Math.max(0, counts.total - completed);

    return NextResponse.json({
      success: true,

      employee: {
        id: employee.employeeIdString,
        name: cleanStr((employee.currentUser as any)?.name),
        email: cleanStr((employee.currentUser as any)?.email),
        role: cleanStr((employee.currentUser as any)?.role),
      },

      workOrder: serializeWorkOrder(workOrder, counts),

      summary: {
        ...counts,
        completedLogical: completed,
        remaining,
        progressPercent:
          counts.total > 0 ? Math.round((completed / counts.total) * 100) : 0,
      },

      pagination: {
        page,
        limit,
        totalFiltered,
        totalPages: allMode ? 1 : Math.max(1, Math.ceil(totalFiltered / limit)),
        hasNextPage: allMode ? false : page * limit < totalFiltered,
        hasPrevPage: allMode ? false : page > 1,
      },

      allMode,
      count: tasks.length,
      tasks: tasks.map(serializeTask),
    });
  } catch (error: any) {
    console.error(
      "GET /api/employee/work-orders/[workOrderId]/tasks failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בטעינת רשימת השיחות",
      },
      { status: 500 }
    );
  }
}