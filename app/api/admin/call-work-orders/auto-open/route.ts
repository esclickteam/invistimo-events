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

const TIMEZONE = "Asia/Jerusalem";
const AUTO_OPEN_HOUR = 8;
const SHIFT_COLLECTION = "employeeshifts";

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

type ScheduledRound = {
  round: RoundNumber;
  scheduledAt: Date;
  raw: any;
};

type ScheduleCandidate = {
  invitation: any;
  clientUser: any | null;
  round: RoundNumber;
  configuredRoundAt: Date;
  scheduleSource: "invitation" | "user";
  rawRound: any;
};

/* ============================================================
   Basic helpers
============================================================ */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(value: unknown) {
  const id = extractIdString(value);
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function extractIdString(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

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

function normalizeRound(value: unknown, fallbackIndex = 0): RoundNumber | null {
  const hasExplicit =
    value !== undefined && value !== null && cleanStr(value) !== "";

  if (hasExplicit) {
    const n = Number(value);

    if (n === 1 || n === 2 || n === 3) return n;
    if (n === 0 || n === 1 || n === 2) {
      const byIndex = n + 1;
      if (byIndex === 1 || byIndex === 2 || byIndex === 3) return byIndex;
    }
  }

  const fallback = fallbackIndex + 1;

  if (fallback === 1 || fallback === 2 || fallback === 3) {
    return fallback;
  }

  return null;
}

function getSourceAudienceByRound(round: RoundNumber) {
  if (round === 1) return "pending_rsvp";
  if (round === 2) return "round_1_no_answer";
  return "round_2_no_answer";
}

function isAdminRole(role?: string) {
  const normalized = cleanStr(role).toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner"
  );
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

function getIsraelHour(date = new Date()) {
  return getTimeZoneParts(date, TIMEZONE).hour;
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

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
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

function autoOpenAtForDateKey(dateKey: string) {
  return makeDateInTimeZone(dateKey, AUTO_OPEN_HOUR, 0, 0, 0);
}

function parseTimeParts(raw: unknown) {
  const value = cleanStr(raw);

  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return {
      hour: AUTO_OPEN_HOUR,
      minute: 0,
    };
  }

  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2]))),
  };
}

function parseDateFlexible(raw: unknown, fallbackTime?: unknown) {
  if (!raw) return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  const value = cleanStr(raw);

  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = parseTimeParts(fallbackTime);

    return makeDateInTimeZone(value, time.hour, time.minute, 0, 0);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
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

function isCronAuthorized(req: NextRequest) {
  const secret =
    process.env.CRON_SECRET ||
    process.env.AUTO_OPEN_SECRET ||
    process.env.CALL_WORK_ORDERS_CRON_SECRET ||
    "";

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!secret) return false;

  const url = new URL(req.url);

  const authHeader = cleanStr(req.headers.get("authorization"));
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const headerSecret =
    cleanStr(req.headers.get("x-cron-secret")) ||
    cleanStr(req.headers.get("x-auto-open-secret"));

  const querySecret =
    cleanStr(url.searchParams.get("secret")) ||
    cleanStr(url.searchParams.get("cronSecret"));

  return bearer === secret || headerSecret === secret || querySecret === secret;
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

async function requireAdminOrCron(req: NextRequest) {
  if (isCronAuthorized(req)) {
    return {
      ok: true as const,
      actor: "system" as const,
      userId: null as string | null,
    };
  }

  const auth = await getAuthUser();

  if (!auth?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "לא מחובר או חסר CRON_SECRET",
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
    userConditions.push({ email: auth.email });
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
    actor: "admin" as const,
    userId: String((currentUser as any)?._id || auth.id),
  };
}

/* ============================================================
   Schedule extraction
============================================================ */

function getScheduleArrays(container: any) {
  const arrays = [
    container?.callRoundsSchedule?.rounds,
    container?.phoneCallRoundsSchedule?.rounds,
    container?.callRounds,
    container?.phoneCallRounds,
    container?.rounds,
  ];

  return arrays.filter(Array.isArray) as any[][];
}

function isRoundEnabled(raw: any) {
  if (!raw) return false;

  if (raw.enabled === false) return false;
  if (raw.active === false) return false;
  if (raw.isActive === false) return false;
  if (raw.disabled === true) return false;
  if (raw.cancelled === true) return false;
  if (raw.canceled === true) return false;
  if (raw.deleted === true) return false;

  const status = cleanStr(raw.status).toLowerCase();

  if (
    ["cancelled", "canceled", "deleted", "disabled", "inactive"].includes(
      status
    )
  ) {
    return false;
  }

  return true;
}

function getRoundScheduledAt(raw: any) {
  const direct =
    raw?.scheduledAt ||
    raw?.scheduledDate ||
    raw?.callAt ||
    raw?.callDateTime ||
    raw?.sendAt ||
    raw?.dateTime ||
    raw?.at ||
    null;

  const directDate = parseDateFlexible(direct);

  if (directDate) return directDate;

  const dateOnly =
    raw?.date ||
    raw?.scheduledDay ||
    raw?.day ||
    raw?.workDate ||
    raw?.roundDate ||
    null;

  return parseDateFlexible(dateOnly, raw?.time || raw?.hour);
}

function extractScheduledRoundsForDate(container: any, dateKey: string) {
  const results: ScheduledRound[] = [];

  const arrays = getScheduleArrays(container);

  for (const rounds of arrays) {
    rounds.forEach((raw, index) => {
      if (!isRoundEnabled(raw)) return;

      const round = normalizeRound(
        raw?.roundNumber ?? raw?.round ?? raw?.number ?? raw?.index,
        index
      );

      if (!round) return;

      const scheduledAt = getRoundScheduledAt(raw);

      if (!scheduledAt) return;

      if (getDateKeyInIsrael(scheduledAt) !== dateKey) return;

      results.push({
        round,
        scheduledAt,
        raw,
      });
    });
  }

  return results;
}

function buildScheduleQuery(dateKey: string) {
  const start = addHours(startOfDateKey(dateKey), -12);
  const end = addHours(endOfDateKey(dateKey), 12);
  const dateRegex = new RegExp(`^${escapeRegExp(dateKey)}`);

  const fields = [
    "callRoundsSchedule.rounds.scheduledAt",
    "callRoundsSchedule.rounds.scheduledDate",
    "callRoundsSchedule.rounds.date",
    "phoneCallRoundsSchedule.rounds.scheduledAt",
    "phoneCallRoundsSchedule.rounds.scheduledDate",
    "phoneCallRoundsSchedule.rounds.date",
    "callRounds.scheduledAt",
    "callRounds.scheduledDate",
    "callRounds.date",
    "phoneCallRounds.scheduledAt",
    "phoneCallRounds.scheduledDate",
    "phoneCallRounds.date",
    "rounds.scheduledAt",
    "rounds.scheduledDate",
    "rounds.date",
  ];

  const or: any[] = [];

  for (const field of fields) {
    or.push({
      [field]: {
        $gte: start,
        $lte: end,
      },
    });

    or.push({
      [field]: {
        $regex: dateRegex,
      },
    });
  }

  return {
    $or: or,
  };
}

/* ============================================================
   Invitation / client helpers
============================================================ */

async function findInvitationByAnyId(value: unknown) {
  const id = extractIdString(value);
  const objectId = toObjectId(id);

  if (!id && !objectId) return null;

  const conditions: any[] = [];

  if (objectId) conditions.push({ _id: objectId });
  if (id) {
    conditions.push({ id });
    conditions.push({ invitationId: id });
  }

  return Invitation.findOne({
    $or: conditions,
  }).lean();
}

function getOwnerIdFromInvitation(invitation: any) {
  return (
    invitation?.ownerId ||
    invitation?.userId ||
    invitation?.clientUserId ||
    invitation?.createdBy ||
    invitation?.user ||
    invitation?.clientId ||
    null
  );
}

async function findClientUserFromInvitation(invitation: any) {
  const ownerId = getOwnerIdFromInvitation(invitation);
  const ownerObjectId = toObjectId(ownerId);

  if (ownerObjectId) {
    const byId = await User.findById(ownerObjectId).lean();
    if (byId) return byId;
  }

  const email =
    cleanStr(invitation?.clientEmail) ||
    cleanStr(invitation?.customerEmail) ||
    cleanStr(invitation?.email);

  if (email) {
    const byEmail = await User.findOne({
      email: email.toLowerCase(),
    }).lean();

    if (byEmail) return byEmail;
  }

  return null;
}

async function findInvitationForUserRound(user: any, rawRound: any) {
  const explicitInvitationId =
    rawRound?.invitationId ||
    rawRound?.eventId ||
    rawRound?.invitation ||
    rawRound?.event ||
    null;

  if (explicitInvitationId) {
    const explicit = await findInvitationByAnyId(explicitInvitationId);
    if (explicit) return explicit;
  }

  const userObjectId = toObjectId(user?._id || user?.id);

  const conditions: any[] = [];

  if (userObjectId) {
    conditions.push({ userId: userObjectId });
    conditions.push({ ownerId: userObjectId });
    conditions.push({ clientUserId: userObjectId });
    conditions.push({ createdBy: userObjectId });
    conditions.push({ user: userObjectId });

    conditions.push({ userId: String(userObjectId) });
    conditions.push({ ownerId: String(userObjectId) });
    conditions.push({ clientUserId: String(userObjectId) });
    conditions.push({ createdBy: String(userObjectId) });
  }

  const email = cleanStr(user?.email).toLowerCase();

  if (email) {
    conditions.push({ clientEmail: email });
    conditions.push({ customerEmail: email });
    conditions.push({ email });
  }

  if (!conditions.length) return null;

  const todayStart = startOfDateKey(getDateKeyInIsrael());

  const upcoming = await Invitation.findOne({
    $and: [
      { $or: conditions },
      {
        $or: [
          { eventDate: { $gte: todayStart } },
          { date: { $gte: todayStart } },
        ],
      },
    ],
  })
    .sort({
      eventDate: 1,
      date: 1,
      createdAt: -1,
    })
    .lean();

  if (upcoming) return upcoming;

  return Invitation.findOne({
    $or: conditions,
  })
    .sort({
      createdAt: -1,
    })
    .lean();
}

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

async function loadScheduleCandidates(dateKey: string, maxCandidates: number) {
  const candidates: ScheduleCandidate[] = [];
  const dedupe = new Set<string>();

  const scheduleQuery = buildScheduleQuery(dateKey);

  const invitations = await Invitation.collection
    .find(scheduleQuery)
    .limit(maxCandidates)
    .toArray();

  for (const invitation of invitations) {
    const rounds = extractScheduledRoundsForDate(invitation, dateKey);

    if (!rounds.length) continue;

    const clientUser = await findClientUserFromInvitation(invitation);

    for (const roundInfo of rounds) {
      const invitationId = extractIdString(invitation?._id);
      const key = `${invitationId}:${roundInfo.round}:${dateKey}`;

      if (dedupe.has(key)) continue;
      dedupe.add(key);

      candidates.push({
        invitation,
        clientUser,
        round: roundInfo.round,
        configuredRoundAt: roundInfo.scheduledAt,
        scheduleSource: "invitation",
        rawRound: roundInfo.raw,
      });
    }
  }

  const users = await User.collection
    .find(scheduleQuery)
    .limit(maxCandidates)
    .toArray();

  for (const user of users) {
    const rounds = extractScheduledRoundsForDate(user, dateKey);

    if (!rounds.length) continue;

    for (const roundInfo of rounds) {
      const invitation = await findInvitationForUserRound(user, roundInfo.raw);

      if (!invitation) continue;

      const invitationId = extractIdString((invitation as any)?._id);
      const key = `${invitationId}:${roundInfo.round}:${dateKey}`;

      if (dedupe.has(key)) continue;
      dedupe.add(key);

      candidates.push({
        invitation,
        clientUser: user,
        round: roundInfo.round,
        configuredRoundAt: roundInfo.scheduledAt,
        scheduleSource: "user",
        rawRound: roundInfo.raw,
      });
    }
  }

  return candidates.slice(0, maxCandidates);
}

/* ============================================================
   Shifts helpers
============================================================ */

function shiftEmployeeId(shift: any) {
  return (
    shift?.employeeId ||
    shift?.userId ||
    shift?.staffId ||
    shift?.workerId ||
    shift?.employee?._id ||
    shift?.employee?.id ||
    shift?.user?._id ||
    shift?.user?.id ||
    ""
  );
}

function normalizeShiftEmployee(shift: any): ScheduledEmployee | null {
  const employeeObjectId = toObjectId(shiftEmployeeId(shift));

  if (!employeeObjectId) return null;

  const shiftObjectId = toObjectId(shift?._id || shift?.id);

  return {
    employeeId: employeeObjectId,
    employeeIdString: String(employeeObjectId),
    shiftId: shiftObjectId,
    employeeName:
      cleanStr(shift?.employeeName) ||
      cleanStr(shift?.name) ||
      cleanStr(shift?.employee?.name) ||
      cleanStr(shift?.user?.name),
    employeeEmail:
      cleanStr(shift?.employeeEmail) ||
      cleanStr(shift?.email) ||
      cleanStr(shift?.employee?.email) ||
      cleanStr(shift?.user?.email),
    employeePhone:
      cleanStr(shift?.employeePhone) ||
      cleanStr(shift?.phone) ||
      cleanStr(shift?.employee?.phone) ||
      cleanStr(shift?.user?.phone),
  };
}

async function loadScheduledEmployeesForDate(dateKey: string) {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("DATABASE_NOT_READY");
  }

  const start = startOfDateKey(dateKey);
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
            { date: { $gte: start, $lte: end } },
            { workDate: { $gte: start, $lte: end } },
            { shiftDate: { $gte: start, $lte: end } },
          ],
        },
        {
          $or: [
            { isDeleted: { $exists: false } },
            { isDeleted: false },
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
   Guests helpers
============================================================ */

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
    "no_response",
    "unanswered",
    "not_answered",
    "טרם השיב",
    "ממתין",
    "לא ידוע",
  ].includes(rsvp);
}

async function loadGuestsForInvitation(invitation: any) {
  const invitationId = extractIdString(invitation?._id);
  const invitationObjectId = toObjectId(invitationId);

  const conditions: any[] = [];

  if (invitationObjectId) {
    conditions.push({ invitationId: invitationObjectId });
    conditions.push({ eventId: invitationObjectId });
  }

  if (invitationId) {
    conditions.push({ invitationId });
    conditions.push({ eventId: invitationId });
  }

  if (!conditions.length) return [];

  return InvitationGuest.find({
    $or: conditions,
  })
    .sort({
      createdAt: 1,
      _id: 1,
    })
    .lean();
}

async function loadGuestsForRound(input: {
  invitation: any;
  round: RoundNumber;
  dateKey: string;
}) {
  const invitationId = extractIdString(input.invitation?._id);
  const invitationObjectId = toObjectId(invitationId);

  const allGuests = await loadGuestsForInvitation(input.invitation);

  if (input.round === 1) {
    return allGuests.filter((guest: any) => {
      return hasPhone(guest) && isPendingGuest(guest);
    });
  }

  if (!invitationObjectId) return [];

  const previousRound = (input.round - 1) as 1 | 2;

  const previousNoAnswerTasks = await CallTask.find({
    invitationId: invitationObjectId,
    round: previousRound,
    status: "no_answer",
    workDate: {
      $lte: endOfDateKey(input.dateKey),
    },
  })
    .select("guestId")
    .lean();

  const guestIds = new Set(
    previousNoAnswerTasks.map((task: any) => String(task.guestId))
  );

  return allGuests.filter((guest: any) => {
    return (
      hasPhone(guest) &&
      isPendingGuest(guest) &&
      guestIds.has(String(guest?._id || ""))
    );
  });
}

/* ============================================================
   Work order creation
============================================================ */

function getRoundTitle(input: {
  clientName: string;
  clientEmail: string;
  round: RoundNumber;
}) {
  const name = input.clientName || input.clientEmail || "לקוח";

  return `${name} | סבב ${input.round} שיחות`;
}

function getRoundDescription(round: RoundNumber) {
  if (round === 1) {
    return "סבב 1 - שיחות לכל האורחים שטרם השיבו";
  }

  if (round === 2) {
    return "סבב 2 - שיחות למי שלא ענה בסבב הראשון";
  }

  return "סבב 3 - שיחות למי שלא ענה בסבב השני";
}

function getAttendingCount(guest: any) {
  const values = [
    guest?.attendingCount,
    guest?.arrivedCount,
    guest?.guestsCount,
    guest?.count,
    guest?.quantity,
  ];

  for (const value of values) {
    if (typeof value === "number" && value >= 0) {
      return value;
    }
  }

  return null;
}

function serializeWorkOrder(order: any) {
  return {
    id: String(order?._id || ""),
    _id: String(order?._id || ""),
    type: order?.type || "rsvp_calls",
    status: order?.status || "open",

    invitationId: String(order?.invitationId || ""),
    userId: order?.userId ? String(order.userId) : "",
    clientUserId: order?.clientUserId ? String(order.clientUserId) : "",

    clientName: cleanStr(order?.clientName),
    clientEmail: cleanStr(order?.clientEmail),
    eventName: cleanStr(order?.eventName),
    eventDate: order?.eventDate || null,

    round: Number(order?.round || 1),
    sourceAudience: cleanStr(order?.sourceAudience),

    title: cleanStr(order?.title),
    description: cleanStr(order?.description),

    workDate: order?.workDate || null,
    configuredRoundAt: order?.configuredRoundAt || null,
    autoOpenAt: order?.autoOpenAt || null,
    timezone: order?.timezone || TIMEZONE,

    assignedEmployeeIds: Array.isArray(order?.assignedEmployeeIds)
      ? order.assignedEmployeeIds.map((id: any) => String(id))
      : [],

    assignedShiftIds: Array.isArray(order?.assignedShiftIds)
      ? order.assignedShiftIds.map((id: any) => String(id))
      : [],

    employeeCount: Number(order?.employeeCount || 0),
    totalTasks: Number(order?.totalTasks || 0),
    pendingTasks: Number(order?.pendingTasks || 0),
    completedTasks: Number(order?.completedTasks || 0),
    noAnswerTasks: Number(order?.noAnswerTasks || 0),

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
  };
}

async function createWorkOrderForCandidate(input: {
  candidate: ScheduleCandidate;
  scheduledEmployees: ScheduledEmployee[];
  dateKey: string;
}) {
  const { candidate, scheduledEmployees, dateKey } = input;

  const invitationObjectId = toObjectId(candidate.invitation?._id);

  if (!invitationObjectId) {
    return {
      status: "skipped",
      reason: "INVITATION_ID_INVALID",
      round: candidate.round,
    };
  }

  const existing = await CallWorkOrder.findOne({
    invitationId: invitationObjectId,
    type: "rsvp_calls",
    round: candidate.round,
    workDate: {
      $gte: startOfDateKey(dateKey),
      $lte: endOfDateKey(dateKey),
    },
  }).lean();

  if (existing) {
    return {
      status: "exists",
      reason: "WORK_ORDER_ALREADY_EXISTS",
      round: candidate.round,
      workOrder: serializeWorkOrder(existing),
    };
  }

  if (!scheduledEmployees.length) {
    return {
      status: "skipped",
      reason: "NO_EMPLOYEES_SCHEDULED",
      round: candidate.round,
    };
  }

  const guestsForRound = await loadGuestsForRound({
    invitation: candidate.invitation,
    round: candidate.round,
    dateKey,
  });

  if (!guestsForRound.length) {
    return {
      status: "skipped",
      reason:
        candidate.round === 1
          ? "NO_PENDING_GUESTS_FOR_ROUND_1"
          : `NO_NO_ANSWER_GUESTS_FROM_ROUND_${candidate.round - 1}`,
      round: candidate.round,
    };
  }

  const ownerObjectId =
    toObjectId(getOwnerIdFromInvitation(candidate.invitation)) ||
    toObjectId(candidate.clientUser?._id);

  const clientName = getClientName(candidate.invitation, candidate.clientUser);
  const clientEmail = getClientEmail(candidate.invitation, candidate.clientUser);
  const eventName = getEventName(candidate.invitation);
  const eventDate = getEventDate(candidate.invitation);

  const now = new Date();
  const workDate = startOfDateKey(dateKey);
  const autoOpenAt = autoOpenAtForDateKey(dateKey);
  const sourceAudience = getSourceAudienceByRound(candidate.round);

  const assignedEmployeeIds = scheduledEmployees.map(
    (employee) => employee.employeeId
  );

  const assignedShiftIds = scheduledEmployees
    .map((employee) => employee.shiftId)
    .filter(Boolean) as Types.ObjectId[];

  let workOrder: any = null;

  try {
    workOrder = await CallWorkOrder.create({
      type: "rsvp_calls",

      invitationId: invitationObjectId,
      userId: ownerObjectId || null,
      clientUserId: ownerObjectId || null,

      clientName,
      clientEmail,
      eventName,
      eventDate,

      round: candidate.round,
      sourceAudience,

      workDate,
      configuredRoundAt: candidate.configuredRoundAt,
      autoOpenAt,
      autoOpenHour: AUTO_OPEN_HOUR,
      timezone: TIMEZONE,

      title: getRoundTitle({
        clientName,
        clientEmail,
        round: candidate.round,
      }),

      description: getRoundDescription(candidate.round),

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
      wrongNumberTasks: 0,
      unassignedTasks: 0,

      createdBy: "system",
      createdByUserId: null,

      lastDistributedAt: now,
      notes: `נפתח אוטומטית לפי סבב ${candidate.round} מתאריך ${dateKey}`,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const duplicate = await CallWorkOrder.findOne({
        invitationId: invitationObjectId,
        type: "rsvp_calls",
        round: candidate.round,
        workDate: {
          $gte: startOfDateKey(dateKey),
          $lte: endOfDateKey(dateKey),
        },
      }).lean();

      return {
        status: "exists",
        reason: "WORK_ORDER_ALREADY_EXISTS",
        round: candidate.round,
        workOrder: duplicate ? serializeWorkOrder(duplicate) : null,
      };
    }

    throw error;
  }

  const workOrderId = workOrder._id as Types.ObjectId;

  const distribution: Record<string, number> = {};

  const taskDocs = guestsForRound
    .map((guest: any, index: number) => {
      const guestObjectId = toObjectId(guest?._id);

      if (!guestObjectId) return null;

      const assignedEmployee =
        scheduledEmployees[index % scheduledEmployees.length];

      const employeeKey = assignedEmployee?.employeeIdString || "unassigned";
      distribution[employeeKey] = Number(distribution[employeeKey] || 0) + 1;

      return {
        type: "rsvp_call",

        workOrderId,
        invitationId: invitationObjectId,
        guestId: guestObjectId,

        assignedToEmployeeId: assignedEmployee?.employeeId || null,
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
          cleanStr(guest?.relation),
        guestSide: cleanStr(guest?.side),
        guestTable:
          cleanStr(guest?.tableName) ||
          cleanStr(guest?.tableNumber) ||
          cleanStr(guest?.table),
        guestNotes: cleanStr(guest?.notes || guest?.note),

        round: candidate.round,
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
        attendingCount: getAttendingCount(guest),

        note: "",
        adminNote: "",
      };
    })
    .filter(Boolean);

  try {
    await CallTask.insertMany(taskDocs, {
      ordered: true,
    });
  } catch (error) {
    await CallTask.deleteMany({
      workOrderId,
    });

    await CallWorkOrder.deleteOne({
      _id: workOrderId,
    });

    throw error;
  }

  const freshWorkOrder = await CallWorkOrder.findById(workOrderId).lean();

  return {
    status: "created",
    reason: "WORK_ORDER_CREATED",
    round: candidate.round,
    totalTasks: taskDocs.length,
    employeesCount: scheduledEmployees.length,
    distribution,
    workOrder: serializeWorkOrder(freshWorkOrder),
  };
}

/* ============================================================
   Main handler
============================================================ */

async function parseBody(req: NextRequest) {
  if (req.method === "GET") return {};

  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function handleAutoOpen(req: NextRequest) {
  try {
    await db();

    const auth = await requireAdminOrCron(req);

    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(req.url);
    const body = await parseBody(req);

    const dateKey = normalizeDateKey(
      url.searchParams.get("date") || body?.date || body?.workDate
    );

    const force =
      url.searchParams.get("force") === "1" ||
      url.searchParams.get("force") === "true" ||
      body?.force === true;

    const maxCandidates = Math.min(
      500,
      Math.max(
        1,
        Number(url.searchParams.get("limit") || body?.limit || 200)
      )
    );

    const todayKey = getDateKeyInIsrael(new Date());
    const currentIsraelHour = getIsraelHour(new Date());

    /**
     * לא לפתוח לפני 08:00 בבוקר, אלא אם force=true.
     * ככה גם אם Cron רץ מוקדם מדי בגלל שעון חורף/קיץ - לא ייפתח לפני הזמן.
     */
    if (!force && dateKey === todayKey && currentIsraelHour < AUTO_OPEN_HOUR) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "NOT_TIME_YET",
        message: "עדיין לפני 08:00 לפי שעון ישראל",
        dateKey,
        currentIsraelHour,
      });
    }

    const scheduledEmployees = await loadScheduledEmployeesForDate(dateKey);

    if (!scheduledEmployees.length) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "NO_EMPLOYEES_SCHEDULED",
        message:
          "אין עובדים משובצים לתאריך הזה, לכן לא נפתחו הוראות עבודה אוטומטיות",
        dateKey,
        employees: [],
      });
    }

    const candidates = await loadScheduleCandidates(dateKey, maxCandidates);

    if (!candidates.length) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "NO_SCHEDULED_ROUNDS_FOR_DATE",
        message: "לא נמצאו סבבי שיחות שמוגדרים לתאריך הזה",
        dateKey,
        employeesCount: scheduledEmployees.length,
      });
    }

    const results = [];

    for (const candidate of candidates) {
      try {
        const result = await createWorkOrderForCandidate({
          candidate,
          scheduledEmployees,
          dateKey,
        });

        results.push({
          ...result,
          clientName: getClientName(candidate.invitation, candidate.clientUser),
          clientEmail: getClientEmail(
            candidate.invitation,
            candidate.clientUser
          ),
          eventName: getEventName(candidate.invitation),
          invitationId: extractIdString(candidate.invitation?._id),
          scheduleSource: candidate.scheduleSource,
          configuredRoundAt: candidate.configuredRoundAt,
        });
      } catch (error: any) {
        console.error("AUTO OPEN CANDIDATE FAILED:", error);

        results.push({
          status: "error",
          reason: error?.message || "CREATE_WORK_ORDER_FAILED",
          round: candidate.round,
          clientName: getClientName(candidate.invitation, candidate.clientUser),
          clientEmail: getClientEmail(
            candidate.invitation,
            candidate.clientUser
          ),
          eventName: getEventName(candidate.invitation),
          invitationId: extractIdString(candidate.invitation?._id),
          scheduleSource: candidate.scheduleSource,
          configuredRoundAt: candidate.configuredRoundAt,
        });
      }
    }

    const created = results.filter((item) => item.status === "created");
    const existing = results.filter((item) => item.status === "exists");
    const skipped = results.filter((item) => item.status === "skipped");
    const errors = results.filter((item) => item.status === "error");

    return NextResponse.json({
      success: errors.length === 0,
      dateKey,
      openedAtHour: AUTO_OPEN_HOUR,
      timezone: TIMEZONE,

      employeesCount: scheduledEmployees.length,
      employees: scheduledEmployees.map((employee) => ({
        employeeId: employee.employeeIdString,
        name: employee.employeeName,
        email: employee.employeeEmail,
        phone: employee.employeePhone,
        shiftId: employee.shiftId ? String(employee.shiftId) : "",
      })),

      totalCandidates: candidates.length,
      createdCount: created.length,
      existingCount: existing.length,
      skippedCount: skipped.length,
      errorCount: errors.length,

      results,
    });
  } catch (error: any) {
    console.error("AUTO OPEN CALL WORK ORDERS FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בפתיחת הוראות עבודה אוטומטיות",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   Routes
============================================================ */

export async function GET(req: NextRequest) {
  return handleAutoOpen(req);
}

export async function POST(req: NextRequest) {
  return handleAutoOpen(req);
}