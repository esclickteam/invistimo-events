import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallTask from "@/models/CallTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Config
============================================================ */

const SHIFT_COLLECTION = "employeeshifts";
const TIMEZONE = "Asia/Jerusalem";
const AUTO_OPEN_HOUR = 8;

type RoundNumber = 1 | 2 | 3;

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

type ScheduledEmployee = {
  employeeId: Types.ObjectId;
  employeeIdString: string;
  shiftId: Types.ObjectId | null;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
};

type StatusCounts = Record<string, number>;

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

function isAdminRole(role?: string) {
  const normalized = cleanStr(role).toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner"
  );
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
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

function getTodayDateKey() {
  return getDateKeyInIsrael(new Date());
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

  return getTodayDateKey();
}

function dateFromKey(dateKey: string, hour = 0) {
  return makeDateInTimeZone(dateKey, hour, 0, 0, 0);
}

function endOfDateKey(dateKey: string) {
  return makeDateInTimeZone(dateKey, 23, 59, 59, 999);
}

function normalizeRound(value: unknown): RoundNumber {
  const round = Number(value);

  if (round === 1 || round === 2 || round === 3) {
    return round;
  }

  return 1;
}

function getSourceAudienceByRound(round: RoundNumber) {
  if (round === 1) return "pending_rsvp";
  if (round === 2) return "round_1_no_answer";
  return "round_2_no_answer";
}

function getRoundTitle(input: {
  clientName: string;
  clientEmail: string;
  round: RoundNumber;
}) {
  const name = input.clientName || input.clientEmail || "לקוח";

  return `${name} | סבב ${input.round} שיחות`;
}

function getDescriptionByRound(round: RoundNumber) {
  if (round === 1) {
    return "סבב 1 - שיחות לכל האורחים שטרם השיבו";
  }

  if (round === 2) {
    return "סבב 2 - שיחות למי שלא נסגר בסבב הראשון";
  }

  return "סבב 3 - שיחות למי שלא נסגר בסבב השני";
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
      decoded.id ||
        decoded._id ||
        decoded.userId ||
        decoded.sub ||
        ""
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

async function requireAdmin() {
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

  if (userObjectId) userConditions.push({ _id: userObjectId });
  userConditions.push({ id: auth.id });

  if (auth.email) {
    userConditions.push({ email: auth.email.toLowerCase() });
  }

  const currentUser = await User.findOne({
    $or: userConditions,
  })
    .select("_id id name email role")
    .lean();

  const role = cleanStr((currentUser as any)?.role || auth.role);

  if (!isAdminRole(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "אין הרשאת אדמין",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    auth,
    currentUser,
    userId: String((currentUser as any)?._id || auth.id),
  };
}

/* ============================================================
   Invitation / client helpers
============================================================ */

function getEventName(invitation: any) {
  return (
    cleanStr(invitation?.eventName) ||
    cleanStr(invitation?.eventTitle) ||
    cleanStr(invitation?.invitationTitle) ||
    cleanStr(invitation?.title) ||
    cleanStr(invitation?.name) ||
    cleanStr(invitation?.coupleName) ||
    "אירוע ללא שם"
  );
}

function getEventDate(invitation: any) {
  const raw =
    invitation?.eventDate ||
    invitation?.date ||
    invitation?.event?.date ||
    null;

  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getOwnerIdFromInvitation(invitation: any) {
  return (
    invitation?.ownerId ||
    invitation?.userId ||
    invitation?.clientUserId ||
    invitation?.createdBy ||
    invitation?.user ||
    null
  );
}

function getClientName(invitation: any, clientUser: any) {
  return (
    cleanStr(clientUser?.name) ||
    cleanStr(invitation?.clientName) ||
    cleanStr(invitation?.customerName) ||
    cleanStr(invitation?.contactName) ||
    cleanStr(invitation?.name) ||
    cleanStr(invitation?.coupleName) ||
    cleanStr(clientUser?.email) ||
    "לקוח ללא שם"
  );
}

function getClientEmail(invitation: any, clientUser: any) {
  return (
    cleanStr(clientUser?.email) ||
    cleanStr(invitation?.clientEmail) ||
    cleanStr(invitation?.customerEmail) ||
    cleanStr(invitation?.email) ||
    ""
  );
}

function getGuestName(guest: any) {
  return (
    cleanStr(guest?.name) ||
    cleanStr(guest?.fullName) ||
    cleanStr(guest?.guestName) ||
    cleanStr(guest?.firstName) ||
    "אורח ללא שם"
  );
}

function getGuestPhone(guest: any) {
  return (
    cleanStr(guest?.phone) ||
    cleanStr(guest?.phoneNumber) ||
    cleanStr(guest?.mobile) ||
    cleanStr(guest?.tel) ||
    ""
  );
}

function hasPhone(guest: any) {
  return getGuestPhone(guest).replace(/\D/g, "").length >= 7;
}

function normalizeRsvp(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function getGuestRsvp(guest: any) {
  return normalizeRsvp(
    guest?.rsvp ||
      guest?.rsvpStatus ||
      guest?.attendanceStatus ||
      guest?.status ||
      ""
  );
}

function isPendingGuest(guest: any) {
  const rsvp = getGuestRsvp(guest);

  if (!rsvp) return true;

  return [
    "pending",
    "wait",
    "waiting",
    "unknown",
    "none",
    "טרם השיב",
    "ממתין",
    "לא ידוע",
  ].includes(rsvp);
}

function getConfiguredRoundAt(input: {
  round: RoundNumber;
  invitation: any;
  clientUser: any;
}) {
  const allPossibleRounds = [
    ...(Array.isArray(input.clientUser?.callRoundsSchedule?.rounds)
      ? input.clientUser.callRoundsSchedule.rounds
      : []),
    ...(Array.isArray(input.invitation?.callRoundsSchedule?.rounds)
      ? input.invitation.callRoundsSchedule.rounds
      : []),
    ...(Array.isArray(input.invitation?.callRounds)
      ? input.invitation.callRounds
      : []),
  ];

  const matched = allPossibleRounds.find((round: any) => {
    const n = Number(
      round?.roundNumber ||
        round?.round ||
        round?.number ||
        round?.index ||
        0
    );

    return n === input.round;
  });

  const raw =
    matched?.scheduledAt ||
    matched?.date ||
    matched?.scheduledDate ||
    matched?.sendAt ||
    null;

  if (!raw) return null;

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return dateFromKey(raw, AUTO_OPEN_HOUR);
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

/* ============================================================
   Shift helpers
============================================================ */

function shiftEmployeeId(shift: any) {
  return extractIdString(
    shift?.employeeIdString ||
      shift?.employeeId ||
      shift?.employee?._id ||
      shift?.employee?.id ||
      shift?.userId ||
      shift?.staffId ||
      shift?.workerId ||
      ""
  );
}

function normalizeShiftEmployee(shift: any): ScheduledEmployee | null {
  const employeeId = shiftEmployeeId(shift);
  const employeeObjectId = toObjectId(employeeId);

  if (!employeeObjectId) return null;

  const shiftId = extractIdString(shift?._id || shift?.id || "");
  const shiftObjectId = toObjectId(shiftId);

  return {
    employeeId: employeeObjectId,
    employeeIdString: String(employeeObjectId),
    shiftId: shiftObjectId,
    employeeName:
      cleanStr(shift?.employeeName) ||
      cleanStr(shift?.employee?.name) ||
      cleanStr(shift?.name),
    employeeEmail:
      cleanStr(shift?.employeeEmail) ||
      cleanStr(shift?.employee?.email) ||
      cleanStr(shift?.email),
    employeePhone:
      cleanStr(shift?.employeePhone) ||
      cleanStr(shift?.employee?.phone) ||
      cleanStr(shift?.phone),
  };
}

async function loadScheduledEmployeesForDate(dateKey: string) {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("DATABASE_NOT_READY");
  }

  const start = dateFromKey(dateKey, 0);
  const end = endOfDateKey(dateKey);

  const shifts = await database
    .collection(SHIFT_COLLECTION)
    .find({
      $and: [
        {
          $or: [
            { date: dateKey },
            { workDate: dateKey },
            { shiftDate: dateKey },
            { day: dateKey },
            { startDate: dateKey },

            { date: { $gte: start, $lte: end } },
            { workDate: { $gte: start, $lte: end } },
            { shiftDate: { $gte: start, $lte: end } },
            { startsAt: { $gte: start, $lte: end } },
            { startAt: { $gte: start, $lte: end } },
            { startTime: { $gte: start, $lte: end } },
            { from: { $gte: start, $lte: end } },
          ],
        },
        {
          $or: [
            { status: { $exists: false } },
            {
              status: {
                $nin: [
                  "cancelled",
                  "canceled",
                  "deleted",
                  "inactive",
                  "disabled",
                ],
              },
            },
            { active: true },
            { isActive: true },
          ],
        },
      ],
    })
    .limit(500)
    .toArray();

  const map = new Map<string, ScheduledEmployee>();

  for (const shift of shifts) {
    const normalized = normalizeShiftEmployee(shift);
    if (!normalized) continue;

    if (!map.has(normalized.employeeIdString)) {
      map.set(normalized.employeeIdString, normalized);
    }
  }

  return Array.from(map.values());
}

/* ============================================================
   DB loaders
============================================================ */

async function findInvitationById(invitationId: string) {
  const objectId = toObjectId(invitationId);

  const conditions: any[] = [
    { id: invitationId },
    { invitationId },
  ];

  if (objectId) {
    conditions.unshift({ _id: objectId });
  }

  return Invitation.findOne({
    $or: conditions,
  }).lean();
}

async function findClientUser(ownerId: unknown) {
  const ownerObjectId = toObjectId(ownerId);

  if (!ownerObjectId) return null;

  return User.findById(ownerObjectId)
    .select("_id id name email role callRoundsSchedule includeCalls")
    .lean();
}

async function loadGuestsForInvitation(invitation: any) {
  const invitationId = extractIdString(invitation?._id || "");
  const invitationObjectId = toObjectId(invitationId);

  const conditions: any[] = [{ invitationId }];

  if (invitationObjectId) {
    conditions.unshift({ invitationId: invitationObjectId });
  }

  return InvitationGuest.find({
    $or: conditions,
  }).lean();
}

function shouldCarryPreviousRoundTaskToNextRound(status: unknown) {
  const normalized = cleanStr(status).toLowerCase();

  /*
    מי נכנס לסבב הבא מתוך הסבב הקודם:

    כן:
    - pending/open/assigned/active/in_progress = לא נגעו בו / לא נסגר
    - no_answer = לא ענה
    - callback = ענה וביקש שיחזרו אליו
    - needs_fix/wrong_number = לא ענה / דורש תיקון

    לא:
    - confirmed = מגיע
    - declined = לא מגיע
    - will_reply_message = ישיב בהודעה לבד
    - completed/cancelled = נסגר / בוטל
  */
  return [
    "pending",
    "open",
    "assigned",
    "active",
    "in_progress",

    "no_answer",
    "callback",
    "needs_fix",
    "wrong_number",
  ].includes(normalized);
}

async function loadGuestsForRound(input: {
  invitation: any;
  round: RoundNumber;
  dateKey: string;
}) {
  const invitationId = extractIdString(input.invitation?._id || "");
  const invitationObjectId = toObjectId(invitationId);

  const allGuests = await loadGuestsForInvitation(input.invitation);

  const pendingGuestsWithPhone = allGuests.filter((guest: any) => {
    return hasPhone(guest) && isPendingGuest(guest);
  });

  /*
    סבב 1:
    כל מי שבהמתנה ויש לו טלפון.
  */
  if (input.round === 1) {
    return pendingGuestsWithPhone;
  }

  if (!invitationObjectId) return [];

  const previousRound = (input.round - 1) as 1 | 2;

  /*
    סבב 2 / סבב 3:
    לא לוקחים את כל מי שבהמתנה באירוע.
    לוקחים רק אורחים שיש להם משימה בסבב הקודם,
    והמשימה האחרונה שלהם בסבב הקודם היא:
    pending = לא נגעו בו,
    no_answer,
    callback,
    needs_fix,
    wrong_number.
  */
  const previousRoundTasks = await CallTask.find({
    invitationId: invitationObjectId,
    round: previousRound,
    workDate: {
      $lte: endOfDateKey(input.dateKey),
    },
  })
    .select("guestId status updatedAt createdAt")
    .sort({
      updatedAt: -1,
      createdAt: -1,
    })
    .lean();

  const latestTaskByGuestId = new Map<string, any>();

  for (const task of previousRoundTasks) {
    const guestId = extractIdString((task as any)?.guestId);
    if (!guestId) continue;

    if (!latestTaskByGuestId.has(guestId)) {
      latestTaskByGuestId.set(guestId, task);
    }
  }

  return pendingGuestsWithPhone.filter((guest: any) => {
    const guestId = extractIdString(guest?._id || "");
    if (!guestId) return false;

    const previousTask = latestTaskByGuestId.get(guestId);

    /*
      אם אין בכלל task בסבב הקודם —
      כן מכניסים אותו.
      זה מכסה בדיוק את המקרה:
      אורח עדיין בהמתנה + יש לו טלפון + לא עשו לו בכלל סבב קודם.
    */
    if (!previousTask) return true;

    return shouldCarryPreviousRoundTaskToNextRound(previousTask?.status);
  });
}

/* ============================================================
   Counts / serialization
============================================================ */

function getCompletedFromCounts(counts: StatusCounts) {
  return (
    Number(counts.confirmed || 0) +
    Number(counts.declined || 0) +
    Number(counts.no_answer || 0) +
    Number(counts.callback || 0) +
    Number(counts.undecided || 0) +
    Number(counts.will_reply_message || 0) +
    Number(counts.needs_fix || 0) +
    Number(counts.wrong_number || 0) +
    Number(counts.completed || 0) +
    Number(counts.cancelled || 0)
  );
}

function serializeWorkOrder(order: any, counts?: StatusCounts) {
  const total =
    Number(counts?.total || 0) || Number(order?.totalTasks || 0) || 0;

  const completed = counts ? getCompletedFromCounts(counts) : 0;

  return {
    id: String(order?._id || ""),
    _id: String(order?._id || ""),

    type: order?.type || "rsvp_calls",
    status: order?.status || "scheduled",

    invitationId: String(order?.invitationId || ""),
    userId: order?.userId ? String(order.userId) : "",
    clientUserId: order?.clientUserId ? String(order.clientUserId) : "",

    clientName: cleanStr(order?.clientName),
    clientEmail: cleanStr(order?.clientEmail),
    eventName: cleanStr(order?.eventName),
    eventDate: order?.eventDate || null,

    round: Number(order?.round || 1),
    sourceAudience: order?.sourceAudience || "",

    title: cleanStr(order?.title),
    description: cleanStr(order?.description),

    workDate: order?.workDate || null,
    configuredRoundAt: order?.configuredRoundAt || null,
    autoOpenAt: order?.autoOpenAt || null,
    autoOpenHour: Number(order?.autoOpenHour || AUTO_OPEN_HOUR),
    timezone: cleanStr(order?.timezone) || TIMEZONE,

    assignedEmployeeIds: Array.isArray(order?.assignedEmployeeIds)
      ? order.assignedEmployeeIds.map((id: any) => String(id))
      : [],

    assignedShiftIds: Array.isArray(order?.assignedShiftIds)
      ? order.assignedShiftIds.map((id: any) => String(id))
      : [],

    employeeCount: Number(order?.employeeCount || 0),

    totalTasks: total,
    pendingTasks: Number(counts?.pending || order?.pendingTasks || 0),
    inProgressTasks: Number(
      counts?.in_progress || order?.inProgressTasks || 0
    ),
    completedTasks:
      counts ? completed : Number(order?.completedTasks || 0),
    confirmedTasks: Number(counts?.confirmed || order?.confirmedTasks || 0),
    declinedTasks: Number(counts?.declined || order?.declinedTasks || 0),
    noAnswerTasks: Number(counts?.no_answer || order?.noAnswerTasks || 0),
    callbackTasks: Number(counts?.callback || order?.callbackTasks || 0),
    undecidedTasks: Number(counts?.undecided || order?.undecidedTasks || 0),
    willReplyMessageTasks: Number(
      counts?.will_reply_message || order?.willReplyMessageTasks || 0
    ),
    needsFixTasks: Number(counts?.needs_fix || order?.needsFixTasks || 0),
    wrongNumberTasks: Number(
      counts?.wrong_number || order?.wrongNumberTasks || 0
    ),
    cancelledTasks: Number(counts?.cancelled || order?.cancelledTasks || 0),
    unassignedTasks: Number(order?.unassignedTasks || 0),

    lastDistributedAt: order?.lastDistributedAt || null,
    lastReassignedAt: order?.lastReassignedAt || null,
    lastStatusSyncAt: order?.lastStatusSyncAt || null,

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
  };
}

async function getCountsByWorkOrderIds(workOrderIds: Types.ObjectId[]) {
  if (!workOrderIds.length) {
    return new Map<string, StatusCounts>();
  }

  const rows = await CallTask.aggregate([
    {
      $match: {
        workOrderId: { $in: workOrderIds },
      },
    },
    {
      $group: {
        _id: {
          workOrderId: "$workOrderId",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map<string, StatusCounts>();

  for (const row of rows) {
    const workOrderId = String(row?._id?.workOrderId || "");
    const status = String(row?._id?.status || "unknown");
    const count = Number(row?.count || 0);

    if (!workOrderId) continue;

    const current = map.get(workOrderId) || {};
    current[status] = count;
    current.total = Number(current.total || 0) + count;

    map.set(workOrderId, current);
  }

  return map;
}

/* ============================================================
   Distribution helpers
============================================================ */

function sameObjectIdArrays(a: Types.ObjectId[], b: Types.ObjectId[]) {
  const aa = a.map((id) => String(id)).sort();
  const bb = b.map((id) => String(id)).sort();

  if (aa.length !== bb.length) return false;

  return aa.every((id, index) => id === bb[index]);
}

async function redistributeExistingWorkOrder(input: {
  workOrder: any;
  scheduledEmployees: ScheduledEmployee[];
}) {
  const workOrderObjectId = toObjectId(input.workOrder?._id);

  if (!workOrderObjectId) return input.workOrder;

  const now = new Date();

  const assignedEmployeeIds = input.scheduledEmployees.map(
    (employee) => employee.employeeId
  );

  const assignedShiftIds = input.scheduledEmployees
    .map((employee) => employee.shiftId)
    .filter(Boolean) as Types.ObjectId[];

  const existingAssignedEmployeeIds = Array.isArray(
    input.workOrder?.assignedEmployeeIds
  )
    ? input.workOrder.assignedEmployeeIds
        .map((id: any) => toObjectId(id))
        .filter(Boolean)
    : [];

  const shouldRedistribute =
    !sameObjectIdArrays(existingAssignedEmployeeIds, assignedEmployeeIds);

  await CallWorkOrder.updateOne(
    {
      _id: workOrderObjectId,
    },
    {
      $set: {
        assignedEmployeeIds,
        assignedShiftIds,
        employeeCount: assignedEmployeeIds.length,
        distributionStrategy: "scheduled_shift_round_robin",
        lastDistributedAt: now,
        updatedAt: now,
      },
    }
  );

  if (shouldRedistribute) {
    const openTasks = await CallTask.find({
      workOrderId: workOrderObjectId,
      status: {
        $in: ["pending", "open", "assigned", "active"],
      },
    })
      .select("_id assignedToEmployeeId")
      .sort({
        sortOrder: 1,
        createdAt: 1,
      })
      .lean();

    for (let index = 0; index < openTasks.length; index += 1) {
      const task = openTasks[index] as any;
      const assignedEmployee =
        input.scheduledEmployees[index % input.scheduledEmployees.length];

      const currentAssigned = toObjectId(task?.assignedToEmployeeId);

      await (CallTask as any).updateOne(
        {
          _id: task._id,
        },
        {
          $set: {
            assignedToEmployeeId: assignedEmployee.employeeId,
            assignedEmployeeId: assignedEmployee.employeeId,
            employeeId: assignedEmployee.employeeId,
            assignedAt: now,
            updatedAt: now,
          },
          ...(currentAssigned &&
          String(currentAssigned) !== String(assignedEmployee.employeeId)
            ? {
                $setOnInsert: {},
                $currentDate: {},
              }
            : {}),
        }
      );

      if (
        currentAssigned &&
        String(currentAssigned) !== String(assignedEmployee.employeeId)
      ) {
        await (CallTask as any).updateOne(
          {
            _id: task._id,
          },
          {
            $set: {
              previousAssignedEmployeeId: currentAssigned,
              reassignedAt: now,
              reassignedReason:
                "redistributed_by_shift_for_round_date",
            },
          }
        );
      }
    }
  }

  return CallWorkOrder.findById(workOrderObjectId).lean();
}

/* ============================================================
   GET - רשימת הוראות עבודה לאדמין
============================================================ */

export async function GET(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin();

    if (!admin.ok) {
      return admin.response;
    }

    const { searchParams } = new URL(req.url);

    const status = cleanStr(searchParams.get("status"));
    const invitationId = cleanStr(searchParams.get("invitationId"));
    const employeeId = cleanStr(searchParams.get("employeeId"));
    const roundParam = cleanStr(searchParams.get("round"));
    const dateParam = cleanStr(searchParams.get("date"));
    const fromParam = cleanStr(searchParams.get("from"));
    const toParam = cleanStr(searchParams.get("to"));

    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 100))
    );

    const query: any = {
      type: "rsvp_calls",
    };

    if (status) {
      query.status = status;
    }

    if (invitationId) {
      const objectId = toObjectId(invitationId);
      query.invitationId = objectId || invitationId;
    }

    if (employeeId) {
      const objectId = toObjectId(employeeId);

      if (objectId) {
        query.assignedEmployeeIds = objectId;
      }
    }

    if (roundParam) {
      const round = Number(roundParam);

      if (round === 1 || round === 2 || round === 3) {
        query.round = round;
      }
    }

    if (dateParam) {
      const dateKey = normalizeDateKey(dateParam);
      query.workDate = {
        $gte: dateFromKey(dateKey, 0),
        $lte: endOfDateKey(dateKey),
      };
    } else if (fromParam || toParam) {
      const fromKey = normalizeDateKey(fromParam || getTodayDateKey());
      const toKey = normalizeDateKey(toParam || fromKey);

      query.workDate = {
        $gte: dateFromKey(fromKey, 0),
        $lte: endOfDateKey(toKey),
      };
    }

    const workOrders = await CallWorkOrder.find(query)
      .sort({
        workDate: -1,
        round: 1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    const workOrderIds = workOrders
      .map((order: any) => toObjectId(order?._id))
      .filter(Boolean) as Types.ObjectId[];

    const countsMap = await getCountsByWorkOrderIds(workOrderIds);

    return NextResponse.json({
      success: true,
      count: workOrders.length,
      workOrders: workOrders.map((order: any) =>
        serializeWorkOrder(order, countsMap.get(String(order?._id || "")))
      ),
    });
  } catch (error: any) {
    console.error("GET /api/admin/call-work-orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בטעינת הוראות עבודה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST - יצירת הוראת עבודה ידנית / מהמנוע האוטומטי
============================================================ */

export async function POST(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin();

    if (!admin.ok) {
      return admin.response;
    }

    const body = await req.json().catch(() => ({}));

    const invitationId = cleanStr(body?.invitationId);
    const round = normalizeRound(body?.round);
    const workDateKey = normalizeDateKey(body?.workDate || body?.date);

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר invitationId",
        },
        { status: 400 }
      );
    }

    const invitation = await findInvitationById(invitationId);

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "האירוע לא נמצא",
        },
        { status: 404 }
      );
    }

    const invitationObjectId = toObjectId((invitation as any)._id);

    if (!invitationObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const scheduledEmployees = await loadScheduledEmployeesForDate(workDateKey);

    if (!scheduledEmployees.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "אין עובדים משובצים לתאריך הזה. צריך לשבץ עובדים לפני פתיחת הוראת עבודה.",
          workDate: workDateKey,
        },
        { status: 400 }
      );
    }

    const existingWorkOrder = await CallWorkOrder.findOne({
      invitationId: invitationObjectId,
      type: "rsvp_calls",
      round,
      workDate: {
        $gte: dateFromKey(workDateKey, 0),
        $lte: endOfDateKey(workDateKey),
      },
    }).lean();

    if (existingWorkOrder) {
      const redistributedWorkOrder = await redistributeExistingWorkOrder({
        workOrder: existingWorkOrder,
        scheduledEmployees,
      });

      const workOrderObjectId = toObjectId(
        (redistributedWorkOrder as any)?._id ||
          (existingWorkOrder as any)?._id
      );

      const countsMap = workOrderObjectId
        ? await getCountsByWorkOrderIds([workOrderObjectId])
        : new Map<string, StatusCounts>();

      return NextResponse.json({
        success: true,
        alreadyExists: true,
        redistributed: true,
        message:
          "כבר קיימת הוראת עבודה לסבב הזה בתאריך הזה. העובדים עודכנו לפי המשמרות של אותו תאריך.",
        workOrder: serializeWorkOrder(
          redistributedWorkOrder || existingWorkOrder,
          countsMap.get(
            String(
              (redistributedWorkOrder as any)?._id ||
                (existingWorkOrder as any)?._id ||
                ""
            )
          )
        ),
      });
    }

    const ownerId = getOwnerIdFromInvitation(invitation);
    const ownerObjectId = toObjectId(ownerId);
    const clientUser = await findClientUser(ownerId);

    const clientName = getClientName(invitation, clientUser);
    const clientEmail = getClientEmail(invitation, clientUser);
    const eventName = getEventName(invitation);
    const eventDate = getEventDate(invitation);

    const configuredRoundAt =
      body?.configuredRoundAt
        ? new Date(body.configuredRoundAt)
        : getConfiguredRoundAt({
            round,
            invitation,
            clientUser,
          });

    const validConfiguredRoundAt =
      configuredRoundAt && !Number.isNaN(configuredRoundAt.getTime())
        ? configuredRoundAt
        : null;

    const guestsForRound = await loadGuestsForRound({
      invitation,
      round,
      dateKey: workDateKey,
    });

    if (!guestsForRound.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            round === 1
              ? "אין אורחים ממתינים לשיחה בסבב 1"
              : `אין אורחים להמשך סבב ${round}. סבב ${round} נפתח רק למי שהיה בסבב ${
                  round - 1
                } ולא נסגר סופית או שלא נגעו בו.`,
          round,
          workDate: workDateKey,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const workDate = dateFromKey(workDateKey, 0);
    const autoOpenAt = dateFromKey(workDateKey, AUTO_OPEN_HOUR);
    const sourceAudience = getSourceAudienceByRound(round);

    const assignedEmployeeIds = scheduledEmployees.map(
      (employee) => employee.employeeId
    );

    const assignedShiftIds = scheduledEmployees
      .map((employee) => employee.shiftId)
      .filter(Boolean) as Types.ObjectId[];

    const workOrderPayload: any = {
      type: "rsvp_calls",

      invitationId: invitationObjectId,
      userId: ownerObjectId || null,
      clientUserId: ownerObjectId || null,

      clientName,
      clientEmail,
      eventName,
      eventDate,

      round,
      sourceAudience,

      workDate,
      configuredRoundAt: validConfiguredRoundAt,
      autoOpenAt,
      autoOpenHour: AUTO_OPEN_HOUR,
      timezone: TIMEZONE,

      title: getRoundTitle({
        clientName,
        clientEmail,
        round,
      }),

      description: getDescriptionByRound(round),

      status: "open",
      distributionStrategy: "scheduled_shift_round_robin",

      assignedEmployeeIds,
      assignedShiftIds,

      employeeCount: assignedEmployeeIds.length,
      totalTasks: guestsForRound.length,
      pendingTasks: guestsForRound.length,
      inProgressTasks: 0,
      completedTasks: 0,
      confirmedTasks: 0,
      declinedTasks: 0,
      noAnswerTasks: 0,
      callbackTasks: 0,
      undecidedTasks: 0,
      willReplyMessageTasks: 0,
      needsFixTasks: 0,
      wrongNumberTasks: 0,
      cancelledTasks: 0,
      unassignedTasks: 0,

      createdBy: "admin",
      createdByUserId: toObjectId(admin.userId) || null,

      lastDistributedAt: now,
      notes: cleanStr(body?.notes),
    };

    const workOrder = await (CallWorkOrder as any).create(workOrderPayload);

    const workOrderId = workOrder._id as Types.ObjectId;

    const taskDocs = guestsForRound.map((guest: any, index: number) => {
      const assignedEmployee =
        scheduledEmployees[index % scheduledEmployees.length];

      return {
        type: "rsvp_call",

        workOrderId,
        invitationId: invitationObjectId,
        guestId: guest._id,

        assignedToEmployeeId: assignedEmployee?.employeeId || null,
        assignedEmployeeId: assignedEmployee?.employeeId || null,
        employeeId: assignedEmployee?.employeeId || null,

        previousAssignedEmployeeId: null,

        clientName,
        clientEmail,
        eventName,
        eventDate,

        guestName: getGuestName(guest),
        guestPhone: getGuestPhone(guest),
        guestEmail: cleanStr(guest?.email),
        guestGroup:
          cleanStr(guest?.groupName) ||
          cleanStr(guest?.group) ||
          cleanStr(guest?.relation) ||
          "",
        guestSide: cleanStr(guest?.side),
        guestTable:
          cleanStr(guest?.tableName) ||
          cleanStr(guest?.tableNumber) ||
          "",

        guestNotes: cleanStr(guest?.notes || guest?.note),

        round,
        sourceAudience,

        workDate,

        status: "pending",
        result: null,

        priority: 0,
        sortOrder: index,

        assignedAt: assignedEmployee ? now : null,
        startedAt: null,
        completedAt: null,
        lastAttemptAt: null,

        attemptsCount: 0,

        reassignedAt: null,
        reassignedByUserId: null,
        reassignedReason: "",

        rsvpStatus: getGuestRsvp(guest) || "pending",
        attendingCount:
          typeof guest?.arrivedCount === "number"
            ? guest.arrivedCount
            : typeof guest?.guestsCount === "number"
              ? guest.guestsCount
              : null,

        note: "",
        adminNote: "",
      };
    });

    try {
      await (CallTask as any).insertMany(taskDocs, {
        ordered: false,
      });
    } catch (insertError: any) {
      await CallWorkOrder.deleteOne({
        _id: workOrderId,
      });

      console.error("CREATE CALL TASKS FAILED:", insertError);

      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ||
            "שגיאה ביצירת משימות שיחה. הוראת העבודה בוטלה.",
        },
        { status: 500 }
      );
    }

    const freshWorkOrder = await CallWorkOrder.findById(workOrderId).lean();

    return NextResponse.json(
      {
        success: true,
        message: "הוראת העבודה נפתחה וחולקה לעובדים המשובצים",
        workDate: workDateKey,
        round,
        totalTasks: taskDocs.length,
        employeesCount: scheduledEmployees.length,
        workOrder: serializeWorkOrder(freshWorkOrder),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/call-work-orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה ביצירת הוראת עבודה",
      },
      { status: 500 }
    );
  }
}