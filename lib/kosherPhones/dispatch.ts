import mongoose from "mongoose";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import ScheduledMessage from "@/models/ScheduledMessage";
import User from "@/models/User";
import CallTask from "@/models/CallTask";
import { getAppBaseUrl } from "@/lib/calls/ivrAudioStorage";
import { ivrMaxParallelCalls } from "@/lib/calls/ivrDialer";
import {
  isDialableE164,
} from "@/lib/calls/ivrDialFailure";
import {
  createIvrOutboundCall,
  isIvrDialAllowed,
  normalizePhoneForTelnyx,
} from "@/lib/telnyx/ivrCallControl";
import { ensureKosherNarration } from "@/lib/kosherPhones/narration";
import {
  KOSHER_MESSAGE_ROUND_ORIGIN,
  kosherRunId,
  type KosherRoundNumber,
} from "@/lib/kosherPhones/match";

export type KosherDispatchResult = {
  enabled: boolean;
  routed: number;
  dialed: number;
  failed: number;
  queued: number;
  skipped: number;
  error?: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asRound(value: unknown): KosherRoundNumber {
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function scheduleType(schedule: any) {
  return clean(schedule?.type || schedule?.templateKey);
}

function webhookUrl() {
  const baseUrl = getAppBaseUrl();
  return (
    process.env.TELNYX_IVR_WEBHOOK_URL ||
    (baseUrl ? `${baseUrl}/api/telnyx/ivr/webhook` : "")
  );
}

async function coveredByOtherCallService(input: {
  invitationId: string;
  guestId: string;
  round: 1 | 2 | 3;
}) {
  const human = await CallTask.findOne({
    invitationId: input.invitationId,
    guestId: input.guestId,
    round: input.round,
    status: { $nin: ["cancelled"] },
  })
    .select("_id")
    .lean();
  if (human) return "EXISTING_HUMAN_CALL";

  const ivr = await IvrCallAttempt.findOne({
    invitationId: input.invitationId,
    guestId: input.guestId,
    round: input.round,
    channel: "outbound_ivr",
    origin: { $ne: KOSHER_MESSAGE_ROUND_ORIGIN },
    status: {
      $in: [
        "queued",
        "initiated",
        "ringing",
        "answered",
        "completed",
        "no_answer",
        "busy",
        "voicemail",
        "hangup_before_response",
      ],
    },
  })
    .select("_id")
    .lean();
  if (ivr) return "EXISTING_IVR_CALL";
  return "";
}

async function placeQueuedKosherCall(attempt: any, url: string) {
  const claimed = await IvrCallAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: "queued",
      $or: [
        { telnyxCallControlId: { $exists: false } },
        { telnyxCallControlId: null },
        { telnyxCallControlId: "" },
      ],
    },
    {
      $set: {
        status: "initiated",
        flowStep: "dialing",
        dialLockedAt: new Date(),
        error: "",
      },
    },
    { new: true }
  );
  if (!claimed) return "skipped" as const;

  const phone = clean(claimed.phone);
  if (!isIvrDialAllowed(phone)) {
    await IvrCallAttempt.updateOne(
      { _id: claimed._id },
      {
        $set: {
          status: "canceled",
          flowStep: "done",
          endedAt: new Date(),
          error: "DIAL_BLOCKED_TEST_MODE",
          rsvpApplied: false,
        },
      }
    );
    return "failed" as const;
  }

  try {
    const created = await createIvrOutboundCall({
      to: phone,
      webhookUrl: url,
      clientState: {
        source: "invistimo-ivr",
        ivr: true,
        kosherMessageRound: true,
        callAttemptId: String(claimed._id),
        userId: String(claimed.userId),
        invitationId: String(claimed.invitationId),
        guestId: String(claimed.guestId),
        round: claimed.round,
        scheduleId: String(claimed.scheduleId || ""),
      },
    });

    await IvrCallAttempt.updateOne(
      { _id: claimed._id },
      {
        $set: {
          status: "initiated",
          telnyxCallControlId: created.callControlId,
          telnyxCallLegId: created.callLegId,
          telnyxCallSessionId: created.callSessionId,
          telnyxConnectionId: created.connectionId,
          dialRequestedAt: new Date(),
        },
      }
    );
    return "dialed" as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DIAL_FAILED";
    await IvrCallAttempt.updateOne(
      { _id: claimed._id },
      {
        $set: {
          status: "failed",
          flowStep: "done",
          endedAt: new Date(),
          error: message.slice(0, 300),
          rsvpApplied: false,
        },
      }
    );
    return "failed" as const;
  }
}

export async function dispatchKosherMessageRound(input: {
  user: any;
  invitation: any;
  schedule: any;
  guests: any[];
}): Promise<KosherDispatchResult> {
  const empty: KosherDispatchResult = {
    enabled: true,
    routed: 0,
    dialed: 0,
    failed: 0,
    queued: 0,
    skipped: 0,
  };
  if (!input.guests.length) return empty;
  if (input.user?.kosherRecordedCallsEnabled !== true) {
    return { ...empty, enabled: false };
  }
  if (scheduleType(input.schedule) !== "rsvp") return { ...empty, routed: 0 };

  const round = asRound(input.schedule.round ?? input.schedule.roundNumber);
  const runId = kosherRunId(input.schedule._id);
  const invitationId = String(input.invitation._id);
  const userId = String(input.user._id);
  const scheduleId = input.schedule._id;
  const now = new Date();

  let narration;
  try {
    narration = await ensureKosherNarration({
      invitation: input.invitation,
      user: input.user,
    });
  } catch (error) {
    narration = {
      ready: false,
      error: error instanceof Error ? error.message : "NARRATION_UNAVAILABLE",
      introAudioUrl: "",
      eventNameAudioUrl: "",
      voiceGender: "female" as const,
      spokenName: "",
      speechText: "",
    };
  }

  const url = webhookUrl();
  let routed = 0;
  let failed = 0;
  let skipped = 0;
  const queuedIds: mongoose.Types.ObjectId[] = [];

  for (const guest of input.guests) {
    const guestId = String(guest._id || "");
    if (!guestId) continue;
    routed += 1;

    const existing = await IvrCallAttempt.findOne({
      origin: KOSHER_MESSAGE_ROUND_ORIGIN,
      scheduleId,
      guestId,
    }).lean();

    if (existing) {
      if (existing.status === "queued" && narration.ready && url) {
        queuedIds.push(existing._id as mongoose.Types.ObjectId);
      } else if (existing.status === "queued") {
        await IvrCallAttempt.updateOne(
          { _id: existing._id, status: "queued" },
          {
            $set: {
              status: "failed",
              flowStep: "done",
              endedAt: now,
              rsvpApplied: false,
              error: narration.error || "NARRATION_UNAVAILABLE",
            },
          }
        );
        failed += 1;
      } else if (existing.status === "failed" || existing.status === "canceled") {
        failed += 1;
      }
      continue;
    }

    const phone = normalizePhoneForTelnyx(guest.phone);
    const other = await coveredByOtherCallService({
      invitationId,
      guestId,
      round,
    });

    let status: "queued" | "failed" | "canceled" = "queued";
    let error = "";
    if (other) {
      status = "canceled";
      error = other;
      skipped += 1;
    } else if (!phone || !isDialableE164(phone)) {
      status = "failed";
      error = "INVALID_PHONE";
      failed += 1;
    } else if (!narration.ready || !narration.introAudioUrl) {
      status = "failed";
      error = narration.error || "NARRATION_UNAVAILABLE";
      failed += 1;
    } else if (!url) {
      status = "failed";
      error = "IVR_WEBHOOK_URL_MISSING";
      failed += 1;
    }

    const created = await IvrCallAttempt.create({
      userId,
      invitationId,
      guestId,
      scheduleId,
      round,
      runId,
      phone: phone || clean(guest.phone) || "invalid",
      channel: "outbound_ivr",
      direction: "outbound",
      origin: KOSHER_MESSAGE_ROUND_ORIGIN,
      eventName: narration.spokenName || "",
      status,
      flowStep: status === "queued" ? "dialing" : "done",
      phase: status === "queued" ? "RINGING" : "COMPLETED",
      answered: false,
      rsvpApplied: false,
      startedAt: now,
      endedAt: status === "queued" ? null : now,
      error,
      retryCount: 0,
      introAudioUrl: narration.introAudioUrl || "",
      eventNameAudioUrl: narration.eventNameAudioUrl || "",
      voiceGender: narration.voiceGender || "female",
      audioMode: "ai",
      timeline: [
        {
          at: now,
          source: "server",
          kind: status === "queued" ? "queued" : "blocked",
          label:
            status === "queued"
              ? "מספר כשר נכנס לתור חיוג של סבב ההודעות"
              : "החיוג למספר הכשר לא יצא",
          detail: error,
          eventType: "",
          digit: "",
          stage: "",
        },
      ],
    });

    if (status === "queued") queuedIds.push(created._id);
  }

  const room = Math.max(1, ivrMaxParallelCalls());
  let dialed = 0;
  const batch = queuedIds.slice(0, room);
  if (url && narration.ready) {
    for (const id of batch) {
      const attempt = await IvrCallAttempt.findById(id).lean();
      if (!attempt) continue;
      const result = await placeQueuedKosherCall(attempt, url);
      if (result === "dialed") dialed += 1;
      if (result === "failed") failed += 1;
    }
  }

  return {
    enabled: true,
    routed,
    dialed,
    failed,
    queued: Math.max(0, queuedIds.length - dialed),
    skipped,
  };
}

/** Drain kosher calls that were queued by the message worker. Not a separate schedule. */
export async function continueKosherMessageDials(input?: { maxCalls?: number }) {
  const url = webhookUrl();
  if (!url) return { dialed: 0, failed: 0 };

  const maxCalls = Math.max(1, Number(input?.maxCalls) || ivrMaxParallelCalls());
  const waiting = await IvrCallAttempt.find({
    origin: KOSHER_MESSAGE_ROUND_ORIGIN,
    status: "queued",
  })
    .sort({ createdAt: 1 })
    .limit(maxCalls * 3)
    .lean();

  let dialed = 0;
  let failed = 0;

  for (const attempt of waiting) {
    if (dialed >= maxCalls) break;
    const schedule = attempt.scheduleId
      ? await ScheduledMessage.findById(attempt.scheduleId)
          .select("status scheduledAt userId")
          .lean()
      : null;
    if (!schedule || schedule.status === "cancelled") {
      await IvrCallAttempt.updateOne(
        { _id: attempt._id, status: "queued" },
        {
          $set: {
            status: "canceled",
            flowStep: "done",
            endedAt: new Date(),
            error: "ROUND_CANCELLED",
            rsvpApplied: false,
          },
        }
      );
      failed += 1;
      continue;
    }
    if (schedule.scheduledAt && new Date(schedule.scheduledAt).getTime() > Date.now()) {
      continue;
    }
    const user = await User.findById(schedule.userId)
      .select("kosherRecordedCallsEnabled")
      .lean();
    if (user?.kosherRecordedCallsEnabled !== true) {
      await IvrCallAttempt.updateOne(
        { _id: attempt._id, status: "queued" },
        {
          $set: {
            status: "canceled",
            flowStep: "done",
            endedAt: new Date(),
            error: "SERVICE_DISABLED",
            rsvpApplied: false,
          },
        }
      );
      failed += 1;
      continue;
    }

    const result = await placeQueuedKosherCall(attempt, url);
    if (result === "dialed") dialed += 1;
    if (result === "failed") failed += 1;
  }

  return { dialed, failed };
}

const RETRYABLE_KOSHER_ERRORS = /NARRATION_UNAVAILABLE|DIAL_FAILED|IVR_WEBHOOK_URL_MISSING|TELNYX_|timeout|network/i;

export async function retryFailedKosherCalls(input: {
  invitationId: string;
  round: KosherRoundNumber;
  user: any;
  invitation: any;
}) {
  if (input.user?.kosherRecordedCallsEnabled !== true) {
    return { ok: false as const, error: "SERVICE_DISABLED" };
  }

  const narration = await ensureKosherNarration({
    invitation: input.invitation,
    user: input.user,
  });
  if (!narration.ready) {
    return {
      ok: false as const,
      error: narration.error || "NARRATION_UNAVAILABLE",
    };
  }

  const failed = await IvrCallAttempt.find({
    invitationId: input.invitationId,
    round: input.round,
    origin: KOSHER_MESSAGE_ROUND_ORIGIN,
    status: { $in: ["failed", "canceled"] },
    rsvpApplied: { $ne: true },
    $or: [
      { telnyxCallControlId: { $exists: false } },
      { telnyxCallControlId: null },
      { telnyxCallControlId: "" },
    ],
  }).lean();

  let requeued = 0;
  for (const attempt of failed) {
    const error = clean(attempt.error);
    if (error === "INVALID_PHONE" || error === "EXISTING_HUMAN_CALL" || error === "EXISTING_IVR_CALL") {
      continue;
    }
    if (error && !RETRYABLE_KOSHER_ERRORS.test(error) && error !== "DIAL_BLOCKED_TEST_MODE") {
      continue;
    }
    if (Number(attempt.retryCount || 0) >= 3) continue;

    const phone = normalizePhoneForTelnyx(attempt.phone);
    if (!phone || !isDialableE164(phone)) continue;

    const updated = await IvrCallAttempt.updateOne(
      { _id: attempt._id, status: attempt.status },
      {
        $set: {
          status: "queued",
          flowStep: "dialing",
          phase: "RINGING",
          error: "",
          endedAt: null,
          rsvpApplied: false,
          introAudioUrl: narration.introAudioUrl,
          eventNameAudioUrl: narration.eventNameAudioUrl,
          voiceGender: narration.voiceGender,
          eventName: narration.spokenName,
        },
        $inc: { retryCount: 1 },
      }
    );
    if (updated.modifiedCount) requeued += 1;
  }

  const continued = await continueKosherMessageDials();
  return { ok: true as const, requeued, ...continued };
}

export async function loadFreshKosherGuests(invitationId: unknown) {
  return InvitationGuest.find({ invitationId }).select("_id phone rsvp").lean();
}
