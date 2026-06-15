import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types, type SortOrder } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import InvitationGuest from "@/models/InvitationGuest";
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
  | "needs_fix"
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
  needs_fix: number;
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
    v === "yes" ||
    v === "כן"
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
    "needs_fix",
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
    "needs_fix",
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
    needs_fix: 0,
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
  if (normalized === "needs_fix") target.needs_fix += count;
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
    counts.needs_fix +
    counts.wrong_number +
    counts.completed +
    counts.cancelled
  );
}

function normalizeStatusParam(value: unknown) {
  const status = cleanStr(value).toLowerCase();

  if (!status || status === "all") return "";

  if (status === "open") {
    return ["pending", "in_progress", "open", "assigned", "active"];
  }

  if (status === "done" || status === "completed_all") {
    return [
      "confirmed",
      "declined",
      "no_answer",
      "callback",
      "undecided",
      "will_reply_message",
      "needs_fix",
      "wrong_number",
      "completed",
      "cancelled",
    ];
  }

  if (status === "needs_correction" || status === "requires_correction") {
    return "needs_fix";
  }

  if (status === "wrongnumber" || status === "wrong_number") {
    return "needs_fix";
  }

  if (isValidStatus(status)) return status;

  return "";
}

function buildRegex(value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

function serializeCallHistoryItem(item: any) {
  return {
    taskId: item?.taskId ? String(item.taskId) : "",
    workOrderId: item?.workOrderId ? String(item.workOrderId) : "",
    invitationId: item?.invitationId ? String(item.invitationId) : "",
    guestId: item?.guestId ? String(item.guestId) : "",

    employeeId: item?.employeeId ? String(item.employeeId) : "",
    employeeName: cleanStr(item?.employeeName),
    employeeEmail: cleanStr(item?.employeeEmail),

    round:
      typeof item?.round === "number"
        ? item.round
        : Number(item?.round || 0) || null,

    status: cleanStr(item?.status),
    result: cleanStr(item?.result),
    rsvpStatus: cleanStr(item?.rsvpStatus),

    callAnswered: cleanStr(item?.callAnswered),
    answeredResult: cleanStr(item?.answeredResult),
    messageFollowUpAction: cleanStr(item?.messageFollowUpAction),
    noAnswerResult: cleanStr(item?.noAnswerResult),

    arrivedCount:
      typeof item?.arrivedCount === "number" ? item.arrivedCount : null,

    note: cleanStr(item?.note),
    callDocumentation: cleanStr(item?.callDocumentation || item?.note),
    guestNote: cleanStr(item?.guestNote),

    movedToNextRound: Boolean(item?.movedToNextRound),
    nextRoundReason: cleanStr(item?.nextRoundReason),
    nextRound:
      typeof item?.nextRound === "number"
        ? item.nextRound
        : Number(item?.nextRound || 0) || null,

    nextRoundTaskId: item?.nextRoundTaskId ? String(item.nextRoundTaskId) : "",
    nextRoundWorkOrderId: item?.nextRoundWorkOrderId
      ? String(item.nextRoundWorkOrderId)
      : "",

    at: item?.at || item?.createdAt || null,
    createdAt: item?.createdAt || item?.at || null,
  };
}

function getGuestIdKey(value: unknown) {
  const id = extractIdString(value);
  return id || "";
}

function getGuestNotesFromGuest(guest: any) {
  return (
    cleanStr(guest?.guestNotes) ||
    cleanStr(guest?.guestNote) ||
    cleanStr(guest?.notes) ||
    ""
  );
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
    myNeedsFixTasks: counts.needs_fix,
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
    needsFixTasks: counts.needs_fix,
    wrongNumberTasks: counts.wrong_number,
    cancelledTasks: counts.cancelled,

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
  };
}

function serializeTask(task: any, guest?: any) {
  const status = cleanStr(task?.status) || "pending";

  const guestHistory = Array.isArray(guest?.callHistory)
    ? guest.callHistory.map(serializeCallHistoryItem)
    : [];

  const taskPreviousHistory = Array.isArray(task?.previousCallHistory)
    ? task.previousCallHistory.map(serializeCallHistoryItem)
    : [];

  const mergedHistory = guestHistory.length ? guestHistory : taskPreviousHistory;

  const guestNotes =
    cleanStr(task?.guestNotes) || getGuestNotesFromGuest(guest) || "";

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
    guestNotes,

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

    callAnswered: cleanStr(task?.callAnswered),
    answeredResult: cleanStr(task?.answeredResult),
    messageFollowUpAction: cleanStr(task?.messageFollowUpAction),
    noAnswerResult: cleanStr(task?.noAnswerResult),

    moveToNextRound: Boolean(task?.moveToNextRound),
    nextRound:
      typeof task?.nextRound === "number"
        ? Number(task.nextRound)
        : Number(task?.nextRound || 0) || null,
    nextRoundReason: cleanStr(task?.nextRoundReason),

    movedFromRound:
      typeof task?.movedFromRound === "number"
        ? Number(task.movedFromRound)
        : Number(task?.movedFromRound || 0) || null,
    movedFromTaskId: task?.movedFromTaskId ? String(task.movedFromTaskId) : "",
    movedFromWorkOrderId: task?.movedFromWorkOrderId
      ? String(task.movedFromWorkOrderId)
      : "",
    movedToNextRoundAt: task?.movedToNextRoundAt || null,
    movedToNextRoundNote: cleanStr(task?.movedToNextRoundNote),
    movedToNextRoundReason: cleanStr(task?.movedToNextRoundReason),

    previousCallHistory: mergedHistory,
    guestCallHistory: mergedHistory,

    isCompleted: isCompletedStatus(status),

    canStart: ["pending", "in_progress", "open", "assigned", "active"].includes(
      status
    ),
    canUpdate: status !== "cancelled",

    createdAt: task?.createdAt || null,
    updatedAt: task?.updatedAt || null,
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
        { guestNotes: regex },
        { note: regex },
        { status: regex },
        { result: regex },
        { callAnswered: regex },
        { answeredResult: regex },
        { messageFollowUpAction: regex },
        { noAnswerResult: regex },
        { movedToNextRoundReason: regex },
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
      _id: -1,
    };
  }

  if (sort === "oldest") {
    return {
      createdAt: 1,
      sortOrder: 1,
      _id: 1,
    };
  }

  if (sort === "name") {
    return {
      guestName: 1,
      sortOrder: 1,
      createdAt: 1,
      _id: 1,
    };
  }

  if (sort === "status") {
    return {
      status: 1,
      sortOrder: 1,
      guestName: 1,
      _id: 1,
    };
  }

  return {
    sortOrder: 1,
    createdAt: 1,
    _id: 1,
  };
}

async function getGuestsMapForTasks(tasks: any[]) {
  const ids = Array.from(
    new Set(
      tasks
        .map((task) => toObjectId(task?.guestId))
        .filter(Boolean)
        .map((id) => String(id))
    )
  );

  if (!ids.length) return new Map<string, any>();

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  const guests = await InvitationGuest.find({
    _id: {
      $in: objectIds,
    },
  })
    .select("_id notes guestNote guestNotes callHistory")
    .lean();

  const map = new Map<string, any>();

  for (const guest of guests) {
    map.set(String((guest as any)._id), guest);
  }

  return map;
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
    const guestsMap = await getGuestsMapForTasks(tasks);

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
      tasks: tasks.map((task: any) => {
        const guestKey = getGuestIdKey(task?.guestId);
        const guest = guestKey ? guestsMap.get(guestKey) : null;

        return serializeTask(task, guest);
      }),
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