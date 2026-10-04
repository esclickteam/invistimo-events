import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";
import {
  overlayLiveEventDetailsOnWhatsappPayload,
  resolveLiveEventMessageDetails,
  rewriteBakedEventDetails,
  type LiveEventMessageDetails,
} from "@/lib/messages/liveEventDetails";

const UNSENT_SCHEDULE_STATUSES = ["scheduled", "pending", "sending"];
const UNSENT_QUEUE_STATUSES = ["pending", "scheduled", "sending"];

export async function refreshUnsentRoundPayloads({
  invitationId,
  invitation,
  event,
  previous,
}: {
  invitationId: unknown;
  invitation?: any;
  event?: any;
  previous?: LiveEventMessageDetails | null;
}) {
  if (!invitationId) return { schedules: 0, queue: 0 };

  const live = resolveLiveEventMessageDetails(invitation, event);
  const id = invitationId as any;

  const schedules = await ScheduledMessage.find({
    invitationId: id,
    status: { $in: UNSENT_SCHEDULE_STATUSES },
  });

  let scheduleCount = 0;
  for (const schedule of schedules) {
    const set: Record<string, any> = {};

    if (schedule.channel === "whatsapp") {
      set.payload = overlayLiveEventDetailsOnWhatsappPayload(
        (schedule as any).payload || {},
        live
      );
    }

    if (schedule.channel === "sms" && previous) {
      const fields = ["messageContent", "messageOverride", "text"] as const;
      for (const field of fields) {
        const current = String((schedule as any)[field] || "");
        if (!current) continue;
        const next = rewriteBakedEventDetails(current, previous, live);
        if (next !== current) set[field] = next;
      }
    }

    if (Object.keys(set).length === 0) continue;

    await ScheduledMessage.updateOne({ _id: schedule._id }, { $set: set });
    scheduleCount += 1;
  }

  const queueJobs = await WhatsappQueue.find({
    invitationId: id,
    status: { $in: UNSENT_QUEUE_STATUSES },
  });

  let queueCount = 0;
  for (const job of queueJobs) {
    const nextPayload = overlayLiveEventDetailsOnWhatsappPayload(
      (job as any).payload || {},
      live
    );
    await WhatsappQueue.updateOne(
      { _id: job._id },
      { $set: { payload: nextPayload } }
    );
    queueCount += 1;
  }

  return { schedules: scheduleCount, queue: queueCount, live };
}
