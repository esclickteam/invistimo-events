import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
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
    taskId: string;
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
  | "wrong_number"
  | "completed"
  | "cancelled";

type TaskResult =
  | "confirmed"
  | "declined"
  | "no_answer"
  | "callback"
  | "wrong_number"
  | "other"
  | null;

type StatusCounts = {
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

function normalizeIncomingStatus(value: unknown): TaskStatus | "" {
  const raw = cleanStr(value).toLowerCase();

  if (!raw) return "";

  const map: Record<string, TaskStatus> = {
    pending: "pending",
    wait: "pending",
    waiting: "pending",

    in_progress: "in_progress",
    progress: "in_progress",
    calling: "in_progress",
    started: "in_progress",

    confirmed: "confirmed",
    confirm: "confirmed",
    approved: "confirmed",
    yes: "confirmed",
    attending: "confirmed",
    "אישר": "confirmed",
    "אישרה": "confirmed",
    "אישרו": "confirmed",
    "מגיע": "confirmed",
    "מגיעה": "confirmed",
    "מגיעים": "confirmed",

    declined: "declined",
    decline: "declined",
    rejected: "declined",
    no: "declined",
    not_coming: "declined",
    notcoming: "declined",
    "לא מגיע": "declined",
    "לא מגיעה": "declined",
    "לא מגיעים": "declined",
    "סירב": "declined",
    "סירבה": "declined",

    no_answer: "no_answer",
    noanswer: "no_answer",
    not_answered: "no_answer",
    unanswered: "no_answer",
    "לא ענה": "no_answer",
    "לא ענתה": "no_answer",
    "אין מענה": "no_answer",

    callback: "callback",
    call_back: "callback",
    follow_up: "callback",
    followup: "callback",
    later: "callback",
    "לחזור": "callback",
    "לחזור אליו": "callback",
    "לחזור אליה": "callback",
    "להתקשר שוב": "callback",

    wrong_number: "wrong_number",
    wrongnumber: "wrong_number",
    bad_number: "wrong_number",
    invalid_number: "wrong_number",
    "מספר שגוי": "wrong_number",
    "טלפון שגוי": "wrong_number",

    completed: "completed",
    done: "completed",

    cancelled: "cancelled",
    canceled: "cancelled",
    cancel: "cancelled",
  };

  return map[raw] || "";
}

function isCompletedStatus(status: string) {
  return [
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "wrong_number",
    "completed",
    "cancelled",
  ].includes(status);
}

function getResultFromStatus(status: TaskStatus): TaskResult {
  if (status === "confirmed") return "confirmed";
  if (status === "declined") return "declined";
  if (status === "no_answer") return "no_answer";
  if (status === "callback") return "callback";
  if (status === "wrong_number") return "wrong_number";
  if (status === "completed") return "other";

  return null;
}

function getRsvpStatusFromTaskStatus(status: TaskStatus) {
  if (status === "confirmed") return "confirmed";
  if (status === "declined") return "declined";

  /**
   * חשוב:
   * בסבב 2/3 אנחנו רוצים שהאורח עדיין ייחשב "ממתין",
   * לכן ב"לא ענה" לא משנים אותו ל־no_answer ברשומת האורח.
   */
  return "pending";
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }

  return n;
}

function emptyCounts(): StatusCounts {
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
  };
}

function addCount(target: StatusCounts, status: string, count: number) {
  target.total += count;

  if (status === "pending") target.pending += count;
  if (status === "in_progress") target.in_progress += count;
  if (status === "confirmed") target.confirmed += count;
  if (status === "declined") target.declined += count;
  if (status === "no_answer") target.no_answer += count;
  if (status === "callback") target.callback += count;
  if (status === "wrong_number") target.wrong_number += count;
  if (status === "completed") target.completed += count;
  if (status === "cancelled") target.cancelled += count;
}

function getCompletedFromCounts(counts: StatusCounts) {
  return (
    counts.confirmed +
    counts.declined +
    counts.no_answer +
    counts.callback +
    counts.wrong_number +
    counts.completed +
    counts.cancelled
  );
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

    assignedToEmployeeId: task?.assignedToEmployeeId
      ? String(task.assignedToEmployeeId)
      : "",

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
    canUpdate: status !== "cancelled",

    createdAt: task?.createdAt || null,
    updatedAt: task?.updatedAt || null,
  };
}

function serializeWorkOrder(order: any, counts: StatusCounts) {
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
    wrongNumberTasks: counts.wrong_number,
    cancelledTasks: counts.cancelled,

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
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
   Sync helpers
============================================================ */

async function getCountsForWorkOrder(workOrderId: Types.ObjectId) {
  const rows = await CallTask.aggregate([
    {
      $match: {
        workOrderId,
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

async function syncWorkOrderStatus(workOrderId: Types.ObjectId) {
  const counts = await getCountsForWorkOrder(workOrderId);

  const completed = getCompletedFromCounts(counts);

  const unassignedTasks = await CallTask.countDocuments({
    workOrderId,
    $or: [
      { assignedToEmployeeId: null },
      { assignedToEmployeeId: { $exists: false } },
    ],
  });

  let nextStatus: "open" | "in_progress" | "completed" = "open";

  if (counts.total > 0 && completed >= counts.total) {
    nextStatus = "completed";
  } else if (completed > 0 || counts.in_progress > 0) {
    nextStatus = "in_progress";
  }

  const update: any = {
    status: nextStatus,

    totalTasks: counts.total,
    pendingTasks: counts.pending,
    inProgressTasks: counts.in_progress,
    completedTasks: completed,
    confirmedTasks: counts.confirmed,
    declinedTasks: counts.declined,
    noAnswerTasks: counts.no_answer,
    callbackTasks: counts.callback,
    wrongNumberTasks: counts.wrong_number,
    unassignedTasks,

    lastStatusSyncAt: new Date(),
  };

  if (nextStatus === "completed") {
    update.completedAt = new Date();
  }

  const workOrder = await CallWorkOrder.findByIdAndUpdate(
    workOrderId,
    {
      $set: update,
    },
    {
      new: true,
    }
  ).lean();

  return {
    workOrder,
    counts,
  };
}

async function syncInvitationGuest(input: {
  task: any;
  status: TaskStatus;
  note: string;
  attendingCount?: number;
  employeeId: Types.ObjectId;
}) {
  const guestObjectId = toObjectId(input.task?.guestId);

  if (!guestObjectId) return;

  const now = new Date();

  const rsvpStatus = getRsvpStatusFromTaskStatus(input.status);

  const set: Record<string, any> = {
    lastCallStatus: input.status,
    lastCallResult: getResultFromStatus(input.status),
    lastCallRound: Number(input.task?.round || 1),
    lastCallAt: now,
    lastCallTaskId: toObjectId(input.task?._id),
    lastCallWorkOrderId: toObjectId(input.task?.workOrderId),
    lastCallEmployeeId: input.employeeId,
  };

  if (input.note) {
    set.lastCallNote = input.note;
  }

  /**
   * רק אם האורח אישר / סירב — מעדכנים RSVP אמיתי.
   * אם לא ענה / לחזור אליו — נשאר pending כדי שיוכל להיכנס לסבבים הבאים.
   */
  if (input.status === "confirmed" || input.status === "declined") {
    set.rsvp = rsvpStatus;
    set.rsvpStatus = rsvpStatus;
    set.attendanceStatus = rsvpStatus;
    set.respondedAt = now;
    set.updatedByCallTaskAt = now;
  }

  if (input.status === "confirmed" && input.attendingCount !== undefined) {
    set.attendingCount = input.attendingCount;
    set.guestsCount = input.attendingCount;
  }

  if (input.status === "declined") {
    set.attendingCount = 0;
    set.guestsCount = 0;
  }

  const updatePayload: any = {
    $set: set,
    $push: {
      callHistory: {
        taskId: toObjectId(input.task?._id),
        workOrderId: toObjectId(input.task?.workOrderId),
        employeeId: input.employeeId,
        round: Number(input.task?.round || 1),
        status: input.status,
        result: getResultFromStatus(input.status),
        note: input.note || "",
        at: now,
      },
    },
  };

  await InvitationGuest.collection.updateOne(
    {
      _id: guestObjectId,
    },
    updatePayload
  );
}
/* ============================================================
   Main update
============================================================ */

async function handleUpdate(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const employee = await requireEmployee();

    if (!employee.ok) {
      return employee.response;
    }

    const params = await context.params;

    const taskObjectId = toObjectId(params.taskId);

    if (!taskObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה משימת שיחה לא תקין",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const incomingStatus = normalizeIncomingStatus(
      body?.status || body?.result || body?.callStatus
    );

    const note = cleanStr(body?.note ?? body?.comment ?? body?.notes);
    const attendingCount = parseOptionalNumber(
      body?.attendingCount ?? body?.guestsCount ?? body?.count
    );

    if (!incomingStatus && !note && attendingCount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר סטטוס או הערה לעדכון",
        },
        { status: 400 }
      );
    }

    const existingTask = await CallTask.findOne({
      _id: taskObjectId,
      assignedToEmployeeId: employee.employeeId,
    }).lean();

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: "המשימה לא נמצאה או לא משויכת לעובד המחובר",
        },
        { status: 404 }
      );
    }

    const oldStatus = cleanStr((existingTask as any)?.status) || "pending";
    const nextStatus = incomingStatus || (oldStatus as TaskStatus);

    if ((existingTask as any)?.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "אי אפשר לעדכן משימה שבוטלה",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const $set: Record<string, any> = {
      updatedAt: now,
    };

    const $inc: Record<string, number> = {};

    const $unset: Record<string, any> = {};

    if (incomingStatus) {
      $set.status = nextStatus;
      $set.result = getResultFromStatus(nextStatus);
      $set.rsvpStatus = getRsvpStatusFromTaskStatus(nextStatus);
      $set.lastAttemptAt = now;

      if (nextStatus === "in_progress") {
        $set.startedAt = (existingTask as any)?.startedAt || now;
      }

      if (isCompletedStatus(nextStatus)) {
        $set.completedAt = (existingTask as any)?.completedAt || now;
      }

      if (nextStatus === "pending") {
        $unset.completedAt = "";
        $unset.result = "";
      }

      if (oldStatus !== nextStatus && isCompletedStatus(nextStatus)) {
        $inc.attemptsCount = 1;
      }
    }

    if (note || body?.note === "") {
      $set.note = note;
    }

    if (attendingCount !== undefined) {
      $set.attendingCount = attendingCount;
    }

    const update: any = {};

    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($inc).length) update.$inc = $inc;
    if (Object.keys($unset).length) update.$unset = $unset;

    const updatedTask = await CallTask.findOneAndUpdate(
      {
        _id: taskObjectId,
        assignedToEmployeeId: employee.employeeId,
      },
      update,
      {
        new: true,
      }
    ).lean();

    if (!updatedTask) {
      return NextResponse.json(
        {
          success: false,
          error: "לא ניתן לעדכן את המשימה",
        },
        { status: 500 }
      );
    }

    await syncInvitationGuest({
      task: updatedTask,
      status: nextStatus,
      note,
      attendingCount,
      employeeId: employee.employeeId,
    });

    const workOrderObjectId = toObjectId((updatedTask as any)?.workOrderId);

    let syncedWorkOrder: any = null;
    let counts = emptyCounts();

    if (workOrderObjectId) {
      const synced = await syncWorkOrderStatus(workOrderObjectId);
      syncedWorkOrder = synced.workOrder;
      counts = synced.counts;
    }

    return NextResponse.json({
      success: true,
      message: "סטטוס השיחה עודכן בהצלחה",

      employee: {
        id: employee.employeeIdString,
        name: cleanStr((employee.currentUser as any)?.name),
        email: cleanStr((employee.currentUser as any)?.email),
        role: cleanStr((employee.currentUser as any)?.role),
      },

      task: serializeTask(updatedTask),

      workOrder: syncedWorkOrder
        ? serializeWorkOrder(syncedWorkOrder, counts)
        : null,
    });
  } catch (error: any) {
    console.error(
      "UPDATE /api/employee/call-tasks/[taskId]/status failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בעדכון סטטוס השיחה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   Routes
============================================================ */

export async function PATCH(req: NextRequest, context: RouteContext) {
  return handleUpdate(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return handleUpdate(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handleUpdate(req, context);
}