import mongoose from "mongoose";
import Event from "@/models/Event";
import HallSeatingContact from "@/models/HallSeatingContact";
import User from "@/models/User";
import VenueSeatingBriefingSms from "@/models/VenueSeatingBriefingSms";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { sendSmsDetailed } from "@/lib/sendSMS";
import { normalizeEventDateValue } from "@/lib/eventDetails/centralEventDetails";
import { israelCalendarDate } from "@/lib/venueSeatingContacts/logic";
import {
  addCalendarDays,
  ensureVenueSeatingHolidayCalendar,
} from "@/lib/venueSeatingContacts/smsSchedule";
import { recordVenueSeatingBriefingAdminNotice } from "@/lib/venueSeatingBriefing/adminNotice";
import {
  automaticClaimDecision,
  briefingAccess,
  buildVenueSeatingBriefing,
  dedupeRecipients,
  formatBriefingPhone,
  manualClaimDecision,
  publicStatus,
  roleLabel,
  type BriefingFacts,
  type BriefingRecipient,
  type BriefingRole,
  type BriefingSendKind,
} from "@/lib/venueSeatingBriefing/logic";

type IdLike = { _id?: unknown } | string | null | undefined;

function idString(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value && "_id" in (value as object)) {
    return String((value as { _id?: unknown })._id || "");
  }
  return String(value);
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function personName(user: {
  name?: unknown;
  fullName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
} | null) {
  const direct = clean(user?.name) || clean(user?.fullName);
  if (direct) return direct;
  return clean(`${clean(user?.firstName)} ${clean(user?.lastName)}`);
}

function asObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function isDuplicateKey(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: number }).code === 11000
  );
}

const USER_PAYMENT_SELECT =
  "_id name fullName firstName lastName phone role staffType assignedStaffIds assignedClientIds assignedProducerId assignedProducerIds salesUpsells.venueSeating.enabled venueSeatingService.enabled totalDealAmount paidAmount payments";

const EVENT_SELECT =
  "_id userId producerId assignedStaffIds title hostsNames eventType date time receptionTime status paymentStatus city location venueHallName venueSeatingArrivalTime venueSeatingArrivalManual";

type LeanUser = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  staffType?: string;
  assignedStaffIds?: unknown[];
  assignedClientIds?: unknown[];
  assignedProducerId?: unknown;
  assignedProducerIds?: unknown[];
  salesUpsells?: { venueSeating?: { enabled?: boolean } };
  venueSeatingService?: { enabled?: boolean };
  totalDealAmount?: number;
  paidAmount?: number;
  payments?: Array<{ amount?: number; status?: string; type?: string }>;
};

type LeanEvent = {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  producerId?: mongoose.Types.ObjectId;
  assignedStaffIds?: unknown[];
  title?: string;
  hostsNames?: string;
  eventType?: string;
  date?: string;
  time?: string;
  receptionTime?: string;
  status?: string;
  paymentStatus?: string;
  city?: string;
  location?: { name?: string; address?: string };
  venueHallName?: string;
  venueSeatingArrivalTime?: string;
  venueSeatingArrivalManual?: boolean;
};

function upcomingDateQuery(from: string, through: string) {
  return {
    $or: [
      { date: { $gte: from, $lte: through } },
      { date: { $gte: `${from}T`, $lte: `${through}T23:59:59.999Z` } },
    ],
  };
}

function briefingSearchQuery(now: Date) {
  const today = israelCalendarDate(now);
  const until = addCalendarDays(today, 14) || today;
  return upcomingDateQuery(today, until);
}

function venueNameOf(event: LeanEvent) {
  return clean(event.location?.name) || clean(event.venueHallName);
}

function cityOf(event: LeanEvent) {
  const city = clean(event.city);
  if (city) return city;
  const address = clean(event.location?.address);
  if (!address) return "";
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^ישראל$/i.test(part) && !/^\d{5,7}$/.test(part));
  return parts.length >= 2 ? parts[parts.length - 1] : "";
}

async function loadCustomer(userId: string) {
  const id = asObjectId(userId);
  if (!id) return null;
  return User.findById(id).select(USER_PAYMENT_SELECT).lean<LeanUser | null>();
}

async function loadEvent(eventId: string) {
  const id = asObjectId(eventId);
  if (!id) return null;
  return Event.findById(id).select(EVENT_SELECT).lean<LeanEvent | null>();
}

async function resolveRecipients(customer: LeanUser, event: LeanEvent) {
  const staffIds = new Set<string>();
  for (const id of customer.assignedStaffIds || []) {
    const value = idString(id);
    if (value) staffIds.add(value);
  }
  for (const id of event.assignedStaffIds || []) {
    const value = idString(id);
    if (value) staffIds.add(value);
  }

  const producerIds = new Set<string>();
  const eventProducer = idString(event.producerId);
  const assignedProducer = idString(customer.assignedProducerId);
  if (eventProducer) producerIds.add(eventProducer);
  if (assignedProducer) producerIds.add(assignedProducer);
  for (const id of customer.assignedProducerIds || []) {
    const value = idString(id);
    if (value) producerIds.add(value);
  }

  const staffObjectIds = [...staffIds].map(asObjectId).filter(Boolean);
  const producerObjectIds = [...producerIds].map(asObjectId).filter(Boolean);

  const [listedStaff, reverseStaff, producers] = await Promise.all([
    staffObjectIds.length
      ? User.find({
          _id: { $in: staffObjectIds },
          role: "staff",
          staffType: "seating_staff",
        })
          .select("_id name fullName firstName lastName phone")
          .lean<LeanUser[]>()
      : Promise.resolve([] as LeanUser[]),
    User.find({
      role: "staff",
      staffType: "seating_staff",
      assignedClientIds: customer._id,
    })
      .select("_id name fullName firstName lastName phone")
      .lean<LeanUser[]>(),
    producerObjectIds.length
      ? User.find({
          _id: { $in: producerObjectIds },
          role: "producer",
        })
          .select("_id name fullName firstName lastName phone")
          .lean<LeanUser[]>()
      : Promise.resolve([] as LeanUser[]),
  ]);

  const toRecipient = (user: LeanUser, role: BriefingRole): BriefingRecipient => ({
    userId: String(user._id),
    name: personName(user),
    phone: clean(user.phone),
    role,
  });

  return dedupeRecipients([
    ...listedStaff.map((user) => toRecipient(user, "seating_staff")),
    ...reverseStaff.map((user) => toRecipient(user, "seating_staff")),
    ...producers.map((user) => toRecipient(user, "producer")),
  ]);
}

async function factsFor(customer: LeanUser, event: LeanEvent): Promise<BriefingFacts> {
  const contact = await HallSeatingContact.findOne({ eventId: event._id })
    .select("primary secondary")
    .lean<{
      primary?: BriefingFacts["primary"];
      secondary?: BriefingFacts["secondary"];
    } | null>();

  return {
    hostsNames: event.hostsNames,
    title: event.title,
    eventType: event.eventType,
    date: event.date,
    venueName: venueNameOf(event),
    city: cityOf(event),
    receptionTime: event.receptionTime,
    arrivalTimeManual: event.venueSeatingArrivalTime,
    arrivalManual: event.venueSeatingArrivalManual,
    primary: contact?.primary || null,
    secondary: contact?.secondary || null,
    totalDealAmount: customer.totalDealAmount,
    paidAmount: customer.paidAmount,
    payments: customer.payments || [],
  };
}

function serializeRecipient(
  recipient: BriefingRecipient,
  log: {
    status?: string;
    kind?: string;
    sentAt?: Date | null;
    error?: string;
    history?: Array<{
      at?: Date;
      kind?: string;
      status?: string;
      error?: string;
    }>;
  } | null
) {
  const status = publicStatus(
    (log?.status as "pending" | "sending" | "sent" | "failed" | undefined) ||
      "pending"
  );
  return {
    userId: recipient.userId,
    name: recipient.name,
    phone: recipient.phone,
    role: recipient.role,
    roleLabel: roleLabel(recipient.role),
    status,
    statusLabel:
      status === "sent" ? "נשלח" : status === "failed" ? "נכשל" : "ממתין לשליחה",
    sentAt: log?.sentAt ? new Date(log.sentAt).toISOString() : null,
    kind: log?.kind === "manual" || log?.kind === "automatic" ? log.kind : "",
    error: log?.error || "",
    history: (log?.history || []).slice(-20).map((attempt) => ({
      at: attempt.at ? new Date(attempt.at).toISOString() : null,
      kind: attempt.kind || "",
      status: attempt.status || "",
      error: attempt.error || "",
    })),
  };
}

export async function describeEventBriefing(input: {
  customer: LeanUser;
  event: LeanEvent;
  now?: Date;
}) {
  const now = input.now || new Date();
  await ensureVenueSeatingHolidayCalendar();
  const access = briefingAccess({
    user: input.customer,
    event: input.event,
    now,
  });
  const facts = await factsFor(input.customer, input.event);
  const briefing = buildVenueSeatingBriefing(facts);
  const recipients = access.upsell
    ? await resolveRecipients(input.customer, input.event)
    : [];
  const logs = recipients.length
    ? await VenueSeatingBriefingSms.find({
        eventId: input.event._id,
        recipientUserId: {
          $in: recipients
            .map((recipient) => asObjectId(recipient.userId))
            .filter(Boolean),
        },
      }).lean()
    : [];
  const byRecipient = new Map(
    logs.map((log) => [String(log.recipientUserId), log])
  );

  return {
    access,
    briefing,
    event: {
      eventId: String(input.event._id),
      title: briefing.owners || clean(input.event.title),
      date: normalizeEventDateValue(input.event.date),
      dateLabel: briefing.dateLabel,
      receptionTime: briefing.receptionTime,
      arrivalTime: briefing.arrivalTime,
      arrivalManual: briefing.arrivalManual,
      venueName: briefing.venue,
      city: briefing.city,
      balance: briefing.balance,
      balanceLabel: briefing.balanceLabel,
      alerts: briefing.alerts,
      preview: briefing.text,
      canSend: access.allowManualSend,
      recipients: recipients.map((recipient) =>
        serializeRecipient(recipient, byRecipient.get(recipient.userId) || null)
      ),
    },
  };
}

export async function listAdminBriefings(customerId: string, now = new Date()) {
  const customer = await loadCustomer(customerId);
  if (!customer) return null;
  const events = await Event.find({ userId: customer._id })
    .select(EVENT_SELECT)
    .lean<LeanEvent[]>();
  const described = [];
  for (const event of events) {
    const row = await describeEventBriefing({ customer, event, now });
    if (!row.access.showInAdmin) continue;
    described.push(row.event);
  }
  described.sort((a, b) => a.date.localeCompare(b.date));
  return {
    active: described.length > 0,
    upsell: Boolean(
      customer.salesUpsells?.venueSeating?.enabled ||
        customer.venueSeatingService?.enabled
    ),
    events: described,
  };
}

export async function updateArrivalTime(input: {
  customerId: string;
  eventId: string;
  arrivalTime: unknown;
  clearManual?: boolean;
  now?: Date;
}) {
  const now = input.now || new Date();
  const customer = await loadCustomer(input.customerId);
  const event = await loadEvent(input.eventId);
  if (!customer || !event || String(event.userId || "") !== String(customer._id)) {
    return { ok: false as const, status: 404, error: "האירוע לא נמצא" };
  }
  const access = briefingAccess({ user: customer, event, now });
  if (!access.upsell) {
    return { ok: false as const, status: 403, error: "שירות הושבה באולם אינו פעיל" };
  }
  if (!access.showInAdmin) {
    return { ok: false as const, status: 409, error: "אי אפשר לעדכן אירוע שהסתיים" };
  }

  if (input.clearManual) {
    await Event.updateOne(
      { _id: event._id },
      { $set: { venueSeatingArrivalTime: "", venueSeatingArrivalManual: false } }
    );
  } else {
    const { normalizeClockTime } = await import("@/lib/seatingSchedule");
    const clock = normalizeClockTime(input.arrivalTime);
    if (!clock) {
      return { ok: false as const, status: 400, error: "שעת התייצבות אינה תקינה" };
    }
    await Event.updateOne(
      { _id: event._id },
      {
        $set: {
          venueSeatingArrivalTime: clock,
          venueSeatingArrivalManual: true,
        },
      }
    );
  }

  const fresh = await loadEvent(input.eventId);
  if (!fresh) return { ok: false as const, status: 404, error: "האירוע לא נמצא" };
  const described = await describeEventBriefing({ customer, event: fresh, now });
  return { ok: true as const, event: described.event };
}

async function claimSend(input: {
  customerId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  recipient: BriefingRecipient;
  kind: BriefingSendKind;
  now: Date;
}) {
  const recipientId = asObjectId(input.recipient.userId);
  if (!recipientId) return null;
  const existing = await VenueSeatingBriefingSms.findOne({
    eventId: input.eventId,
    recipientUserId: recipientId,
  });
  const decision =
    input.kind === "automatic"
      ? automaticClaimDecision(existing, input.now)
      : manualClaimDecision(existing, input.now);
  if (decision === "skip") return null;

  const patch = {
    userId: input.customerId,
    recipientName: input.recipient.name,
    recipientPhone: input.recipient.phone,
    recipientRole: input.recipient.role,
    status: "sending" as const,
    kind: input.kind,
    lastAttemptAt: input.now,
    error: "",
  };

  if (!existing) {
    try {
      return await VenueSeatingBriefingSms.create({
        eventId: input.eventId,
        recipientUserId: recipientId,
        history: [],
        ...patch,
      });
    } catch (error) {
      if (isDuplicateKey(error)) return null;
      throw error;
    }
  }

  return VenueSeatingBriefingSms.findOneAndUpdate(
    {
      _id: existing._id,
      status: existing.status,
      lastAttemptAt: existing.lastAttemptAt || null,
    },
    { $set: patch },
    { new: true }
  );
}

async function finishSend(input: {
  id: mongoose.Types.ObjectId;
  kind: BriefingSendKind;
  now: Date;
  ok: boolean;
  error: string;
}) {
  const status = input.ok ? "sent" : "failed";
  await VenueSeatingBriefingSms.updateOne(
    { _id: input.id, status: "sending" },
    {
      $set: {
        status,
        kind: input.kind,
        sentAt: input.ok ? input.now : null,
        error: input.ok ? "" : input.error,
      },
      $push: {
        history: {
          $each: [
            {
              at: input.now,
              kind: input.kind,
              status,
              error: input.ok ? "" : input.error,
            },
          ],
          $slice: -20,
        },
      },
    }
  );
}

export async function sendBriefing(input: {
  customerId: string;
  eventId: string;
  recipientIds?: string[];
  kind: BriefingSendKind;
  now?: Date;
}) {
  const now = input.now || new Date();
  const customer = await loadCustomer(input.customerId);
  const event = await loadEvent(input.eventId);
  if (!customer || !event || String(event.userId || "") !== String(customer._id)) {
    return { ok: false as const, status: 404, error: "האירוע לא נמצא" };
  }
  const briefingCustomer = customer;
  const briefingEvent = event;

  const described = await describeEventBriefing({ customer, event, now });
  const allowed =
    input.kind === "automatic"
      ? described.access.allowAutomaticSend
      : described.access.allowManualSend;
  if (!described.access.upsell || !allowed) {
    return {
      ok: false as const,
      status: described.access.upsell ? 409 : 403,
      error: described.access.upsell
        ? "השליחה לא זמינה לאירוע הזה"
        : "שירות הושבה באולם אינו פעיל",
    };
  }

  const requested = new Set(
    (input.recipientIds || []).map((id) => clean(id)).filter(Boolean)
  );
  const targets =
    input.kind === "automatic"
      ? described.event.recipients
      : described.event.recipients.filter((recipient) =>
          requested.has(recipient.userId)
        );
  if (input.kind === "manual" && targets.length === 0) {
    return { ok: false as const, status: 400, error: "לא נבחרו נמענים משובצים" };
  }

  const message = described.briefing.text;
  async function noteBriefingDelivery(recipient: BriefingRecipient, ok: boolean) {
    await recordVenueSeatingBriefingAdminNotice({
      eventId: String(briefingEvent._id),
      eventTitle: clean(briefingEvent.title) || clean(briefingEvent.hostsNames),
      customerId: String(briefingCustomer._id),
      recipientId: recipient.userId,
      recipientRole: recipient.role,
      kind: input.kind,
      ok,
      attemptAt: now.toISOString(),
    });
  }
  const results: Array<{
    userId: string;
    status: "sent" | "failed" | "skipped";
    error: string;
  }> = [];

  for (const recipient of targets) {
    const claimed = await claimSend({
      customerId: customer._id,
      eventId: event._id,
      recipient,
      kind: input.kind,
      now,
    });
    if (!claimed) {
      results.push({ userId: recipient.userId, status: "skipped", error: "" });
      continue;
    }

    if (!clean(recipient.phone)) {
      await finishSend({
        id: claimed._id,
        kind: input.kind,
        now,
        ok: false,
        error: "חסר מספר טלפון לנמען",
      });
      await noteBriefingDelivery(recipient, false);
      results.push({
        userId: recipient.userId,
        status: "failed",
        error: "חסר מספר טלפון לנמען",
      });
      continue;
    }

    const gate = assertExternalSendAllowed({
      channel: "sms",
      to: recipient.phone,
    });
    if (!gate.allowed) {
      await finishSend({
        id: claimed._id,
        kind: input.kind,
        now,
        ok: false,
        error: "השליחה נחסמה על ידי הגדרות הסביבה",
      });
      await noteBriefingDelivery(recipient, false);
      results.push({
        userId: recipient.userId,
        status: "failed",
        error: "השליחה נחסמה על ידי הגדרות הסביבה",
      });
      continue;
    }

    let delivered: Awaited<ReturnType<typeof sendSmsDetailed>>;
    try {
      delivered = await sendSmsDetailed({ to: recipient.phone, message });
    } catch {
      await finishSend({
        id: claimed._id,
        kind: input.kind,
        now,
        ok: false,
        error: "השליחה נכשלה",
      });
      await noteBriefingDelivery(recipient, false);
      results.push({
        userId: recipient.userId,
        status: "failed",
        error: "השליחה נכשלה",
      });
      continue;
    }

    if (!delivered.ok && !delivered.outcomeUnknown) {
      const error = delivered.errorMessage || "השליחה נכשלה";
      await finishSend({
        id: claimed._id,
        kind: input.kind,
        now,
        ok: false,
        error,
      });
      await noteBriefingDelivery(recipient, false);
      results.push({
        userId: recipient.userId,
        status: "failed",
        error,
      });
      continue;
    }

    if (delivered.ok || delivered.outcomeUnknown) {
      await finishSend({
        id: claimed._id,
        kind: input.kind,
        now,
        ok: true,
        error: "",
      });
      await noteBriefingDelivery(recipient, true);
      results.push({ userId: recipient.userId, status: "sent", error: "" });
    }
  }

  const fresh = await describeEventBriefing({ customer, event, now });
  return { ok: true as const, results, event: fresh.event };
}

export async function processAutomaticBriefings(now = new Date()) {
  await ensureVenueSeatingHolidayCalendar();
  const events = await Event.find({
    status: { $ne: "archived" },
    paymentStatus: { $ne: "refunded" },
    ...briefingSearchQuery(now),
  })
    .select(EVENT_SELECT)
    .lean<LeanEvent[]>();

  let examined = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    const customerId = idString(event.userId);
    if (!customerId) continue;
    const customer = await loadCustomer(customerId);
    if (!customer) continue;
    const access = briefingAccess({ user: customer, event, now });
    if (!access.allowAutomaticSend) continue;
    examined += 1;
    const result = await sendBriefing({
      customerId,
      eventId: String(event._id),
      kind: "automatic",
      now,
    });
    if (!result.ok) continue;
    for (const row of result.results) {
      if (row.status === "sent") sent += 1;
      else if (row.status === "failed") failed += 1;
      else skipped += 1;
    }
  }

  return { examined, sent, failed, skipped };
}

function visibleContact(contact: BriefingFacts["primary"]) {
  if (!contact) return null;
  const fullName = clean(contact.fullName);
  const phone = formatBriefingPhone(contact.phone);
  const relation = clean(contact.relation);
  if (fullName.length < 2 || !phone) return null;
  return { fullName, phone, relation };
}

export async function listMyBriefings(viewerId: string, now = new Date()) {
  await ensureVenueSeatingHolidayCalendar();
  const viewer = await loadCustomer(viewerId);
  if (!viewer) return [];
  const viewerObjectId = asObjectId(viewerId);
  if (!viewerObjectId) return [];

  let events: LeanEvent[] = [];
  if (viewer.role === "producer") {
    const customers = await User.find({
      $or: [
        { assignedProducerIds: viewerObjectId },
        { assignedProducerId: viewerObjectId },
      ],
    })
      .select("_id")
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>();
    const customerIds = customers.map((customer) => customer._id);
    events = await Event.find({
      $and: [
        briefingSearchQuery(now),
        {
          $or: [
            { producerId: viewerObjectId },
            { userId: { $in: customerIds } },
          ],
        },
      ],
    })
      .select(EVENT_SELECT)
      .lean<LeanEvent[]>();
  } else if (viewer.role === "staff" && viewer.staffType === "seating_staff") {
    const linkedCustomers = await User.find({ assignedStaffIds: viewerObjectId })
      .select("_id")
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>();
    const customerIds = [
      ...(viewer.assignedClientIds || []).map((id) => id),
      ...linkedCustomers.map((customer) => customer._id),
    ];
    events = await Event.find({
      $and: [
        briefingSearchQuery(now),
        {
          $or: [
            { userId: { $in: customerIds } },
            { assignedStaffIds: viewerObjectId },
          ],
        },
      ],
    })
      .select(EVENT_SELECT)
      .lean<LeanEvent[]>();
  } else {
    return [];
  }

  const rows = [];
  const seen = new Set<string>();
  for (const event of events) {
    const eventId = String(event._id);
    if (seen.has(eventId)) continue;
    seen.add(eventId);
    const customer = await loadCustomer(idString(event.userId));
    if (!customer) continue;
    const described = await describeEventBriefing({ customer, event, now });
    if (!described.access.showToAssignee) continue;
    const assigned = described.event.recipients.some(
      (recipient) => recipient.userId === viewerId
    );
    if (!assigned) continue;
    const facts = await factsFor(customer, event);
    rows.push({
      eventId: described.event.eventId,
      title: described.briefing.owners || described.event.title,
      dateLabel: described.briefing.dateLabel,
      venueName: described.briefing.venue,
      city: described.briefing.city,
      receptionTime: described.briefing.receptionTime,
      arrivalTime: described.briefing.arrivalTime,
      balanceLabel: described.briefing.balanceLabel,
      primary: visibleContact(facts.primary),
      secondary: visibleContact(facts.secondary),
    });
  }
  return rows;
}
