import mongoose from "mongoose";
import Event from "@/models/Event";
import User from "@/models/User";
import HallSeatingContact from "@/models/HallSeatingContact";
import HallSeatingReminderLog from "@/models/HallSeatingReminderLog";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { sendSmsDetailed } from "@/lib/sendSMS";
import { customerNotificationsEnabled } from "@/lib/customerNotifications/featureFlag";
import { shortenUrl } from "@/lib/shortenUrl";
import {
  createCustomerNotification,
  resolveVenueSeatingNotifications,
} from "@/lib/customerNotifications/service";
import { ensureVenueSeatingHolidayCalendar } from "@/lib/venueSeatingContacts/smsSchedule";
import {
  VENUE_SEATING_NOTIFICATION_CATEGORY,
  buildVenueSeatingUrgentSms,
  classifyEventAccess,
  completionStatus,
  contactsActionHref,
  eventStartKey,
  hasActiveVenueSeatingUpsell,
  hoursUntil,
  isLateCompletion,
  notificationCopy,
  notificationDedupeKey,
  planVenueSeatingReminders,
  resolveEventStart,
  shouldShowNotificationBell,
  showMissingContactsAlert,
  validateVenueSeatingContacts,
  type ContactDraft,
  type EventTimingInput,
  type ReminderChannel,
  type ReminderStage,
} from "@/lib/venueSeatingContacts/logic";

const RECENT_PAST_MS = 14 * 24 * 60 * 60 * 1000;
const SENDING_STALE_MS = 2 * 60 * 1000;

type LeanUser = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  phone?: string;
  salesUpsells?: {
    venueSeating?: { enabled?: boolean };
  };
  venueSeatingService?: { enabled?: boolean };
  assignedStaffIds?: mongoose.Types.ObjectId[];
  assignedClientIds?: mongoose.Types.ObjectId[];
};

type LeanEvent = EventTimingInput & {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  title?: string;
  assignedStaffIds?: mongoose.Types.ObjectId[];
};

function idString(value: unknown) {
  return value ? String(value) : "";
}

function appBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.invistimo.com"
  ).replace(/\/+$/, "");
}

async function customerLink(eventId: string) {
  const path = contactsActionHref(eventId);
  const absolute = `${appBase()}${path}`;
  try {
    return await shortenUrl(absolute);
  } catch {
    return absolute;
  }
}

export async function loadOwnedEvent(eventId: string, userId: string) {
  if (
    !mongoose.Types.ObjectId.isValid(eventId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return null;
  }
  const event = await Event.findOne({
    _id: eventId,
    userId,
  }).lean<LeanEvent | null>();
  return event;
}

export async function loadCustomer(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return User.findById(userId)
    .select(
      "_id name phone salesUpsells.venueSeating.enabled venueSeatingService.enabled assignedStaffIds assignedClientIds"
    )
    .lean<LeanUser | null>();
}

function contactSnapshot(doc: {
  primary?: unknown;
  secondary?: unknown;
  responsibilityAccepted?: boolean;
  responsibilityVersion?: string;
} | null) {
  if (!doc) return null;
  return {
    primary: doc.primary || null,
    secondary: doc.secondary || null,
    responsibilityAccepted: Boolean(doc.responsibilityAccepted),
    responsibilityVersion: doc.responsibilityVersion || "",
  };
}

export function serializeContact(
  doc: {
    primary?: {
      fullName?: string;
      phone?: string;
      relation?: string;
      canApproveReserves?: boolean;
    } | null;
    secondary?: {
      fullName?: string;
      phone?: string;
      relation?: string;
      canApproveReserves?: boolean;
    } | null;
    responsibilityAccepted?: boolean;
    responsibilityAcceptedAt?: Date | null;
    responsibilityAcceptedByUserId?: unknown;
    responsibilityAcceptedByName?: string;
    responsibilityVersion?: string;
    responsibilityText?: string;
    completedAt?: Date | null;
    completedLate?: boolean;
    changes?: Array<{
      at?: Date;
      byUserId?: unknown;
      byName?: string;
      summary?: string;
    }>;
    updatedAt?: Date;
  } | null,
  event: EventTimingInput,
  now: Date
) {
  const status = completionStatus({
    completedAt: doc?.completedAt,
    completedLate: doc?.completedLate,
  });
  const start = resolveEventStart(event);
  return {
    status,
    primary: doc?.primary
      ? {
          fullName: doc.primary.fullName || "",
          phone: doc.primary.phone || "",
          relation: doc.primary.relation || "",
          canApproveReserves: Boolean(doc.primary.canApproveReserves),
        }
      : null,
    secondary: doc?.secondary?.fullName
      ? {
          fullName: doc.secondary.fullName || "",
          phone: doc.secondary.phone || "",
          relation: doc.secondary.relation || "",
          canApproveReserves: Boolean(doc.secondary.canApproveReserves),
        }
      : null,
    responsibilityAccepted: Boolean(doc?.responsibilityAccepted),
    responsibilityAcceptedAt: doc?.responsibilityAcceptedAt
      ? new Date(doc.responsibilityAcceptedAt).toISOString()
      : null,
    responsibilityAcceptedByUserId: idString(doc?.responsibilityAcceptedByUserId),
    responsibilityAcceptedByName: doc?.responsibilityAcceptedByName || "",
    responsibilityVersion: doc?.responsibilityVersion || "",
    responsibilityText: doc?.responsibilityText || "",
    completedAt: doc?.completedAt ? new Date(doc.completedAt).toISOString() : null,
    completedLate: Boolean(doc?.completedLate),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    missingSoon: showMissingContactsAlert({ status, eventStart: start, now }),
    changes: (doc?.changes || []).slice(-20).reverse().map((change) => ({
      at: change.at ? new Date(change.at).toISOString() : null,
      byUserId: idString(change.byUserId),
      byName: change.byName || "",
      summary: change.summary || "",
    })),
  };
}

export async function getHallSeatingContactState(input: {
  userId: string;
  eventId: string;
  now?: Date;
}) {
  const now = input.now || new Date();
  const [user, event] = await Promise.all([
    loadCustomer(input.userId),
    loadOwnedEvent(input.eventId, input.userId),
  ]);
  if (!user || !event) {
    return { found: false as const };
  }
  const access = classifyEventAccess({ user, event, now });
  if (!access.showTab) {
    return {
      found: true as const,
      access,
      event: { id: String(event._id), title: event.title || "" },
      contact: null,
      saved: false,
    };
  }

  const doc = await HallSeatingContact.findOne({
    eventId: event._id,
    userId: user._id,
  }).lean();

  return {
    found: true as const,
    access,
    event: {
      id: String(event._id),
      title: event.title || "",
      date: event.date || "",
      time: event.time || "",
    },
    contact: serializeContact(doc, event, now),
    saved: Boolean(doc),
  };
}

export async function saveHallSeatingContacts(input: {
  userId: string;
  eventId: string;
  actorUserId: string;
  actorName: string;
  primary: ContactDraft;
  secondary?: ContactDraft | null;
  responsibilityAccepted: boolean;
  now?: Date;
}) {
  const now = input.now || new Date();
  const validated = validateVenueSeatingContacts({
    primary: input.primary,
    secondary: input.secondary,
    responsibilityAccepted: input.responsibilityAccepted,
  });
  if (!validated.ok) return { ok: false as const, status: 400, errors: validated.errors };

  const user = await loadCustomer(input.userId);
  const event = await loadOwnedEvent(input.eventId, input.userId);
  if (!user || !event) return { ok: false as const, status: 404, errors: ["האירוע לא נמצא"] };

  const access = classifyEventAccess({ user, event, now });
  if (!access.allowEdit) {
    return {
      ok: false as const,
      status: 403,
      errors: ["לא ניתן לעדכן אנשי קשר לאירוע הזה"],
    };
  }

  const existing = await HallSeatingContact.findOne({
    eventId: event._id,
    userId: user._id,
  });
  const start = resolveEventStart(event);
  const before = contactSnapshot(existing);
  const completedAt = existing?.completedAt || now;
  const completedLate = existing?.completedAt
    ? Boolean(existing.completedLate)
    : Boolean(start && isLateCompletion(start, now));

  const next = {
    primary: validated.primary,
    secondary: validated.secondary,
    responsibilityAccepted: true,
    responsibilityAcceptedAt: existing?.responsibilityAcceptedAt || now,
    responsibilityAcceptedByUserId:
      existing?.responsibilityAcceptedByUserId || input.actorUserId,
    responsibilityAcceptedByName:
      existing?.responsibilityAcceptedByName || input.actorName || "",
    responsibilityVersion: validated.responsibilityVersion,
    responsibilityText: validated.responsibilityText,
    completedAt,
    completedLate,
  };

  const change = {
    at: now,
    byUserId: input.actorUserId,
    byName: input.actorName || "",
    summary: existing ? "עדכון אנשי קשר" : "שמירת אנשי קשר",
    before,
    after: contactSnapshot({ ...next, responsibilityAccepted: true }),
  };

  if (!existing) {
    await HallSeatingContact.create({
      eventId: event._id,
      userId: user._id,
      ...next,
      changes: [change],
    });
  } else {
    existing.set(next);
    existing.changes = [...(existing.changes || []), change].slice(-50);
    await existing.save();
  }

  await resolveVenueSeatingNotifications({
    userId: String(user._id),
    eventId: String(event._id),
    reason: "contacts_completed",
  });

  const saved = await HallSeatingContact.findOne({
    eventId: event._id,
    userId: user._id,
  }).lean();

  return {
    ok: true as const,
    contact: serializeContact(saved, event, now),
  };
}

async function claimReminder(input: {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  stage: ReminderStage;
  channel: ReminderChannel;
  startKey: string;
  now: Date;
}) {
  const existing = await HallSeatingReminderLog.findOne({
    eventId: input.eventId,
    stage: input.stage,
    channel: input.channel,
    startKey: input.startKey,
  });

  if (existing) {
    if (existing.status === "sent") return null;
    if (
      existing.status === "skipped" &&
      existing.detail !== "MISSING_CUSTOMER_PHONE"
    ) {
      return null;
    }
    if (existing.status === "sending") {
      const age = input.now.getTime() - new Date(existing.updatedAt).getTime();
      const reclaimable = input.channel === "in_app" && age > SENDING_STALE_MS;
      if (!reclaimable) return null;
    }
    if (existing.status === "failed" && (!existing.retryable || existing.attempts >= 2)) {
      return null;
    }
    const claimed = await HallSeatingReminderLog.findOneAndUpdate(
      { _id: existing._id, status: existing.status },
      { $set: { status: "sending", retryable: false }, $inc: { attempts: 1 } },
      { new: true }
    );
    return claimed;
  }

  try {
    return await HallSeatingReminderLog.create({
      eventId: input.eventId,
      userId: input.userId,
      stage: input.stage,
      channel: input.channel,
      startKey: input.startKey,
      status: "sending",
      attempts: 1,
      retryable: false,
    });
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 11000) return null;
    throw error;
  }
}

async function finishReminder(
  id: mongoose.Types.ObjectId,
  patch: {
    status: "sent" | "failed" | "skipped";
    detail?: string;
    retryable?: boolean;
    smsTo?: string;
    sentAt?: Date | null;
  }
) {
  await HallSeatingReminderLog.updateOne(
    { _id: id },
    {
      $set: {
        status: patch.status,
        detail: patch.detail || "",
        retryable: Boolean(patch.retryable),
        smsTo: patch.smsTo || "",
        sentAt: patch.sentAt || null,
      },
    }
  );
}

async function deliverInApp(input: {
  user: LeanUser;
  event: LeanEvent;
  stage: ReminderStage;
  startKey: string;
  now: Date;
}) {
  const claim = await claimReminder({
    eventId: input.event._id,
    userId: input.user._id,
    stage: input.stage,
    channel: "in_app",
    startKey: input.startKey,
    now: input.now,
  });
  if (!claim) return "skipped" as const;

  const copy = notificationCopy(input.stage);
  const created = await createCustomerNotification({
    userId: String(input.user._id),
    eventId: String(input.event._id),
    type: copy.type,
    category: VENUE_SEATING_NOTIFICATION_CATEGORY,
    severity: copy.severity,
    title: copy.title,
    body: copy.body,
    actionHref: contactsActionHref(String(input.event._id)),
    dedupeKey: notificationDedupeKey({
      eventId: String(input.event._id),
      stage: input.stage,
      startKey: input.startKey,
    }),
    meta: { startKey: input.startKey, stage: input.stage },
  });

  await finishReminder(claim._id, {
    status: "sent",
    detail: created.created ? "created" : created.reason,
    sentAt: input.now,
  });
  return created.created ? ("sent" as const) : ("duplicate" as const);
}

async function deliverCustomerSms(input: {
  user: LeanUser;
  event: LeanEvent;
  startKey: string;
  now: Date;
}) {
  if (!customerNotificationsEnabled()) return "disabled" as const;
  const claim = await claimReminder({
    eventId: input.event._id,
    userId: input.user._id,
    stage: "h24",
    channel: "sms",
    startKey: input.startKey,
    now: input.now,
  });
  if (!claim) return "skipped" as const;

  const phone = String(input.user.phone || "").trim();
  if (!phone) {
    await finishReminder(claim._id, {
      status: "skipped",
      detail: "MISSING_CUSTOMER_PHONE",
    });
    return "skipped" as const;
  }

  const gate = assertExternalSendAllowed({ channel: "sms", to: phone });
  if (!gate.allowed) {
    await finishReminder(claim._id, {
      status: "skipped",
      detail: gate.reason,
      smsTo: phone,
    });
    return "skipped" as const;
  }

  const link = await customerLink(String(input.event._id));
  const message = buildVenueSeatingUrgentSms(link, {
    eventDate: eventStartKey(input.event),
  });
  const result = await sendSmsDetailed({ to: phone, message });

  if (result.ok) {
    await finishReminder(claim._id, {
      status: "sent",
      detail: result.providerStatus,
      smsTo: phone,
      sentAt: input.now,
    });
    return "sent" as const;
  }

  const neverRetry = result.outcomeUnknown || !result.retryable;
  await finishReminder(claim._id, {
    status: result.outcomeUnknown ? "sent" : "failed",
    detail: result.outcomeUnknown
      ? `OUTCOME_UNKNOWN:${result.errorCode}`
      : result.errorCode,
    retryable: result.outcomeUnknown ? false : result.retryable && !neverRetry,
    smsTo: phone,
    sentAt: result.outcomeUnknown ? input.now : null,
  });
  return result.outcomeUnknown ? ("sent" as const) : ("failed" as const);
}

async function maybeResolveStale(input: {
  user: LeanUser;
  event: LeanEvent;
  start: Date | null;
  startKey: string;
  now: Date;
  reason: string;
  dateChangedOnly?: boolean;
}) {
  if (!input.start) return;
  const age = input.now.getTime() - input.start.getTime();
  if (!input.dateChangedOnly && age > RECENT_PAST_MS) return;
  await resolveVenueSeatingNotifications({
    userId: String(input.user._id),
    eventId: String(input.event._id),
    reason: input.reason,
    startKey: input.dateChangedOnly ? input.startKey : null,
    stages: input.dateChangedOnly ? ["h72", "h24"] : undefined,
  });
}

export async function processVenueSeatingEvent(input: {
  user: LeanUser;
  event: LeanEvent;
  now?: Date;
}) {
  await ensureVenueSeatingHolidayCalendar();
  const now = input.now || new Date();
  const access = classifyEventAccess({
    user: input.user,
    event: input.event,
    now,
  });
  const start = resolveEventStart(input.event);
  const startKey = eventStartKey(input.event);

  if (!access.runAutomations || !start || !startKey) {
    if (start && start.getTime() <= now.getTime()) {
      await maybeResolveStale({
        user: input.user,
        event: input.event,
        start,
        startKey,
        now,
        reason: access.cancelled
          ? "event_cancelled"
          : access.upsellActive
            ? "event_passed"
            : "upsell_inactive",
      });
    } else if (!access.upsellActive || access.cancelled) {
      await maybeResolveStale({
        user: input.user,
        event: input.event,
        start: start || now,
        startKey,
        now,
        reason: access.cancelled ? "event_cancelled" : "upsell_inactive",
      });
    }
    return { eventId: String(input.event._id), actions: [] as string[] };
  }

  const contact = await HallSeatingContact.findOne({
    eventId: input.event._id,
    userId: input.user._id,
  })
    .select("completedAt")
    .lean();

  const logs = await HallSeatingReminderLog.find({
    eventId: input.event._id,
    startKey,
    status: { $in: ["sent", "skipped"] },
  })
    .select("stage channel sentAt status detail")
    .lean();

  const alreadySent: Array<{ stage: ReminderStage; channel: ReminderChannel }> = [];
  let initialSentAt: Date | null = null;
  for (const log of logs) {
    if (log.status === "failed") continue;
    if (log.status === "skipped" && log.detail === "MISSING_CUSTOMER_PHONE") continue;
    alreadySent.push({ stage: log.stage, channel: log.channel });
    if (log.stage === "initial" && log.channel === "in_app" && log.sentAt) {
      initialSentAt = new Date(log.sentAt);
    }
  }

  const plan = planVenueSeatingReminders({
    now,
    eventStart: start,
    eventDate: startKey,
    cancelled: access.cancelled,
    upsellActive: access.upsellActive,
    contactsComplete: Boolean(contact?.completedAt),
    alreadySent,
    initialSentAt,
  });

  if (plan.resolveActive) {
    await resolveVenueSeatingNotifications({
      userId: String(input.user._id),
      eventId: String(input.event._id),
      reason: "contacts_completed",
    });
    return { eventId: String(input.event._id), actions: ["resolved"] };
  }

  await maybeResolveStale({
    user: input.user,
    event: input.event,
    start,
    startKey,
    now,
    reason: "event_date_changed",
    dateChangedOnly: true,
  });

  const actions: string[] = [];
  for (const action of plan.actions) {
    if (action.channels.includes("in_app")) {
      const result = await deliverInApp({
        user: input.user,
        event: input.event,
        stage: action.stage,
        startKey,
        now,
      });
      actions.push(`${action.stage}:in_app:${result}`);
    }
    if (action.channels.includes("sms") && action.stage === "h24") {
      const result = await deliverCustomerSms({
        user: input.user,
        event: input.event,
        startKey,
        now,
      });
      actions.push(`h24:sms:${result}`);
    }
  }

  return { eventId: String(input.event._id), actions };
}

export async function processVenueSeatingRemindersForUser(
  userId: string,
  now = new Date()
) {
  if (!customerNotificationsEnabled()) {
    return { processed: 0, results: [] as Array<{ eventId: string; actions: string[] }>, disabled: true as const };
  }
  const user = await loadCustomer(userId);
  if (!user || !hasActiveVenueSeatingUpsell(user)) {
    return { processed: 0, results: [] as Array<{ eventId: string; actions: string[] }> };
  }
  const events = await Event.find({ userId: user._id })
    .select("_id userId title date time receptionTime status paymentStatus")
    .lean<LeanEvent[]>();

  const results = [];
  for (const event of events) {
    const start = resolveEventStart(event);
    if (start && now.getTime() - start.getTime() > RECENT_PAST_MS) continue;
    results.push(await processVenueSeatingEvent({ user, event, now }));
  }
  return { processed: results.length, results };
}

export async function processAllVenueSeatingReminders(now = new Date()) {
  if (!customerNotificationsEnabled()) {
    return { users: 0, processed: 0, results: [], disabled: true as const };
  }
  const users = await User.find({
    $or: [
      { "salesUpsells.venueSeating.enabled": true },
      { "venueSeatingService.enabled": true },
    ],
  })
    .select("_id")
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>();

  let processed = 0;
  const results: Array<{ userId: string; eventId: string; actions: string[] }> = [];
  for (const user of users) {
    const run = await processVenueSeatingRemindersForUser(String(user._id), now);
    processed += run.processed;
    for (const result of run.results) {
      if (result.actions.length) {
        results.push({ userId: String(user._id), ...result });
      }
    }
  }
  return { users: users.length, processed, results };
}

export async function customerBellEligibility(userId: string, now = new Date()) {
  const events = await Event.find({ userId })
    .select("date time receptionTime status paymentStatus")
    .lean<EventTimingInput[]>();
  return {
    showBell: shouldShowNotificationBell(events, now),
  };
}

export async function reminderHistory(eventId: string) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) return [];
  const rows = await HallSeatingReminderLog.find({ eventId })
    .sort({ createdAt: -1 })
    .lean();
  return rows.map((row) => ({
    stage: row.stage,
    channel: row.channel,
    startKey: row.startKey,
    status: row.status,
    detail: row.detail || "",
    smsTo: row.channel === "sms" ? row.smsTo || "" : "",
    sentAt: row.sentAt ? new Date(row.sentAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export function hoursUntilEvent(event: EventTimingInput, now = new Date()) {
  const start = resolveEventStart(event);
  if (!start) return null;
  return hoursUntil(start, now);
}

export async function listStaffVisibleContacts(input: {
  customerIds: string[];
  now?: Date;
}) {
  const now = input.now || new Date();
  const ids = input.customerIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) return [];

  const users = await User.find({ _id: { $in: ids } })
    .select("_id name phone salesUpsells.venueSeating.enabled venueSeatingService.enabled")
    .lean<LeanUser[]>();
  const entitled = users.filter((user) => hasActiveVenueSeatingUpsell(user));
  if (!entitled.length) return [];

  const events = await Event.find({ userId: { $in: entitled.map((user) => user._id) } })
    .select("_id userId title date time receptionTime status paymentStatus")
    .lean<LeanEvent[]>();

  const visible = events.filter((event) => {
    const owner = entitled.find((user) => String(user._id) === String(event.userId));
    if (!owner) return false;
    return classifyEventAccess({ user: owner, event, now }).showTab;
  });
  if (!visible.length) return [];

  const contacts = await HallSeatingContact.find({
    eventId: { $in: visible.map((event) => event._id) },
  }).lean();

  return visible.map((event) => {
    const owner = entitled.find((user) => String(user._id) === String(event.userId));
    const doc = contacts.find((row) => String(row.eventId) === String(event._id)) || null;
    const contact = serializeContact(doc, event, now);
    return {
      eventId: String(event._id),
      eventTitle: event.title || "",
      eventDate: event.date || "",
      eventTime: event.time || "",
      customerId: owner ? String(owner._id) : "",
      customerName: owner?.name || "",
      status: contact.status,
      missingSoon: contact.missingSoon,
      contacts: [contact.primary, contact.secondary].filter(Boolean),
    };
  });
}
