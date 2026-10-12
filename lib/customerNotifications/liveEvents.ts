import mongoose from "mongoose";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { createCustomerNotification } from "@/lib/customerNotifications/service";
import {
  countPhonesNeedingReview,
  planCallRoundNotifications,
  planEventDigestNotifications,
  planMessageRoundNotifications,
  planQueuedFailureNotification,
  planSystemErrorNotification,
  type PlannedNotice,
} from "@/lib/customerNotifications/planners";
import { isPlaceholderEventTime } from "@/lib/eventDetails/centralEventDetails";
import {
  israelCalendarDate,
  resolveEventStart,
} from "@/lib/venueSeatingContacts/logic";

function adminHref(customerId: string) {
  return `/admin/users?impersonate=${encodeURIComponent(customerId)}`;
}

async function publishNotice(input: {
  notice: PlannedNotice;
  userId: string;
  eventId?: string | null;
  customerId?: string | null;
}) {
  const audience = input.notice.audience === "admin" ? "admin" : "customer";
  const customerId =
    input.customerId && mongoose.Types.ObjectId.isValid(input.customerId)
      ? input.customerId
      : null;
  await createCustomerNotification({
    userId: input.userId,
    eventId: input.eventId || null,
    customerId: audience === "admin" ? customerId : null,
    audience,
    type: input.notice.type,
    category: input.notice.category,
    severity: input.notice.severity,
    title: input.notice.title,
    body: input.notice.body,
    actionHref:
      audience === "admin" && customerId
        ? adminHref(customerId)
        : input.notice.actionHref,
    dedupeKey: input.notice.dedupeKey,
  });
}

async function publishCustomerAndAdmins(input: {
  notice: PlannedNotice;
  userId: string;
  eventId?: string | null;
}) {
  if (input.notice.audience !== "admin") {
    await publishNotice({
      notice: input.notice,
      userId: input.userId,
      eventId: input.eventId,
    });
  }
  if (input.notice.audience === "admin" || input.notice.notifyAdmins) {
    const admins = await User.find({
      role: "admin",
      isActive: { $ne: false },
    })
      .select("_id")
      .limit(25)
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>();
    const adminNotice: PlannedNotice =
      input.notice.audience === "admin"
        ? input.notice
        : {
            ...input.notice,
            audience: "admin",
            type: input.notice.type,
            category: input.notice.adminCategory || "admin_failures",
            severity: input.notice.adminSeverity || input.notice.severity,
            title: input.notice.adminTitle || input.notice.title,
            body: input.notice.adminBody || input.notice.body,
          };
    for (const admin of admins) {
      if (String(admin._id) === input.userId && input.notice.audience !== "admin") {
        continue;
      }
      await publishNotice({
        notice: {
          ...adminNotice,
          dedupeKey: `${input.notice.dedupeKey}:admin:${admin._id}`,
          audience: "admin",
        },
        userId: String(admin._id),
        eventId: input.eventId,
        customerId: input.userId,
      });
    }
  }
}

export async function recordMessageRoundOutcome(input: {
  scheduleId?: string | null;
  userId: string;
  invitationId: string;
  eventId?: string | null;
  channel: "sms" | "whatsapp";
  messageType: string;
  round: number | null;
  audienceCount: number;
  sentCount: number;
  outcome: "sent" | "failed";
  salt: string;
  guests?: Array<{
    phone?: unknown;
    phoneNormalized?: unknown;
    phoneLengthApproved?: unknown;
    requiresPhoneReview?: unknown;
  }> | null;
}) {
  if (!mongoose.Types.ObjectId.isValid(input.userId)) return { created: 0 };
  const notices = planMessageRoundNotifications({
    scheduleId: input.scheduleId,
    invitationId: input.invitationId || input.scheduleId || input.userId,
    channel: input.channel,
    messageType: input.messageType,
    round: input.round,
    audienceCount: input.audienceCount,
    sentCount: input.sentCount,
    outcome: input.outcome,
    phonesNeedingReview: countPhonesNeedingReview(input.guests),
    salt: input.salt || "once",
  });
  for (const notice of notices) {
    await publishCustomerAndAdmins({
      notice,
      userId: input.userId,
      eventId: input.eventId,
    });
  }
  return { created: notices.length };
}

export async function recordCallRoundOutcome(input: {
  userId: string;
  invitationId: string;
  round: number;
  runId: string;
  status: string;
  dialed: number;
}) {
  if (!mongoose.Types.ObjectId.isValid(input.userId)) return { created: 0 };
  const notices = planCallRoundNotifications(input);
  if (!notices.length) return { created: 0 };
  let eventId: string | null = null;
  if (mongoose.Types.ObjectId.isValid(input.invitationId)) {
    const invitation = await Invitation.findById(input.invitationId)
      .select("eventId")
      .lean<{ eventId?: mongoose.Types.ObjectId | null }>();
    eventId = invitation?.eventId ? String(invitation.eventId) : null;
  }
  for (const notice of notices) {
    await publishCustomerAndAdmins({
      notice,
      userId: input.userId,
      eventId,
    });
  }
  return { created: notices.length };
}

export async function recordQueuedWhatsappFailure(input: {
  invitationId: string;
  round: number | null;
}) {
  if (!mongoose.Types.ObjectId.isValid(input.invitationId)) return { created: 0 };
  const invitation = await Invitation.findById(input.invitationId)
    .select("eventId ownerId userId")
    .lean<{
      eventId?: mongoose.Types.ObjectId | null;
      ownerId?: mongoose.Types.ObjectId | null;
      userId?: mongoose.Types.ObjectId | null;
    }>();
  const userId = String(invitation?.ownerId || invitation?.userId || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) return { created: 0 };
  const notice = planQueuedFailureNotification({
    invitationId: input.invitationId,
    round: input.round,
    dateKey: israelCalendarDate(new Date()),
  });
  await publishCustomerAndAdmins({
    notice,
    userId,
    eventId: invitation?.eventId ? String(invitation.eventId) : null,
  });
  return { created: 1 };
}

export async function recordSystemError(source: string) {
  const bucket = new Date().toISOString().slice(0, 13);
  const notice = planSystemErrorNotification({
    source: String(source || "worker").slice(0, 40),
    hourBucket: bucket,
  });
  await publishCustomerAndAdmins({
    notice,
    userId: "system",
  });
}

function missingLocation(event: {
  venueHallName?: unknown;
  location?: {
    name?: unknown;
    address?: unknown;
    formattedAddress?: unknown;
    placeName?: unknown;
    wazeUrl?: unknown;
    lat?: unknown;
    lng?: unknown;
  } | null;
}) {
  const location = event.location;
  const hasPoint = Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng));
  return ![
    event.venueHallName,
    location?.name,
    location?.address,
    location?.formattedAddress,
    location?.placeName,
    location?.wazeUrl,
    hasPoint ? "1" : "",
  ].some((value) => String(value || "").trim());
}

export async function processUpcomingEventNotifications(now = new Date()) {
  const today = israelCalendarDate(now);
  const until = israelCalendarDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
  const events = await Event.find({
    date: { $gte: today, $lte: until },
    status: { $nin: ["archived", "cancelled"] },
  })
    .select("userId title date time receptionTime location venueHallName status paymentStatus")
    .limit(400)
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        userId?: mongoose.Types.ObjectId | null;
        title?: string;
        date?: string;
        time?: string;
        receptionTime?: string;
        venueHallName?: string;
        location?: {
          name?: string;
          address?: string;
          formattedAddress?: string;
          placeName?: string;
          wazeUrl?: string;
          lat?: number;
          lng?: number;
        };
        status?: string;
        paymentStatus?: string;
      }>
    >();

  let created = 0;
  for (const event of events) {
    const userId = event.userId ? String(event.userId) : "";
    if (!mongoose.Types.ObjectId.isValid(userId)) continue;
    const payment = String(event.paymentStatus || "").toLowerCase();
    const cancelled =
      String(event.status || "").toLowerCase() === "cancelled" || payment === "refunded";
    const start = resolveEventStart(event);
    const invitation = await Invitation.findOne({ eventId: event._id })
      .select("_id")
      .lean<{ _id: mongoose.Types.ObjectId }>();
    const notices = planEventDigestNotifications({
      now,
      eventId: String(event._id),
      title: event.title || "",
      start,
      dateKey: String(event.date || ""),
      cancelled,
      missingLocation: missingLocation(event),
      missingTime:
        isPlaceholderEventTime(event.time) && isPlaceholderEventTime(event.receptionTime),
      actionHref: invitation
        ? `/dashboard/invitations/${invitation._id}/edit`
        : "/dashboard",
    });
    for (const notice of notices) {
      if (notice.audience === "admin") {
        await publishCustomerAndAdmins({
          notice,
          userId,
          eventId: String(event._id),
        });
      } else {
        await publishNotice({
          notice,
          userId,
          eventId: String(event._id),
        });
      }
      created += 1;
    }
  }
  return { scanned: events.length, planned: created };
}
