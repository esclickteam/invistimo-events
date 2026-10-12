import mongoose from "mongoose";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import CallTask from "@/models/CallTask";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallRecording from "@/models/CallRecording";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { createCustomerNotification } from "@/lib/customerNotifications/service";
import {
  isOpenHumanCallStatus,
  planHumanCallRoundNotification,
} from "@/lib/customerNotifications/humanCallRound";
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

function safeAdminHref(value: string | undefined, customerId: string | null) {
  const explicit = String(value || "").trim();
  if (explicit.startsWith("/") && !explicit.startsWith("//") && !explicit.includes("://")) {
    return explicit.slice(0, 300);
  }
  return customerId ? adminHref(customerId) : "/admin";
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
      audience === "admin"
        ? safeAdminHref(input.notice.adminActionHref, customerId)
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

export async function recordHumanCallRoundCompleted(input: { workOrderId: string }) {
  if (!mongoose.Types.ObjectId.isValid(input.workOrderId)) return { created: 0 };
  const workOrder = await CallWorkOrder.findById(input.workOrderId)
    .select("status type invitationId round userId clientUserId eventName")
    .lean<{
      status?: string;
      type?: string;
      invitationId?: mongoose.Types.ObjectId | null;
      round?: number;
      userId?: mongoose.Types.ObjectId | null;
      clientUserId?: mongoose.Types.ObjectId | null;
      eventName?: string;
    }>();
  if (!workOrder || workOrder.status !== "completed") return { created: 0 };
  if (workOrder.type && workOrder.type !== "rsvp_calls") return { created: 0 };
  const invitationId = workOrder.invitationId ? String(workOrder.invitationId) : "";
  const round = Number(workOrder.round || 0);
  if (!mongoose.Types.ObjectId.isValid(invitationId) || round < 1 || round > 3) return { created: 0 };

  const invitation = await Invitation.findById(invitationId)
    .select("eventId ownerId userId title")
    .lean<{
      eventId?: mongoose.Types.ObjectId | null;
      ownerId?: mongoose.Types.ObjectId | null;
      userId?: mongoose.Types.ObjectId | null;
      title?: string;
    }>();
  const userId = String(
    workOrder.clientUserId || workOrder.userId || invitation?.ownerId || invitation?.userId || ""
  );
  if (!mongoose.Types.ObjectId.isValid(userId)) return { created: 0 };
  const customer = await User.findById(userId)
    .select("includeCalls callsType")
    .lean<{ includeCalls?: boolean; callsType?: string }>();
  if (isIvrCallsUser(customer)) return { created: 0 };

  const tasks = await CallTask.find({
    invitationId: workOrder.invitationId,
    round: round as 1 | 2 | 3,
  })
    .select("status startedAt completedAt lastAttemptAt")
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        status?: string;
        startedAt?: Date | null;
        completedAt?: Date | null;
        lastAttemptAt?: Date | null;
      }>
    >();
  const openTaskCount = tasks.filter((task) => isOpenHumanCallStatus(String(task.status || ""))).length;
  const taskIds = tasks.map((task) => String(task._id));
  const recordings = taskIds.length
    ? await CallRecording.find({ "clientState.taskId": { $in: taskIds } })
        .select("clientState startedAt answeredAt endedAt")
        .lean<
          Array<{
            clientState?: { taskId?: string };
            startedAt?: Date | null;
            answeredAt?: Date | null;
            endedAt?: Date | null;
          }>
        >()
    : [];
  const notice = planHumanCallRoundNotification({
    invitationId,
    round,
    eventName: String(workOrder.eventName || invitation?.title || "").trim(),
    completed: true,
    openTaskCount,
    calls: tasks.map((task) => ({
      taskId: String(task._id),
      invitationId,
      round,
      status: String(task.status || ""),
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      lastAttemptAt: task.lastAttemptAt,
    })),
    recordings: recordings.map((recording) => ({
      taskId: String(recording.clientState?.taskId || ""),
      startedAt: recording.startedAt,
      answeredAt: recording.answeredAt,
      endedAt: recording.endedAt,
    })),
  });
  if (!notice) return { created: 0 };
  await publishCustomerAndAdmins({
    notice,
    userId,
    eventId: invitation?.eventId ? String(invitation.eventId) : null,
  });
  return { created: 1 };
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
