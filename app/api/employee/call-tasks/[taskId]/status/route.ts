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
  | "undecided"
  | "will_reply_message"
  | "needs_fix"
  | "wrong_number"
  | "completed"
  | "cancelled";

type GuestRsvpStatus = "yes" | "no" | "pending";

type TaskResult =
  | "confirmed"
  | "declined"
  | "no_answer"
  | "callback"
  | "undecided"
  | "will_reply_message"
  | "needs_fix"
  | "wrong_number"
  | "other"
  | null;

type CallAnswered = "" | "answered" | "no_answer";

type MessageFollowUpAction =
  | ""
  | "self_reply"
  | "callback"
  | "move_to_next_round";

type NextRoundReason =
  | ""
  | "no_answer"
  | "callback_next_round"
  | "needs_fix"
  | "manual";

type StatusCounts = {
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

function toBool(value: unknown) {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1" ||
    value === "yes" ||
    value === "כן"
  );
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

function normalizeRound(value: unknown) {
  const n = Number(value || 1);

  if (!Number.isFinite(n) || n < 1) return 1;

  return Math.max(1, Math.min(10, Math.floor(n)));
}

function normalizeCallAnswered(value: unknown): CallAnswered {
  const raw = cleanStr(value).toLowerCase();

  if (!raw) return "";

  if (
    raw === "answered" ||
    raw === "answer" ||
    raw === "yes" ||
    raw === "ענה" ||
    raw === "ענתה"
  ) {
    return "answered";
  }

  if (
    raw === "no_answer" ||
    raw === "not_answered" ||
    raw === "unanswered" ||
    raw === "לא ענה" ||
    raw === "לא ענתה" ||
    raw === "אין מענה"
  ) {
    return "no_answer";
  }

  return "";
}

function normalizeMessageFollowUpAction(value: unknown): MessageFollowUpAction {
  const raw = cleanStr(value).toLowerCase();

  if (!raw) return "";

  if (
    raw === "self_reply" ||
    raw === "reply_self" ||
    raw === "will_reply_self" ||
    raw === "ישיב עצמאית" ||
    raw === "תשיב עצמאית" ||
    raw === "יענה לבד" ||
    raw === "תענה לבד"
  ) {
    return "self_reply";
  }

  if (
    raw === "callback" ||
    raw === "call_back" ||
    raw === "follow_up" ||
    raw === "followup" ||
    raw === "מעוניין בחזרה נוספת" ||
    raw === "מעוניינת בחזרה נוספת" ||
    raw === "לחזור אליו" ||
    raw === "לחזור אליה"
  ) {
    return "callback";
  }

  if (
    raw === "move_to_next_round" ||
    raw === "next_round" ||
    raw === "transfer_to_next_round" ||
    raw === "open_in_next_round" ||
    raw === "callback_next_round" ||
    raw === "חזרה בסבב הבא" ||
    raw === "לחזור בסבב הבא" ||
    raw === "העבר לסבב הבא" ||
    raw === "להעביר לסבב הבא"
  ) {
    return "move_to_next_round";
  }

  return "";
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
    arrive: "confirmed",
    arrives: "confirmed",
    arrived: "confirmed",
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
    not_attending: "declined",
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
    callback_next_round: "callback",
    next_round_callback: "callback",
    later: "callback",
    "חזרה בסבב הבא": "callback",
    "לחזור בסבב הבא": "callback",
    "לחזור": "callback",
    "לחזור אליו": "callback",
    "לחזור אליה": "callback",
    "להתקשר שוב": "callback",
    "ביקש לחזור אליו": "callback",
    "ביקשה לחזור אליה": "callback",
    "מעוניין בחזרה נוספת": "callback",
    "מעוניינת בחזרה נוספת": "callback",

    undecided: "undecided",
    maybe: "undecided",
    thinking: "undecided",
    hesitating: "undecided",
    "מתלבט": "undecided",
    "מתלבטת": "undecided",
    "מתלבטים": "undecided",

    will_reply_message: "will_reply_message",
    will_reply: "will_reply_message",
    reply_message: "will_reply_message",
    message: "will_reply_message",
    whatsapp_reply: "will_reply_message",
    self_reply: "will_reply_message",
    "ישיב בהודעה": "will_reply_message",
    "תשיב בהודעה": "will_reply_message",
    "ישיב בוואטסאפ": "will_reply_message",
    "תשיב בוואטסאפ": "will_reply_message",
    "ישיב עצמאית": "will_reply_message",
    "תשיב עצמאית": "will_reply_message",

    needs_fix: "needs_fix",
    need_fix: "needs_fix",
    needs_correction: "needs_fix",
    requires_correction: "needs_fix",
    fix: "needs_fix",
    correction: "needs_fix",
    wrong_number: "needs_fix",
    wrongnumber: "needs_fix",
    bad_number: "needs_fix",
    invalid_number: "needs_fix",
    "דורש תיקון": "needs_fix",
    "דורשת תיקון": "needs_fix",
    "צריך תיקון": "needs_fix",
    "מספר שגוי": "needs_fix",
    "טלפון שגוי": "needs_fix",
    "מספר לא תקין": "needs_fix",

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
    "undecided",
    "will_reply_message",
    "needs_fix",
    "wrong_number",
    "completed",
    "cancelled",
  ].includes(status);
}

function isCallResultStatus(status: string) {
  return [
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "undecided",
    "will_reply_message",
    "needs_fix",
    "wrong_number",
  ].includes(status);
}

function getResultFromStatus(status: TaskStatus): TaskResult {
  if (status === "confirmed") return "confirmed";
  if (status === "declined") return "declined";
  if (status === "no_answer") return "no_answer";
  if (status === "callback") return "callback";
  if (status === "undecided") return "undecided";
  if (status === "will_reply_message") return "will_reply_message";
  if (status === "needs_fix") return "needs_fix";
  if (status === "wrong_number") return "wrong_number";
  if (status === "completed") return "other";

  return null;
}

/**
 * חשוב:
 * ב-InvitationGuest הערכים החוקיים הם רק:
 * yes / no / pending
 */
function getGuestRsvpStatus(status: TaskStatus): GuestRsvpStatus {
  if (status === "confirmed") return "yes";
  if (status === "declined") return "no";

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
    undecided: 0,
    will_reply_message: 0,
    needs_fix: 0,
    wrong_number: 0,
    completed: 0,
    cancelled: 0,
  };
}

function addCount(target: StatusCounts, status: string, count: number) {
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

function getCompletedFromCounts(counts: StatusCounts) {
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

function serializeCallHistoryItem(item: any) {
  return {
    taskId: item?.taskId ? String(item.taskId) : "",
    workOrderId: item?.workOrderId ? String(item.workOrderId) : "",
    invitationId: item?.invitationId ? String(item.invitationId) : "",
    guestId: item?.guestId ? String(item.guestId) : "",

    employeeId: item?.employeeId ? String(item.employeeId) : "",
    employeeName: cleanStr(item?.employeeName),
    employeeEmail: cleanStr(item?.employeeEmail),

    round: Number(item?.round || 0) || null,
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
    nextRound: Number(item?.nextRound || 0) || null,
    nextRoundTaskId: item?.nextRoundTaskId ? String(item.nextRoundTaskId) : "",
    nextRoundWorkOrderId: item?.nextRoundWorkOrderId
      ? String(item.nextRoundWorkOrderId)
      : "",

    at: item?.at || item?.createdAt || null,
    createdAt: item?.createdAt || item?.at || null,
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

    assignedToEmployeeId: task?.assignedToEmployeeId
      ? String(task.assignedToEmployeeId)
      : "",
    assignedEmployeeId: task?.assignedEmployeeId
      ? String(task.assignedEmployeeId)
      : "",
    employeeId: task?.employeeId ? String(task.employeeId) : "",

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

    callAnswered: cleanStr(task?.callAnswered),
    answeredResult: cleanStr(task?.answeredResult),
    messageFollowUpAction: cleanStr(task?.messageFollowUpAction),
    noAnswerResult: cleanStr(task?.noAnswerResult),

    moveToNextRound: Boolean(task?.moveToNextRound),
    nextRound:
      typeof task?.nextRound === "number" ? Number(task.nextRound) : null,
    nextRoundReason: cleanStr(task?.nextRoundReason),

    previousCallHistory: Array.isArray(task?.previousCallHistory)
      ? task.previousCallHistory.map(serializeCallHistoryItem)
      : [],

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
    undecidedTasks: counts.undecided,
    willReplyMessageTasks: counts.will_reply_message,
    needsFixTasks: counts.needs_fix,
    wrongNumberTasks: counts.wrong_number,
    cancelledTasks: counts.cancelled,

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
    employeeName: cleanStr((currentUser as any)?.name),
    employeeEmail: cleanStr((currentUser as any)?.email),
    employeeRole: cleanStr((currentUser as any)?.role),
  };
}

/* ============================================================
   Sync helpers
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
    $and: [
      {
        $or: [
          { assignedToEmployeeId: null },
          { assignedToEmployeeId: { $exists: false } },
        ],
      },
      {
        $or: [
          { assignedEmployeeId: null },
          { assignedEmployeeId: { $exists: false } },
        ],
      },
      {
        $or: [{ employeeId: null }, { employeeId: { $exists: false } }],
      },
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
    undecidedTasks: counts.undecided,
    willReplyMessageTasks: counts.will_reply_message,
    needsFixTasks: counts.needs_fix,
    wrongNumberTasks: counts.wrong_number,
    cancelledTasks: counts.cancelled,

    unassignedTasks,

    lastStatusSyncAt: new Date(),
  };

  if (nextStatus === "completed") {
    update.completedAt = new Date();
  } else {
    update.completedAt = null;
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

async function syncDuplicateGuestRoundTasks(input: {
  task: any;
  status: TaskStatus;
  note: string;
  guestNote: string;
  hasGuestNote: boolean;
  attendingCount?: number;
  now: Date;
}) {
  if (!isCallResultStatus(input.status)) return;

  const workOrderObjectId = toObjectId(input.task?.workOrderId);
  const guestObjectId = toObjectId(input.task?.guestId);
  const taskObjectId = toObjectId(input.task?._id);

  if (!workOrderObjectId || !guestObjectId || !taskObjectId) return;

  const roundNumber = normalizeRound(input.task?.round || 1);
  const guestRsvpStatus = getGuestRsvpStatus(input.status);

  const set: Record<string, any> = {
    status: input.status,
    result: getResultFromStatus(input.status),
    rsvpStatus: guestRsvpStatus,
    completedAt: input.now,
    lastAttemptAt: input.now,
    updatedAt: input.now,
  };

  if (input.note || input.note === "") {
    set.note = input.note || "";
  }

  if (input.hasGuestNote) {
    set.guestNotes = input.guestNote || "";
  }

  if (input.attendingCount !== undefined) {
    set.arrivedCount = input.attendingCount;
    set.actualArrivedCount = input.attendingCount;

    set.attendingCount = input.attendingCount;
    set.confirmedCount = input.attendingCount;
    set.confirmedGuests = input.attendingCount;
    set.arrivingGuests = input.attendingCount;
    set.attendeesCount = input.attendingCount;
  }

  if (input.status === "needs_fix" || input.status === "wrong_number") {
    set.phoneInvalid = true;
    set.invalidPhone = true;
    set.needsFix = true;
    set.requiresCorrection = true;
  }

  const filter: any = {
    _id: {
      $ne: taskObjectId,
    },
    workOrderId: workOrderObjectId,
    guestId: guestObjectId,
    round: roundNumber,
    status: {
      $ne: "cancelled",
    },
  };

  await (CallTask as any).updateMany(filter, {
    $set: set,
  });
}

async function updateGuestExternalNoteOnly(input: {
  task: any;
  guestNote: string;
  now: Date;
}) {
  const guestObjectId = toObjectId(input.task?.guestId);

  if (!guestObjectId) return;

  await InvitationGuest.collection.updateOne(
    {
      _id: guestObjectId,
    },
    {
      $set: {
        notes: input.guestNote || "",
        guestNotes: input.guestNote || "",
        guestNote: input.guestNote || "",
        updatedByCallTaskAt: input.now,
      },
    }
  );
}

async function syncInvitationGuest(input: {
  task: any;
  status: TaskStatus;

  note: string;
  guestNote: string;
  hasGuestNote: boolean;

  attendingCount?: number;
  employeeId: Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  now: Date;

  callAnswered: CallAnswered;
  answeredResult: string;
  messageFollowUpAction: MessageFollowUpAction;
  noAnswerResult: string;

  moveToNextRound: boolean;
  nextRoundReason: NextRoundReason;
  nextRound: number;
  nextRoundTaskId?: Types.ObjectId | null;
  nextRoundWorkOrderId?: Types.ObjectId | null;
}) {
  if (!isCallResultStatus(input.status)) return;

  const guestObjectId = toObjectId(input.task?.guestId);

  if (!guestObjectId) return;

  const round = normalizeRound(input.task?.round || 1);
  const roundKey = `round${round}`;
  const taskObjectId = toObjectId(input.task?._id);
  const workOrderObjectId = toObjectId(input.task?.workOrderId);
  const result = getResultFromStatus(input.status);
  const guestRsvpStatus = getGuestRsvpStatus(input.status);

  const set: Record<string, any> = {
    lastCallStatus: input.status,
    lastCallResult: result,
    lastCallRound: round,
    lastCallAt: input.now,
    lastCallTaskId: taskObjectId,
    lastCallWorkOrderId: workOrderObjectId,
    lastCallEmployeeId: input.employeeId,
    lastCallEmployeeName: input.employeeName,
    lastCallEmployeeEmail: input.employeeEmail,

    callStatus: input.status,
    callResult: result,
    callRound: round,
    callCompleted: true,
    callCompletedAt: input.now,

    rsvpCallStatus: input.status,
    rsvpCallResult: result,
    rsvpCallRound: round,
    rsvpCallCompletedAt: input.now,

    callAnswered: input.callAnswered || "",
    answeredResult: input.answeredResult || "",
    messageFollowUpAction: input.messageFollowUpAction || "",
    noAnswerResult: input.noAnswerResult || "",

    [`${roundKey}CallStatus`]: input.status,
    [`${roundKey}CallResult`]: result,
    [`${roundKey}CallCompleted`]: true,
    [`${roundKey}CallCompletedAt`]: input.now,
    [`${roundKey}CallTaskId`]: taskObjectId,
    [`${roundKey}CallWorkOrderId`]: workOrderObjectId,
    [`${roundKey}CallEmployeeId`]: input.employeeId,
    [`${roundKey}CallEmployeeName`]: input.employeeName,
    [`${roundKey}CallEmployeeEmail`]: input.employeeEmail,
    [`${roundKey}CallNote`]: input.note || "",
    [`${roundKey}CallAnswered`]: input.callAnswered || "",
    [`${roundKey}AnsweredResult`]: input.answeredResult || "",
    [`${roundKey}MessageFollowUpAction`]:
      input.messageFollowUpAction || "",
    [`${roundKey}NoAnswerResult`]: input.noAnswerResult || "",

    updatedByCallTaskAt: input.now,
  };

  if (input.note || input.note === "") {
    set.lastCallNote = input.note || "";
    set.callNote = input.note || "";
    set.rsvpCallNote = input.note || "";
    set.internalCallNote = input.note || "";
  }

  if (input.hasGuestNote) {
    set.notes = input.guestNote || "";
    set.guestNotes = input.guestNote || "";
    set.guestNote = input.guestNote || "";
  }

  if (input.moveToNextRound) {
    set.moveToNextRound = true;
    set.movedToNextRound = true;
    set.nextCallRound = input.nextRound;
    set.nextRound = input.nextRound;
    set.nextCallTaskId = input.nextRoundTaskId || null;
    set.nextCallWorkOrderId = input.nextRoundWorkOrderId || null;
    set.movedToNextRoundAt = input.now;
    set.movedToNextRoundReason = input.nextRoundReason || "";
  } else {
    set.moveToNextRound = false;
    set.movedToNextRound = false;
  }

  if (input.status === "confirmed") {
    const count =
      input.attendingCount !== undefined && input.attendingCount > 0
        ? input.attendingCount
        : 1;

    set.status = "yes";
    set.rsvp = "yes";
    set.rsvpStatus = "yes";
    set.attendanceStatus = "yes";
    set.responseStatus = "yes";
    set.finalRsvpStatus = "yes";

    set.isRsvpFinal = true;
    set.rsvpFinal = true;
    set.rsvpOpen = false;
    set.respondedAt = input.now;
    set.respondedVia = "call";

    set.attending = true;
    set.isAttending = true;

    set.arrivedCount = count;
    set.actualArrivedCount = count;

    set.attendingCount = count;
    set.confirmedCount = count;
    set.confirmedGuests = count;
    set.arrivingGuests = count;
    set.attendeesCount = count;
  }

  if (input.status === "declined") {
    set.status = "no";
    set.rsvp = "no";
    set.rsvpStatus = "no";
    set.attendanceStatus = "no";
    set.responseStatus = "no";
    set.finalRsvpStatus = "no";

    set.isRsvpFinal = true;
    set.rsvpFinal = true;
    set.rsvpOpen = false;
    set.respondedAt = input.now;
    set.respondedVia = "call";

    set.attending = false;
    set.isAttending = false;

    set.arrivedCount = 0;
    set.actualArrivedCount = 0;

    set.attendingCount = 0;
    set.confirmedCount = 0;
    set.confirmedGuests = 0;
    set.arrivingGuests = 0;
    set.attendeesCount = 0;
  }

  if (input.status === "needs_fix" || input.status === "wrong_number") {
    set.status = "pending";
    set.rsvp = "pending";
    set.rsvpStatus = "pending";
    set.attendanceStatus = "pending";
    set.responseStatus = "pending";
    set.finalRsvpStatus = "pending";

    set.isRsvpFinal = false;
    set.rsvpFinal = false;
    set.rsvpOpen = true;

    set.phoneInvalid = true;
    set.invalidPhone = true;
    set.isWrongNumber = true;
    set.needsFix = true;
    set.requiresCorrection = true;
    set.phoneNeedsCorrection = true;

    set.pendingReason = input.moveToNextRound
      ? "needs_fix_next_round"
      : "needs_fix";
    set.pendingCallStatus = "needs_fix";
    set.needsFollowUp = true;

    set.attending = false;
    set.isAttending = false;

    set.arrivedCount = 0;
    set.actualArrivedCount = 0;

    set.attendingCount = 0;
    set.confirmedCount = 0;
    set.confirmedGuests = 0;
    set.arrivingGuests = 0;
    set.attendeesCount = 0;
  }

  if (input.status === "no_answer") {
    set.status = "pending";
    set.rsvp = "pending";
    set.rsvpStatus = "pending";
    set.attendanceStatus = "pending";
    set.responseStatus = "pending";
    set.finalRsvpStatus = "pending";

    set.isRsvpFinal = false;
    set.rsvpFinal = false;
    set.rsvpOpen = true;

    set.pendingReason = input.moveToNextRound
      ? "no_answer_next_round"
      : "no_answer";
    set.pendingCallStatus = "no_answer";
    set.needsFollowUp = true;
    set.isUndecided = false;
    set.willReplyMessage = false;
    set.requestedNoMoreCalls = false;
  }

  if (input.status === "callback") {
    set.status = "pending";
    set.rsvp = "pending";
    set.rsvpStatus = "pending";
    set.attendanceStatus = "pending";
    set.responseStatus = "pending";
    set.finalRsvpStatus = "pending";

    set.isRsvpFinal = false;
    set.rsvpFinal = false;
    set.rsvpOpen = true;

    set.pendingReason = input.moveToNextRound
      ? "callback_next_round"
      : "callback";
    set.pendingCallStatus = "callback";
    set.needsFollowUp = true;
    set.callbackRequested = true;
    set.isUndecided = false;
    set.willReplyMessage = false;
    set.requestedNoMoreCalls = false;
  }

  if (input.status === "undecided") {
    set.status = "pending";
    set.rsvp = "pending";
    set.rsvpStatus = "pending";
    set.attendanceStatus = "pending";
    set.responseStatus = "pending";
    set.finalRsvpStatus = "pending";

    set.isRsvpFinal = false;
    set.rsvpFinal = false;
    set.rsvpOpen = true;

    set.pendingReason = "undecided";
    set.pendingCallStatus = "undecided";
    set.needsFollowUp = false;
    set.isUndecided = true;
    set.willReplyMessage = false;
    set.requestedNoMoreCalls = false;
  }

  if (input.status === "will_reply_message") {
    set.status = "pending";
    set.rsvp = "pending";
    set.rsvpStatus = "pending";
    set.attendanceStatus = "pending";
    set.responseStatus = "pending";
    set.finalRsvpStatus = "pending";

    set.isRsvpFinal = false;
    set.rsvpFinal = false;
    set.rsvpOpen = true;

    set.pendingReason = "will_reply_message";
    set.pendingCallStatus = "will_reply_message";
    set.needsFollowUp = false;
    set.isUndecided = false;
    set.willReplyMessage = true;
    set.requestedNoMoreCalls = true;
  }

  const historyItem = {
    taskId: taskObjectId,
    workOrderId: workOrderObjectId,
    invitationId: toObjectId(input.task?.invitationId),
    guestId: guestObjectId,

    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeEmail: input.employeeEmail,

    round,
    status: input.status,
    result,
    rsvpStatus: guestRsvpStatus,

    callAnswered: input.callAnswered || "",
    answeredResult: input.answeredResult || "",
    messageFollowUpAction: input.messageFollowUpAction || "",
    noAnswerResult: input.noAnswerResult || "",

    arrivedCount:
      input.attendingCount !== undefined ? input.attendingCount : null,

    note: input.note || "",
    callDocumentation: input.note || "",

    guestNote: input.hasGuestNote ? input.guestNote || "" : "",

    movedToNextRound: Boolean(input.moveToNextRound),
    nextRoundReason: input.nextRoundReason || "",
    nextRound: input.moveToNextRound ? input.nextRound : null,
    nextRoundTaskId: input.nextRoundTaskId || null,
    nextRoundWorkOrderId: input.nextRoundWorkOrderId || null,

    at: input.now,
    createdAt: input.now,
  };

  const updatePayload: any = {
    $set: set,
    $push: {
      callHistory: historyItem,
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

    const callDocumentation =
      body?.callDocumentation &&
      typeof body.callDocumentation === "object" &&
      !Array.isArray(body.callDocumentation)
        ? body.callDocumentation
        : {};

    const rawIncomingStatus = normalizeIncomingStatus(
      body?.status ||
        body?.result ||
        body?.callStatus ||
        body?.callResult ||
        body?.callOutcome ||
        body?.rsvpStatus ||
        body?.guestRsvpStatus ||
        callDocumentation?.status ||
        callDocumentation?.result
    );

    const note = cleanStr(
      body?.note ??
        body?.callDocumentationNote ??
        body?.documentationNote ??
        callDocumentation?.note
    );

    const hasGuestNote =
      Object.prototype.hasOwnProperty.call(body, "guestNote") ||
      Object.prototype.hasOwnProperty.call(body, "externalGuestNote") ||
      Object.prototype.hasOwnProperty.call(body, "guestNotes") ||
      Object.prototype.hasOwnProperty.call(callDocumentation, "guestNote");

    const guestNote = cleanStr(
      body?.guestNote ??
        body?.externalGuestNote ??
        body?.guestNotes ??
        callDocumentation?.guestNote
    );

    const callAnswered = normalizeCallAnswered(
      body?.callAnswered ??
        body?.callAnswer ??
        body?.answered ??
        callDocumentation?.callAnswered
    );

    const answeredResult = cleanStr(
      body?.answeredResult ?? callDocumentation?.answeredResult
    );

    const messageFollowUpAction = normalizeMessageFollowUpAction(
      body?.messageFollowUpAction ??
        body?.followUpAction ??
        body?.nextAction ??
        callDocumentation?.messageFollowUpAction
    );

    const noAnswerResult = cleanStr(
      body?.noAnswerResult ?? callDocumentation?.noAnswerResult
    );

    const requestedAttendingCount = parseOptionalNumber(
      body?.attendingCount ??
        body?.confirmedCount ??
        body?.arrivedCount ??
        body?.actualArrivedCount ??
        body?.count ??
        callDocumentation?.attendingCount
    );

    const requestedMoveToNextRound =
      toBool(body?.moveToNextRound) ||
      toBool(body?.transferToNextRound) ||
      toBool(body?.openInNextRound) ||
      toBool(callDocumentation?.movedToNextRound) ||
      messageFollowUpAction === "move_to_next_round";

    const incomingStatus =
      rawIncomingStatus === "will_reply_message" && requestedMoveToNextRound
        ? "callback"
        : rawIncomingStatus;

    if (
      !incomingStatus &&
      !note &&
      !hasGuestNote &&
      requestedAttendingCount === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר סטטוס, הערה או תיעוד לעדכון",
        },
        { status: 400 }
      );
    }

    const assignmentMatch = buildEmployeeAssignmentMatch(employee.employeeId);

    const existingTask = await CallTask.findOne({
      _id: taskObjectId,
      ...assignmentMatch,
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
    const round = normalizeRound(body?.round || (existingTask as any)?.round || 1);
    const nextRound = normalizeRound(
      body?.nextRound || callDocumentation?.nextRound || round + 1
    );

    const autoMoveBecauseNoAnswer = nextStatus === "no_answer";
    const autoMoveBecauseCallbackNextRound = nextStatus === "callback";
    const autoMoveBecauseNeedsFix =
      nextStatus === "needs_fix" || nextStatus === "wrong_number";

    const moveToNextRound =
      autoMoveBecauseNoAnswer ||
      autoMoveBecauseCallbackNextRound ||
      autoMoveBecauseNeedsFix ||
      (requestedMoveToNextRound &&
        nextStatus !== "confirmed" &&
        nextStatus !== "declined" &&
        nextStatus !== "will_reply_message");

    const nextRoundReason: NextRoundReason = autoMoveBecauseNoAnswer
      ? "no_answer"
      : autoMoveBecauseCallbackNextRound
        ? "callback_next_round"
        : autoMoveBecauseNeedsFix
          ? "needs_fix"
          : moveToNextRound
            ? "manual"
            : "";

    let attendingCount = requestedAttendingCount;

    if (nextStatus === "confirmed") {
      const existingCount =
        typeof (existingTask as any)?.attendingCount === "number"
          ? (existingTask as any).attendingCount
          : undefined;

      attendingCount =
        requestedAttendingCount !== undefined && requestedAttendingCount > 0
          ? requestedAttendingCount
          : existingCount && existingCount > 0
            ? existingCount
            : 1;
    }

    if (
      nextStatus === "declined" ||
      nextStatus === "needs_fix" ||
      nextStatus === "wrong_number"
    ) {
      attendingCount = nextStatus === "declined" ? 0 : attendingCount;
    }

    const isFinal = isCompletedStatus(nextStatus);
    const result = getResultFromStatus(nextStatus);
    const taskRsvpStatus = getGuestRsvpStatus(nextStatus);

    const $set: Record<string, any> = {
      updatedAt: now,
    };

    const $inc: Record<string, number> = {};
    const $unset: Record<string, any> = {};

    if (incomingStatus) {
      $set.status = nextStatus;
      $set.result = result;
      $set.rsvpStatus = taskRsvpStatus;
      $set.round = round;
      $set.lastAttemptAt = now;

      $set.callAnswered =
        callAnswered ||
        (nextStatus === "no_answer" ? "no_answer" : "answered");

      $set.answeredResult = answeredResult || nextStatus || "";

      $set.messageFollowUpAction =
        nextStatus === "callback"
          ? "move_to_next_round"
          : messageFollowUpAction || "";

      $set.noAnswerResult =
        nextStatus === "no_answer"
          ? "no_answer"
          : nextStatus === "needs_fix" || nextStatus === "wrong_number"
            ? "needs_fix"
            : noAnswerResult || "";

      $set.moveToNextRound = Boolean(moveToNextRound);
      $set.nextRound = moveToNextRound ? nextRound : null;
      $set.nextRoundReason = nextRoundReason;

      $set.handledByEmployeeId = employee.employeeId;
      $set.handledByEmployeeName = employee.employeeName;
      $set.handledByEmployeeEmail = employee.employeeEmail;

      if (nextStatus === "in_progress") {
        $set.startedAt = (existingTask as any)?.startedAt || now;
      }

      if (isFinal) {
        $set.completedAt = now;
        $set.isCompleted = true;
        $set.completed = true;
      }

      if (nextStatus === "pending") {
        $unset.completedAt = "";
        $unset.result = "";
        $set.isCompleted = false;
        $set.completed = false;
      }

      if (oldStatus !== nextStatus && isFinal) {
        $inc.attemptsCount = 1;
      }
    }

    if (note || body?.note === "") {
      $set.note = note;
    }

    if (hasGuestNote) {
      $set.guestNotes = guestNote || "";
    }

    if (attendingCount !== undefined) {
      $set.arrivedCount = attendingCount;
      $set.actualArrivedCount = attendingCount;

      $set.attendingCount = attendingCount;
      $set.confirmedCount = attendingCount;
      $set.confirmedGuests = attendingCount;
      $set.arrivingGuests = attendingCount;
      $set.attendeesCount = attendingCount;
    }

    if (nextStatus === "needs_fix" || nextStatus === "wrong_number") {
      $set.phoneInvalid = true;
      $set.invalidPhone = true;
      $set.needsFix = true;
      $set.requiresCorrection = true;
      $set.phoneNeedsCorrection = true;
    }

    const update: any = {};

    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($inc).length) update.$inc = $inc;
    if (Object.keys($unset).length) update.$unset = $unset;

    const updatedTask = await CallTask.findOneAndUpdate(
      {
        _id: taskObjectId,
        ...assignmentMatch,
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

    /*
      חשוב:
      לא יוצרים כאן משימה / הוראת עבודה לסבב הבא.
      עדכון סטטוס של עובד רק מסמן שהאורח צריך להיכנס לסבב הבא.
      פתיחת הסבב הבא, בחירת העובדים וחלוקת המשימות נעשות אך ורק דרך ה-cron
      לפי תאריך הסבב שהוגדר באדמין ולפי העובדים שמשובצים באותו תאריך.
    */

    if (incomingStatus && isCallResultStatus(nextStatus)) {
      await syncInvitationGuest({
        task: updatedTask,
        status: nextStatus,

        note,
        guestNote,
        hasGuestNote,

        attendingCount,
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        employeeEmail: employee.employeeEmail,
        now,

        callAnswered:
          callAnswered ||
          (nextStatus === "no_answer" ? "no_answer" : "answered"),
        answeredResult: answeredResult || nextStatus || "",
        messageFollowUpAction:
          nextStatus === "callback"
            ? "move_to_next_round"
            : messageFollowUpAction || "",
        noAnswerResult:
          nextStatus === "no_answer"
            ? "no_answer"
            : nextStatus === "needs_fix" || nextStatus === "wrong_number"
              ? "needs_fix"
              : noAnswerResult || "",

        moveToNextRound,
        nextRoundReason,
        nextRound,
        nextRoundTaskId: null,
        nextRoundWorkOrderId: null,
      });

      await syncDuplicateGuestRoundTasks({
        task: updatedTask,
        status: nextStatus,
        note,
        guestNote,
        hasGuestNote,
        attendingCount,
        now,
      });
    } else if (hasGuestNote) {
      await updateGuestExternalNoteOnly({
        task: updatedTask,
        guestNote,
        now,
      });
    }

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
      message: isCallResultStatus(nextStatus)
        ? moveToNextRound
          ? nextStatus === "no_answer"
            ? "התיעוד נשמר. האורח ייכנס לסבב הבא רק בתאריך שהוגדר באדמין דרך ה-cron"
            : nextStatus === "needs_fix" || nextStatus === "wrong_number"
              ? "התיעוד נשמר. האורח שדורש תיקון ייכנס לסבב הבא רק בתאריך שהוגדר באדמין דרך ה-cron"
              : "התיעוד נשמר. החזרה תיפתח רק בסבב הבא לפי התאריך באדמין והעובדים שבמשמרת"
          : "התיעוד נשמר והאורח עודכן"
        : "סטטוס השיחה עודכן בהצלחה",

      employee: {
        id: employee.employeeIdString,
        name: employee.employeeName,
        email: employee.employeeEmail,
        role: employee.employeeRole,
      },

      task: serializeTask(updatedTask),

      nextRoundTask: null,
      nextRoundWillBeOpenedByCron: Boolean(moveToNextRound),
      nextRound,
      nextRoundReason,

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