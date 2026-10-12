import mongoose from "mongoose";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import ScheduledMessage from "@/models/ScheduledMessage";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { isPlaceholderEventTime } from "@/lib/eventDetails/centralEventDetails";
import { normalizeClockTime } from "@/lib/seatingSchedule";
import { wallTimeInZoneToUtc } from "@/lib/weddingChallenges/timezone";
import {
  hasActiveVenueSeatingUpsell,
  israelCalendarDate,
  isVenueSeatingEventCancelled,
  resolveEventStart,
} from "@/lib/venueSeatingContacts/logic";
import {
  classifyEventDetailChanges,
  planBalanceDue,
  planCallNotStarted,
  planCriticalMissing,
  planDetailsCompleted,
  planEventDetailChange,
  planEventSummary,
  planMessageNotStarted,
  planNewCustomer,
  planSeatingIncomplete,
  planSeatingTeamMissing,
  planShiftEnded,
  planShiftNotStarted,
  planTaskCompleted,
  planTeamAssigned,
  planVenueSeatingBriefingNotice,
  seatingTeamGap,
  type AdminIncident,
} from "@/lib/customerNotifications/adminCenter";
import {
  createCustomerNotification,
  resolveAdminIncident,
} from "@/lib/customerNotifications/service";
import CustomerNotification from "@/models/CustomerNotification";

type AdminUserRow = {
  _id: mongoose.Types.ObjectId;
  salesUpsells?: {
    venueSeating?: { enabled?: boolean; staffCount?: number };
    digitalSeating?: { enabled?: boolean };
  };
  venueSeatingService?: { enabled?: boolean };
  includeDigitalSeating?: boolean;
  remainingAmount?: number;
  paymentMode?: string;
  callsType?: string;
  includeCalls?: boolean;
  callRoundsSchedule?: {
    enabled?: boolean;
    rounds?: Array<{
      roundNumber?: number;
      scheduledAt?: Date | string | null;
      status?: string;
    }>;
  };
  name?: string;
};

async function loadAdminIds() {
  const admins = await User.find({ role: "admin", isActive: { $ne: false } })
    .select("_id")
    .limit(25)
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>();
  return admins.map((admin) => String(admin._id));
}

export async function publishAdminIncident(notice: AdminIncident, adminIds?: string[]) {
  const admins = adminIds || (await loadAdminIds());
  let created = 0;
  for (const adminId of admins) {
    const result = await createCustomerNotification({
      userId: adminId,
      eventId: notice.eventId || null,
      customerId: notice.customerId || null,
      audience: "admin",
      type: notice.type,
      category: notice.category,
      severity: notice.severity,
      title: notice.title,
      body: notice.body,
      actionHref: notice.actionHref,
      dedupeKey: `${notice.incidentKey}:admin:${adminId}`,
      reopenResolved: notice.reopen,
      meta: {
        incidentKey: notice.incidentKey,
        eventTitle: notice.eventTitle || "",
      },
    });
    if (result.created) created += 1;
  }
  return { created };
}

export async function recordVenueSeatingBriefingDelivery(input: {
  eventId: string;
  eventTitle: string;
  customerId?: string | null;
  recipientId: string;
  recipientRole?: string | null;
  kind: "automatic" | "manual" | string;
  ok: boolean;
  attemptAt: string;
}) {
  const notice = planVenueSeatingBriefingNotice(input);
  if (!notice) return { created: 0 };
  return publishAdminIncident(notice);
}

async function publishQuiet(notice: AdminIncident | null, adminIds: string[]) {
  if (!notice) return;
  try {
    await publishAdminIncident(notice, adminIds);
  } catch (error) {
    console.error("admin notice failed", error);
  }
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function idList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function collection(name: string) {
  return mongoose.connection.db?.collection(name) || null;
}

function shiftStartInstant(dateKey: string, clock: string) {
  const time = normalizeClockTime(clock);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !time) return null;
  return wallTimeInZoneToUtc(`${dateKey}T${time}`);
}

function hallMatches(shift: Record<string, unknown>, event: { venueHallName?: string; location?: { name?: string; address?: string } | null }) {
  if (String(shift.locationType || "") !== "hall") return false;
  const hall = String(event.venueHallName || event.location?.name || event.location?.address || "")
    .trim()
    .toLowerCase();
  if (hall.length < 3) return false;
  const place = `${shift.locationName || ""} ${shift.locationAddress || ""} ${shift.shiftLabel || ""}`
    .trim()
    .toLowerCase();
  return place.includes(hall);
}

async function resolveOpenOfType(type: string, keep: Set<string>, reason: string) {
  const rows = await CustomerNotification.find({
    audience: "admin",
    status: "active",
    type,
  })
    .select("meta")
    .limit(300)
    .lean<Array<{ meta?: { incidentKey?: string } }>>();
  const keys = new Set(
    rows.map((row) => String(row.meta?.incidentKey || "")).filter(Boolean)
  );
  let updated = 0;
  for (const key of keys) {
    if (keep.has(key)) continue;
    const result = await resolveAdminIncident(key, reason);
    updated += result.updated;
  }
  return updated;
}

async function scanLateMessages(now: Date, adminIds: string[]) {
  const from = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const due = new Date(now.getTime() - 15 * 60 * 1000);
  const rows = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $gte: from, $lte: due },
  })
    .select("_id channel round roundNumber userId invitationId scheduledAt")
    .limit(200)
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        channel?: "sms" | "whatsapp";
        round?: number;
        roundNumber?: number;
        userId?: mongoose.Types.ObjectId;
        invitationId?: mongoose.Types.ObjectId;
        scheduledAt?: Date;
      }>
    >();
  const invitationIds = rows
    .map((row) => row.invitationId)
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
  const invitations = invitationIds.length
    ? await Invitation.find({ _id: { $in: invitationIds } })
        .select("title eventId")
        .lean<Array<{ _id: mongoose.Types.ObjectId; title?: string; eventId?: mongoose.Types.ObjectId }>>()
    : [];
  const byInvitation = new Map(invitations.map((item) => [String(item._id), item]));
  const keep = new Set<string>();
  for (const row of rows) {
    const invitation = byInvitation.get(String(row.invitationId || ""));
    const notice = planMessageNotStarted({
      scheduleId: String(row._id),
      channel: row.channel === "sms" ? "sms" : "whatsapp",
      round: Number(row.round || row.roundNumber || 0) || null,
      eventTitle: invitation?.title || "",
      status: "scheduled",
      scheduledAt: asDate(row.scheduledAt),
      now,
      eventId: invitation?.eventId ? String(invitation.eventId) : null,
      customerId: row.userId ? String(row.userId) : null,
    });
    if (!notice) continue;
    keep.add(notice.incidentKey);
    await publishQuiet(notice, adminIds);
  }
  return resolveOpenOfType("admin.message.notStarted", keep, "round-started");
}

async function scanLateCalls(now: Date, adminIds: string[]) {
  const from = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const due = new Date(now.getTime() - 15 * 60 * 1000);
  const users = await User.find({
    includeCalls: true,
    "callRoundsSchedule.enabled": true,
    "callRoundsSchedule.rounds.scheduledAt": { $gte: from, $lte: due },
  })
    .select("_id callsType includeCalls callRoundsSchedule")
    .limit(200)
    .lean<AdminUserRow[]>();
  const userIds = users.map((user) => user._id);
  const events = userIds.length
    ? await Event.find({
        userId: { $in: userIds },
        status: { $nin: ["archived", "cancelled"] },
      })
        .select("userId title date")
        .sort({ date: 1 })
        .limit(400)
        .lean<Array<{ userId?: mongoose.Types.ObjectId; title?: string; _id: mongoose.Types.ObjectId }>>()
    : [];
  const eventByUser = new Map<string, { id: string; title: string }>();
  for (const event of events) {
    const key = String(event.userId || "");
    if (!eventByUser.has(key)) eventByUser.set(key, { id: String(event._id), title: event.title || "" });
  }
  const keep = new Set<string>();
  for (const user of users) {
    const linked = eventByUser.get(String(user._id));
    for (const round of user.callRoundsSchedule?.rounds || []) {
      const roundNumber = Number(round.roundNumber || 0);
      if (roundNumber < 1) continue;
      const scheduledAt = asDate(round.scheduledAt);
      const notice = planCallNotStarted({
        userId: String(user._id),
        round: roundNumber,
        scheduledAt,
        status: String(round.status || ""),
        ivr: isIvrCallsUser(user),
        eventTitle: linked?.title || "",
        now,
        eventId: linked?.id || null,
      });
      if (!notice) continue;
      keep.add(notice.incidentKey);
      await publishQuiet(notice, adminIds);
    }
  }
  return resolveOpenOfType("admin.call.notStarted", keep, "round-started");
}

async function scanLateShifts(now: Date, adminIds: string[]) {
  const shifts = collection("employeeshifts");
  const sessions = collection("softphoneworksessions");
  if (!shifts || !sessions) return 0;
  const today = israelCalendarDate(now);
  const dayStart = wallTimeInZoneToUtc(`${today}T00:00`);
  const rows = await shifts.find({ date: today }).limit(300).toArray();
  const started = await sessions
    .find({ startedAt: { $gte: dayStart, $lte: now } })
    .project({ employeeId: 1, employeeIdString: 1, employeeObjectId: 1 })
    .limit(500)
    .toArray();
  const startedIds = new Set<string>();
  for (const session of started) {
    for (const value of [session.employeeId, session.employeeIdString, session.employeeObjectId]) {
      const id = String(value || "").trim();
      if (id) startedIds.add(id);
    }
  }
  const keep = new Set<string>();
  for (const shift of rows) {
    const employeeId = String(shift.employeeIdString || shift.employeeId || "").trim();
    if (!employeeId) continue;
    const notice = planShiftNotStarted({
      employeeId,
      employeeName: String(shift.employeeName || ""),
      dateKey: today,
      todayKey: today,
      shiftStart: shiftStartInstant(today, String(shift.scheduledStart || shift.startTime || "")),
      hasStartedSession: startedIds.has(employeeId),
      now,
      status: String(shift.status || shift.shiftStatus || ""),
      cancelled: shift.cancelled === true || shift.isCancelled === true,
      postponed: shift.postponed === true || shift.isPostponed === true,
      completed: shift.completed === true || shift.isCompleted === true || Boolean(shift.completedAt),
    });
    if (!notice) continue;
    keep.add(notice.incidentKey);
    await publishQuiet(notice, adminIds);
  }
  await resolveStaleTodayShiftIncidents(today, keep);
  return rows.length;
}

async function resolveStaleTodayShiftIncidents(today: string, keep: Set<string>) {
  const rows = await CustomerNotification.find({
    audience: "admin",
    status: "active",
    type: "admin.shift.notStarted",
  })
    .select("meta")
    .limit(300)
    .lean<Array<{ meta?: { incidentKey?: string } }>>();
  for (const row of rows) {
    const key = String(row.meta?.incidentKey || "");
    if (!key.endsWith(`:${today}`) || keep.has(key)) continue;
    await resolveAdminIncident(key, "shift-not-active");
  }
}

function countSeated(tables: unknown) {
  if (!Array.isArray(tables)) return { tables: 0, seated: 0 };
  let seated = 0;
  for (const table of tables) {
    const guests = (table as { seatedGuests?: unknown })?.seatedGuests;
    if (Array.isArray(guests)) seated += guests.length;
  }
  return { tables: tables.length, seated };
}

async function seatingSnapshot(eventId: string) {
  const tables = collection("seatingtables");
  if (!tables || !mongoose.Types.ObjectId.isValid(eventId)) {
    return { totalTables: 0, seatedGuests: 0 };
  }
  const oid = new mongoose.Types.ObjectId(eventId);
  const docs = await tables
    .find({
      $or: [
        { eventId: oid },
        { eventId },
        { productionEventId: oid },
        { linkedEventId: oid },
      ],
    })
    .limit(20)
    .toArray();
  let totalTables = 0;
  let seatedGuests = 0;
  for (const doc of docs) {
    const counted = countSeated(doc.tables);
    totalTables += counted.tables;
    seatedGuests += counted.seated;
  }
  return { totalTables, seatedGuests };
}

async function scanEvents(now: Date, adminIds: string[]) {
  const yesterday = israelCalendarDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const until = israelCalendarDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
  const events = await Event.find({
    date: { $gte: yesterday, $lte: until },
    status: { $nin: ["archived", "cancelled"] },
  })
    .select(
      "userId title date time receptionTime location venueHallName status paymentStatus assignedStaffIds maxGuests"
    )
    .limit(400)
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        userId?: mongoose.Types.ObjectId;
        title?: string;
        date?: string;
        time?: string;
        receptionTime?: string;
        venueHallName?: string;
        location?: { name?: string; address?: string; formattedAddress?: string; placeName?: string; wazeUrl?: string; lat?: number; lng?: number };
        status?: string;
        paymentStatus?: string;
        assignedStaffIds?: mongoose.Types.ObjectId[];
        maxGuests?: number;
      }>
    >();
  const userIds = events
    .map((event) => event.userId)
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select(
          "salesUpsells.venueSeating salesUpsells.digitalSeating venueSeatingService includeDigitalSeating remainingAmount paymentMode"
        )
        .lean<AdminUserRow[]>()
    : [];
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const shifts = collection("employeeshifts");
  const dates = [...new Set(events.map((event) => String(event.date || "")).filter(Boolean))];
  const shiftRows = shifts && dates.length
    ? await shifts.find({ date: { $in: dates }, locationType: "hall" }).limit(500).toArray()
    : [];
  const balanceKept = new Set<string>();
  const balanceSeen = new Set<string>();

  for (const event of events) {
    const userId = event.userId ? String(event.userId) : "";
    const user = userById.get(userId);
    const cancelled = isVenueSeatingEventCancelled(event);
    const start = resolveEventStart(event);
    const hours = start ? (start.getTime() - now.getTime()) / (60 * 60 * 1000) : null;
    const missingLocation = ![
      event.venueHallName,
      event.location?.name,
      event.location?.address,
      event.location?.formattedAddress,
      event.location?.placeName,
      event.location?.wazeUrl,
      Number.isFinite(Number(event.location?.lat)) && Number.isFinite(Number(event.location?.lng)) ? "1" : "",
    ].some((value) => String(value || "").trim());
    const missingTime =
      isPlaceholderEventTime(event.time) && isPlaceholderEventTime(event.receptionTime);
    const venueSeating = hasActiveVenueSeatingUpsell(user || null);
    const seatingEnabled = Boolean(
      venueSeating || user?.includeDigitalSeating || user?.salesUpsells?.digitalSeating?.enabled
    );

    const critical = planCriticalMissing({
      eventId: String(event._id),
      title: event.title || "",
      start,
      now,
      cancelled,
      missingLocation,
      missingTime,
      customerId: userId,
    });
    if (critical) {
      await publishQuiet(critical, adminIds);
    } else if (start && start.getTime() > now.getTime() && !missingLocation && !missingTime) {
      const resolved = await resolveAdminIncident(`critical-missing:${event._id}`, "details-completed");
      if (resolved.updated > 0) {
        await publishQuiet(
          planDetailsCompleted({
            eventId: String(event._id),
            title: event.title || "",
            customerId: userId,
          }),
          adminIds
        );
      }
    } else if (!start || start.getTime() <= now.getTime() || cancelled) {
      await resolveAdminIncident(`critical-missing:${event._id}`, "event-passed");
    }

    const hallIds = shiftRows
      .filter((shift) => String(shift.date || "") === String(event.date || "") && hallMatches(shift, event))
      .map((shift) => String(shift.employeeIdString || shift.employeeId || ""));
    const required = venueSeating
      ? Math.max(1, Number(user?.salesUpsells?.venueSeating?.staffCount || 0))
      : 0;
    const team = planSeatingTeamMissing({
      eventId: String(event._id),
      title: event.title || "",
      start,
      now,
      cancelled,
      venueSeating,
      requiredStaff: required,
      assignedStaffIds: idList(event.assignedStaffIds),
      hallShiftEmployeeIds: hallIds,
      customerId: userId,
    });
    if (team) {
      await publishQuiet(team, adminIds);
    } else if (venueSeating && hours != null && hours > 0 && hours <= 24) {
      const resolved = await resolveAdminIncident(`seating-team:${event._id}`, "team-assigned");
      if (resolved.updated > 0) {
        await publishQuiet(
          planTeamAssigned({
            eventId: String(event._id),
            title: event.title || "",
            customerId: userId,
          }),
          adminIds
        );
      }
    } else if (hours != null && hours <= 0) {
      await resolveAdminIncident(`seating-team:${event._id}`, "event-passed");
    }

    if (hours != null && hours > 0 && hours <= 24 && seatingEnabled) {
      const snapshot = await seatingSnapshot(String(event._id));
      const invitation = await Invitation.findOne({ eventId: event._id }).select("_id").lean<{ _id: mongoose.Types.ObjectId }>();
      const confirmedGuests = invitation
        ? await InvitationGuest.countDocuments({ invitationId: invitation._id, status: "yes" })
        : 0;
      const incomplete = planSeatingIncomplete({
        eventId: String(event._id),
        title: event.title || "",
        hoursUntil: hours,
        venueSeating,
        seatingEnabled,
        totalTables: snapshot.totalTables,
        seatedGuests: snapshot.seatedGuests,
        confirmedGuests,
        customerId: userId,
      });
      if (incomplete) await publishQuiet(incomplete, adminIds);
      else await resolveAdminIncident(`seating-incomplete:${event._id}`, "seating-completed");
    } else if (hours != null && hours <= 0) {
      await resolveAdminIncident(`seating-incomplete:${event._id}`, "event-passed");
    }

    if (userId && hours != null && hours > 0) balanceSeen.add(userId);
    const balance = planBalanceDue({
      userId,
      eventId: String(event._id),
      title: event.title || "",
      hoursUntil: hours,
      remainingAmount: Number(user?.remainingAmount || 0),
      paymentMode: String(user?.paymentMode || ""),
      cancelled,
    });
    if (balance) {
      balanceKept.add(userId);
      await publishQuiet(balance, adminIds);
    }

    const summary = planEventSummary({
      eventId: String(event._id),
      title: event.title || "",
      start,
      now,
      cancelled,
      hasClock: !missingTime,
      customerId: userId,
    });
    await publishQuiet(summary, adminIds);
  }

  for (const userId of balanceSeen) {
    if (!balanceKept.has(userId)) {
      await resolveAdminIncident(`balance-due:${userId}`, "balance-cleared");
    }
  }
  return events.length;
}

export async function processAdminOperationalNotifications(now = new Date()) {
  const adminIds = await loadAdminIds();
  const result = { messages: 0, calls: 0, shifts: 0, events: 0 };
  try {
    result.messages = await scanLateMessages(now, adminIds);
  } catch (error) {
    console.error("admin late messages failed", error);
  }
  try {
    result.calls = await scanLateCalls(now, adminIds);
  } catch (error) {
    console.error("admin late calls failed", error);
  }
  try {
    result.shifts = await scanLateShifts(now, adminIds);
  } catch (error) {
    console.error("admin late shifts failed", error);
  }
  try {
    result.events = await scanEvents(now, adminIds);
  } catch (error) {
    console.error("admin event notices failed", error);
  }
  return result;
}

export async function recordNewCustomer(input: { customerId: string; name: string; role?: string }) {
  if (input.role && input.role !== "user" && input.role !== "client") return;
  if (!mongoose.Types.ObjectId.isValid(input.customerId)) return;
  await publishQuiet(planNewCustomer(input), await loadAdminIds());
}

export async function recordEmployeeShiftEnded(input: {
  employeeId: string;
  employeeName?: string;
  endedAt: Date;
}) {
  if (!input.employeeId) return;
  let name = String(input.employeeName || "").trim();
  if (!name && mongoose.Types.ObjectId.isValid(input.employeeId)) {
    const user = await User.findById(input.employeeId).select("name").lean<{ name?: string }>();
    name = String(user?.name || "").trim();
  }
  await publishQuiet(
    planShiftEnded({
      employeeId: input.employeeId,
      employeeName: name,
      dateKey: israelCalendarDate(input.endedAt),
    }),
    await loadAdminIds()
  );
}

export async function recordOperationalTaskCompleted(input: {
  taskId: string;
  title: string;
  eventId?: string | null;
  customerId?: string | null;
}) {
  if (!mongoose.Types.ObjectId.isValid(input.taskId)) return;
  let eventTitle = "";
  let customerId = input.customerId || null;
  if (input.eventId && mongoose.Types.ObjectId.isValid(input.eventId)) {
    const event = await Event.findById(input.eventId)
      .select("title userId date")
      .lean<{ title?: string; userId?: mongoose.Types.ObjectId; date?: string }>();
    eventTitle = event?.title || "";
    customerId = customerId || (event?.userId ? String(event.userId) : null);
    const today = israelCalendarDate(new Date());
    if (event?.date && event.date < today) return;
  }
  await publishQuiet(
    planTaskCompleted({
      taskId: input.taskId,
      title: input.title,
      eventTitle,
      eventId: input.eventId,
      customerId,
    }),
    await loadAdminIds()
  );
}

export async function recordEventDetailDiff(input: {
  before: Record<string, unknown> | null | undefined;
  after: Record<string, unknown> | null | undefined;
  eventId?: string | null;
  customerId?: string | null;
  now?: Date;
}) {
  const eventId = String(input.eventId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(eventId)) return;
  const now = input.now || new Date();
  const classified = classifyEventDetailChanges(input.before, input.after);
  const after = input.after || {};
  const dateKey = String(after.eventDate || after.date || "").slice(0, 10);
  const upcoming = Boolean(dateKey && dateKey >= israelCalendarDate(now));
  const title = String(after.title || input.before?.title || "");
  const adminIds = await loadAdminIds();
  if (classified.significant.length) {
    await publishQuiet(
      planEventDetailChange({
        eventId,
        title,
        fields: classified.significant,
        hourBucket: now.toISOString().slice(0, 13),
        upcoming,
        customerId: input.customerId,
      }),
      adminIds
    );
  }
  if (classified.completed.length && upcoming) {
    await publishQuiet(
      planDetailsCompleted({ eventId, title, customerId: input.customerId }),
      adminIds
    );
  }
}

export async function recordSeatingTeamIfCovered(input: {
  eventId: string;
  assignedStaffIds?: string[];
  hallShiftEmployeeIds?: string[];
}) {
  if (!mongoose.Types.ObjectId.isValid(input.eventId)) return;
  const event = await Event.findById(input.eventId)
    .select("userId title date time receptionTime status paymentStatus assignedStaffIds venueHallName")
    .lean<{
      userId?: mongoose.Types.ObjectId;
      title?: string;
      date?: string;
      time?: string;
      receptionTime?: string;
      status?: string;
      paymentStatus?: string;
      assignedStaffIds?: mongoose.Types.ObjectId[];
      venueHallName?: string;
    }>();
  if (!event?.userId) return;
  const start = resolveEventStart(event);
  if (!start || start.getTime() <= Date.now()) return;
  if (isVenueSeatingEventCancelled(event)) return;
  const user = await User.findById(event.userId)
    .select("salesUpsells.venueSeating venueSeatingService")
    .lean<AdminUserRow>();
  if (!hasActiveVenueSeatingUpsell(user || null)) return;
  const required = Math.max(1, Number(user?.salesUpsells?.venueSeating?.staffCount || 0));
  const gap = seatingTeamGap({
    requiredStaff: required,
    assignedStaffIds: input.assignedStaffIds || idList(event.assignedStaffIds),
    hallShiftEmployeeIds: input.hallShiftEmployeeIds || [],
  });
  if (gap.short) return;
  await publishQuiet(
    planTeamAssigned({
      eventId: input.eventId,
      title: event.title || "",
      customerId: String(event.userId),
    }),
    await loadAdminIds()
  );
}

export async function recordHallShiftAssigned(input: {
  date: string;
  locationType: string;
  locationName: string;
  locationAddress: string;
  employeeId: string;
}) {
  if (input.locationType !== "hall" || !input.date) return;
  const events = await Event.find({
    date: input.date,
    status: { $nin: ["archived", "cancelled"] },
  })
    .select("_id venueHallName location")
    .limit(30)
    .lean<Array<{ _id: mongoose.Types.ObjectId; venueHallName?: string; location?: { name?: string; address?: string } }>>();
  const shifts = collection("employeeshifts");
  const dayShifts = shifts
    ? await shifts.find({ date: input.date, locationType: "hall" }).limit(200).toArray()
    : [];
  for (const event of events) {
    const matched = dayShifts.filter((shift) => hallMatches(shift, event));
    if (!matched.some((shift) => String(shift.employeeIdString || shift.employeeId || "") === input.employeeId) &&
      !hallMatches(
        {
          locationType: "hall",
          locationName: input.locationName,
          locationAddress: input.locationAddress,
        },
        event
      )
    ) {
      continue;
    }
    await recordSeatingTeamIfCovered({
      eventId: String(event._id),
      hallShiftEmployeeIds: matched.map((shift) => String(shift.employeeIdString || shift.employeeId || "")),
    });
  }
}
