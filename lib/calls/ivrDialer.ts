/**
 * IVR round dialer: resolve audience at execution time, create attempts, place calls.
 * Production (VERCEL_ENV=production) dials through Telnyx.
 * Other environments dial only when IVR_ALLOW_LIVE_DIAL=true or the phone is allowlisted.
 *
 * AI mode dials only after the approved continuous file is stored.
 * That same file is what the guest hears. Fixed pack clips are not rebuilt here.
 */

import type { Types } from "mongoose";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import {
  getCallRoundDateKeyInIsrael,
  isCallRoundDue,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  filterGuestsForIvrRound,
  isGuestEligibleForIvrRound,
  type IvrRoundNumber,
} from "@/lib/calls/ivrRoundEligibility";
import {
  resolveIvrPublicAudioUrl,
  getAppBaseUrl,
} from "@/lib/calls/ivrAudioStorage";
import { IVR_COMPOSE_VERSION } from "@/lib/calls/ivrComposeIntro";
import {
  explainIvrCallFailure,
  isDialableE164,
  isIvrDialRetryable,
  shouldReleaseStaleOutbound,
  staleOutboundReleaseAction,
  STALE_ANSWERED_MS,
  STALE_UNANSWERED_MS,
} from "@/lib/calls/ivrDialFailure";
import { normalizeIvrVoiceGender } from "@/lib/calls/ivrScript";
import { warmIvrChoiceFollowUps } from "@/lib/calls/ivrSystemAudio";
import {
  createIvrOutboundCall,
  isIvrDialAllowed,
  normalizePhoneForTelnyx,
  readIvrCallLiveness,
} from "@/lib/telnyx/ivrCallControl";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRoundCancelled(round: any) {
  const status = String(round?.status || "")
    .trim()
    .toLowerCase();
  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "בוטל" ||
    status === "מבוטל" ||
    round?.cancelled === true ||
    round?.enabled === false
  );
}

function isRoundTerminal(round: any) {
  const status = String(round?.status || "")
    .trim()
    .toLowerCase();
  return (
    isRoundCancelled(round) ||
    status === "done" ||
    status === "completed" ||
    status === "failed"
  );
}

const LIVE_ATTEMPT_STATUSES = new Set([
  "queued",
  "initiated",
  "ringing",
  "answered",
  "invalid_input",
]);

/** In-flight Telnyx calls across every event. A stuck leg must not hold a slot. */
const IVR_DEFAULT_PARALLEL_CALLS = 8;
const IVR_PARALLEL_CALL_HARD_CAP = 20;

export function ivrMaxParallelCalls() {
  const raw = Number(process.env.IVR_MAX_PARALLEL_CALLS || IVR_DEFAULT_PARALLEL_CALLS);
  if (!Number.isFinite(raw) || raw < 1) return IVR_DEFAULT_PARALLEL_CALLS;
  return Math.min(IVR_PARALLEL_CALL_HARD_CAP, Math.floor(raw));
}

function occupiedOutboundFilter() {
  return {
    channel: "outbound_ivr" as const,
    $or: [
      { status: { $in: [...LIVE_ATTEMPT_STATUSES] } },
      {
        status: "completed",
        endedAt: null,
        flowStep: { $ne: "done" },
      },
    ],
  };
}

async function countOccupiedOutboundCalls() {
  return IvrCallAttempt.countDocuments(occupiedOutboundFilter());
}

/**
 * Free a slot only after the stored state says the leg is stuck and, when a
 * Telnyx call id exists, the provider says that call is already over.
 * A live ring or an in-progress menu is left alone. RSVP fields are not written.
 */
async function releaseStaleOutboundOccupancy(now: Date) {
  const unansweredBefore = new Date(now.getTime() - STALE_UNANSWERED_MS);
  const answeredBefore = new Date(now.getTime() - STALE_ANSWERED_MS);
  const candidates = await IvrCallAttempt.find({
    channel: "outbound_ivr",
    rsvpApplied: { $ne: true },
    endedAt: null,
    flowStep: { $ne: "done" },
    status: {
      $in: ["queued", "initiated", "ringing", "answered", "invalid_input", "completed"],
    },
    $or: [
      { dialLockedAt: { $lt: unansweredBefore } },
      { startedAt: { $lt: unansweredBefore } },
      { answeredAt: { $lt: answeredBefore } },
    ],
  })
    .select(
      "status flowStep answered answeredAt ringingAt dialLockedAt dialRequestedAt startedAt playbackCommandAt playbackStartedAt firstDigitAt choiceDigitAt followupPlaybackStartedAt timeline updatedAt telnyxCallControlId rsvpApplied endedAt"
    )
    .limit(40)
    .lean();

  const stuckDialIds: Types.ObjectId[] = [];
  const stuckHangupIds: Types.ObjectId[] = [];

  for (const attempt of candidates) {
    const action = staleOutboundReleaseAction(attempt, now);
    const callControlId = cleanStr(attempt.telnyxCallControlId);
    const liveness = callControlId
      ? await readIvrCallLiveness(callControlId)
      : "unknown";
    if (
      !shouldReleaseStaleOutbound({
        action,
        hasCallControlId: Boolean(callControlId),
        liveness,
      })
    ) {
      continue;
    }
    const attemptId = attempt._id;
    if (!attemptId) continue;
    if (action === "stuck_hangup") stuckHangupIds.push(attemptId);
    else stuckDialIds.push(attemptId);
  }

  if (stuckDialIds.length) {
    await IvrCallAttempt.updateMany(
      {
        _id: { $in: stuckDialIds },
        channel: "outbound_ivr",
        answered: { $ne: true },
        rsvpApplied: { $ne: true },
        status: { $in: ["queued", "initiated", "ringing"] },
      },
      {
        $set: {
          status: "failed",
          flowStep: "done",
          endedAt: now,
          answered: false,
          error: "STALE_DIAL_NO_RESULT",
        },
      }
    );
  }

  if (stuckHangupIds.length) {
    await IvrCallAttempt.updateMany(
      {
        _id: { $in: stuckHangupIds },
        channel: "outbound_ivr",
        rsvpApplied: { $ne: true },
        endedAt: null,
        answered: true,
      },
      {
        $set: {
          status: "hangup_before_response",
          flowStep: "done",
          endedAt: now,
          error: "STALE_CALL_NO_HANGUP",
        },
      }
    );
  }
}

function approvedPlaybackUrl(cfg: any, fallback: string) {
  const approval = cfg?.recordingApproval;
  if (approval?.approved === true) {
    const locked = resolveIvrPublicAudioUrl({
      publicToken: approval.audioPublicToken,
      storedUrl: approval.audioUrl,
    });
    if (locked) return locked;
  }
  return fallback;
}

export type IvrDueRound = {
  userId: string;
  invitationId: string;
  round: IvrRoundNumber;
  scheduledAt: Date;
  /** Self-recorded / legacy single intro URL (optional). */
  introAudioUrl: string;
  /** AI mode: spoken event-name clip URL. */
  eventNameAudioUrl: string;
  /** AI mode: seamless composed before+name+after (preferred for Telnyx). */
  composedIntroAudioUrl: string;
  voiceGender: "female" | "male" | null;
  audioMode: "ai" | "self_recorded" | null;
  clientName: string;
  audioReady: boolean;
  audioBlockReason: string;
};

function resolveReadyAiAudio(user: any): {
  eventNameAudioUrl: string;
  composedIntroAudioUrl: string;
  voiceGender: "female" | "male";
} | null {
  const cfg = user?.ivrConfig || {};
  const gender = normalizeIvrVoiceGender(cfg.voiceGender);
  const eventAudio = cfg.eventNameAudio;
  const composed = cfg.composedIntroAudio;
  const eventNameAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: eventAudio?.publicToken,
    storedUrl: eventAudio?.audioUrl,
  });
  let composedIntroAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: composed?.publicToken,
    storedUrl: composed?.audioUrl,
  });
  composedIntroAudioUrl = approvedPlaybackUrl(cfg, composedIntroAudioUrl);

  const approval = cfg.recordingApproval;
  const legacyApproved =
    !approval &&
    eventAudio?.approved === true &&
    composed?.approved === true;
  const explicitlyApproved =
    approval?.approved === true &&
    approval?.audioMode !== "self_recorded";

  // Require the exact approved outbound composition — not a stale mix.
  if (String(composed?.composeVersion || "") !== IVR_COMPOSE_VERSION) {
    return null;
  }

  // Require the exact approved composed intro — not just the event-name clip.
  if (
    !gender ||
    !eventNameAudioUrl ||
    !composedIntroAudioUrl ||
    eventAudio?.status !== "ready" ||
    composed?.status !== "ready" ||
    (eventAudio?.approved !== true && approval?.approved !== true) ||
    (composed?.approved !== true && approval?.approved !== true) ||
    (!legacyApproved && !explicitlyApproved)
  ) {
    return null;
  }

  return { eventNameAudioUrl, composedIntroAudioUrl, voiceGender: gender };
}

function resolveRoundAudio(user: any): {
  introAudioUrl: string;
  eventNameAudioUrl: string;
  composedIntroAudioUrl: string;
  voiceGender: "female" | "male" | null;
  audioMode: "ai" | "self_recorded";
  audioReady: boolean;
  audioBlockReason: string;
} {
  const audioMode =
    (user?.ivrConfig?.audioMode as "ai" | "self_recorded" | null) || "ai";
  let introAudioUrl = "";
  let eventNameAudioUrl = "";
  let composedIntroAudioUrl = "";
  let voiceGender: "female" | "male" | null = null;
  let audioReady = false;
  let audioBlockReason = "";

  if (audioMode === "self_recorded") {
    introAudioUrl = resolveReadySelfAudio(user);
    audioReady = Boolean(introAudioUrl);
    if (!audioReady) {
      audioBlockReason = "אין הקלטה עצמית מאושרת לשיחות";
    }
  } else {
    const ai = resolveReadyAiAudio(user);
    if (ai) {
      eventNameAudioUrl = ai.eventNameAudioUrl;
      composedIntroAudioUrl = ai.composedIntroAudioUrl;
      introAudioUrl = ai.composedIntroAudioUrl;
      voiceGender = ai.voiceGender;
      audioReady = true;
    } else {
      audioBlockReason = "אין הקלטת AI מאושרת לשיחות";
    }
  }

  return {
    introAudioUrl,
    eventNameAudioUrl,
    composedIntroAudioUrl,
    voiceGender,
    audioMode: audioMode === "self_recorded" ? "self_recorded" : "ai",
    audioReady,
    audioBlockReason,
  };
}

/** The one approved narration file for both outbound and inbound calls. */
export function resolveApprovedNarrationUrl(user: any) {
  const audio = resolveRoundAudio(user);
  return audio.audioReady ? audio.introAudioUrl : "";
}

function resolveReadySelfAudio(user: any): string {
  const intro = user?.ivrConfig?.introAudio;
  const token = cleanStr(intro?.publicToken);
  let introAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: token,
    storedUrl: intro?.audioUrl,
  });
  introAudioUrl = approvedPlaybackUrl(user?.ivrConfig, introAudioUrl);

  const approval = user?.ivrConfig?.recordingApproval;
  const legacyApproved = !approval && intro?.approved === true;
  const explicitlyApproved =
    approval?.approved === true && approval?.audioMode === "self_recorded";

  if (
    !introAudioUrl ||
    intro?.status !== "ready" ||
    (intro?.approved !== true && approval?.approved !== true) ||
    (!legacyApproved && !explicitlyApproved)
  ) {
    return "";
  }
  return introAudioUrl;
}

export async function listDueIvrRounds(input?: {
  now?: Date;
  dateKey?: string;
  force?: boolean;
}): Promise<IvrDueRound[]> {
  const now = input?.now || new Date();
  const dateKey = input?.dateKey || getCallRoundDateKeyInIsrael(now);
  const force = Boolean(input?.force);

  const users = (await User.find({
    includeCalls: true,
    callsType: "ivr",
    "callRoundsSchedule.rounds.scheduledAt": { $exists: true },
  })
    .select(
      "_id name email includeCalls callsType callRoundsSchedule ivrConfig"
    )
    .lean()) as any[];

  const due: IvrDueRound[] = [];

  for (const user of users) {
    if (!isIvrCallsUser(user)) continue;

    const audio = resolveRoundAudio(user);

    const rounds = Array.isArray(user?.callRoundsSchedule?.rounds)
      ? user.callRoundsSchedule.rounds
      : [];

    const invitation = await Invitation.findOne({ ownerId: user._id })
      .select("_id ownerId eventName")
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();

    if (!invitation?._id) continue;

    for (const raw of rounds) {
      const roundNumber = Number(raw?.roundNumber || raw?.round || 0) as
        | IvrRoundNumber
        | number;
      if (roundNumber !== 1 && roundNumber !== 2 && roundNumber !== 3) continue;
      if (isRoundTerminal(raw)) continue;

      const scheduledAt = parseCallRoundScheduledAt(raw?.scheduledAt);
      if (!scheduledAt) continue;

      if (
        !isCallRoundDue({
          scheduledAt,
          dateKey,
          now,
          force,
        })
      ) {
        continue;
      }

      due.push({
        userId: String(user._id),
        invitationId: String(invitation._id),
        round: roundNumber,
        scheduledAt,
        introAudioUrl: audio.introAudioUrl,
        eventNameAudioUrl: audio.eventNameAudioUrl,
        composedIntroAudioUrl: audio.composedIntroAudioUrl,
        voiceGender: audio.voiceGender,
        audioMode: audio.audioMode,
        clientName: cleanStr(user.name) || cleanStr(user.email) || "לקוח",
        audioReady: audio.audioReady,
        audioBlockReason: audio.audioBlockReason,
      });
    }
  }

  due.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return due;
}

async function setRoundExecution(input: {
  userId: string;
  round: number;
  status: string;
  now: Date;
  failureReason?: string;
  tasksCreated?: number;
  clearClaim?: boolean;
  openedAt?: Date | null;
  eligibleCount?: number;
}) {
  const set: Record<string, unknown> = {
    "callRoundsSchedule.rounds.$.status": input.status,
    "callRoundsSchedule.rounds.$.updatedAt": input.now,
    "callRoundsSchedule.rounds.$.failureReason": input.failureReason || "",
  };
  if (typeof input.tasksCreated === "number") {
    set["callRoundsSchedule.rounds.$.tasksCreated"] = input.tasksCreated;
  }
  if (input.openedAt) {
    set["callRoundsSchedule.rounds.$.openedAt"] = input.openedAt;
  }
  if (input.clearClaim) {
    set["callRoundsSchedule.rounds.$.dialClaimedAt"] = null;
  }
  if (typeof input.eligibleCount === "number") {
    set["callRoundsSchedule.rounds.$.eligibleCount"] = input.eligibleCount;
  }
  await User.updateOne(
    {
      _id: input.userId,
      "callRoundsSchedule.rounds.roundNumber": input.round,
    },
    { $set: set }
  );
}

async function claimRound(userId: string, round: number, now: Date) {
  const stale = new Date(now.getTime() - 20 * 1000);
  const res = await User.updateOne(
    {
      _id: userId,
      "callRoundsSchedule.rounds": {
        $elemMatch: {
          roundNumber: round,
          status: {
            $nin: ["done", "completed", "failed", "cancelled", "canceled"],
          },
          $or: [
            { dialClaimedAt: { $exists: false } },
            { dialClaimedAt: null },
            { dialClaimedAt: { $lt: stale } },
          ],
        },
      },
    },
    {
      $set: {
        "callRoundsSchedule.rounds.$.status": "in_progress",
        "callRoundsSchedule.rounds.$.dialClaimedAt": now,
        "callRoundsSchedule.rounds.$.failureReason": "",
        "callRoundsSchedule.rounds.$.updatedAt": now,
      },
    }
  );
  return res.modifiedCount > 0;
}

export async function executeIvrRound(input: {
  due: IvrDueRound;
  webhookUrl: string;
  maxCalls?: number;
  now?: Date;
}) {
  const now = input.now || new Date();
  const requested = Math.max(1, Number(input.maxCalls) || 50);

  if (!input.due.audioReady) {
    await User.updateOne(
      {
        _id: input.due.userId,
        "callRoundsSchedule.rounds": {
          $elemMatch: {
            roundNumber: input.due.round,
            status: {
              $in: [
                "draft",
                "scheduled",
                "waiting_for_assignment",
                "waiting_for_previous_round",
              ],
            },
          },
        },
      },
      {
        $set: {
          "callRoundsSchedule.rounds.$.failureReason":
            input.due.audioBlockReason || "אין הקלטה מאושרת — החיוג לא יצא",
          "callRoundsSchedule.rounds.$.updatedAt": now,
        },
      }
    );
    return {
      invitationId: input.due.invitationId,
      round: input.due.round,
      eligibleCount: 0,
      dialed: 0,
      blocked: true,
      reason: input.due.audioBlockReason,
      results: [],
      appBaseUrl: getAppBaseUrl(),
    };
  }

  const claimed = await claimRound(input.due.userId, input.due.round, now);
  if (!claimed) {
    return {
      invitationId: input.due.invitationId,
      round: input.due.round,
      eligibleCount: 0,
      dialed: 0,
      skipped: true,
      reason: "ROUND_ALREADY_RUNNING",
      results: [],
      appBaseUrl: getAppBaseUrl(),
    };
  }

  if (input.due.voiceGender) {
    void warmIvrChoiceFollowUps(input.due.voiceGender);
  }

  await releaseStaleOutboundOccupancy(now);
  const occupied = await countOccupiedOutboundCalls();
  const room = Math.max(0, ivrMaxParallelCalls() - occupied);
  const maxCalls = Math.min(requested, room);
  if (maxCalls < 1) {
    await setRoundExecution({
      userId: input.due.userId,
      round: input.due.round,
      status: "in_progress",
      now,
      failureReason: explainIvrCallFailure("PARALLEL_CAP"),
      clearClaim: true,
    });
    return {
      invitationId: input.due.invitationId,
      round: input.due.round,
      eligibleCount: 0,
      dialed: 0,
      skipped: true,
      reason: "PARALLEL_CAP",
      results: [],
      appBaseUrl: getAppBaseUrl(),
    };
  }

  const guests = await InvitationGuest.find({
    invitationId: input.due.invitationId,
  }).lean();

  const eligible = filterGuestsForIvrRound({
    guests,
    round: input.due.round,
  });

  const results: Array<{
    guestId: string;
    phone: string;
    status: string;
    attemptId?: string;
    reason?: string;
  }> = [];

  let dialed = 0;
  let hitCap = false;

  for (const guest of eligible) {
    if (dialed >= maxCalls) {
      hitCap = true;
      break;
    }

    const guestId = String(guest._id);
    const fresh = await InvitationGuest.findById(guestId).lean();
    if (
      !fresh ||
      !isGuestEligibleForIvrRound({ guest: fresh, round: input.due.round })
    ) {
      results.push({
        guestId,
        phone: "",
        status: "skipped",
        reason: "no_longer_eligible",
      });
      continue;
    }

    const phoneRaw = cleanStr(fresh.phone || fresh.mobile || fresh.phoneNumber);
    const phone = normalizePhoneForTelnyx(phoneRaw);
    const existing = await IvrCallAttempt.findOne({
      invitationId: input.due.invitationId,
      guestId,
      round: input.due.round,
      channel: "outbound_ivr",
    });

    if (!phone || !isDialableE164(phone)) {
      if (!existing) {
        await IvrCallAttempt.create({
          userId: input.due.userId,
          invitationId: input.due.invitationId,
          guestId,
          round: input.due.round,
          phone: phone || phoneRaw,
          channel: "outbound_ivr",
          direction: "outbound",
          answered: false,
          rsvpApplied: false,
          status: "failed",
          flowStep: "done",
          startedAt: now,
          endedAt: now,
          error: "INVALID_PHONE",
          retryCount: 0,
          introAudioUrl: input.due.introAudioUrl,
          voiceGender: input.due.voiceGender,
          audioMode:
            input.due.audioMode === "self_recorded" ? "self_recorded" : "ai",
          timeline: [
            {
              at: now,
              source: "server",
              kind: "invalid_phone",
              label: "המספר לא תקין ולכן לא נשלח חיוג",
              detail: "INVALID_PHONE",
              eventType: "",
              digit: "",
              stage: "",
            },
          ],
        });
      }
      results.push({
        guestId,
        phone: phone || phoneRaw,
        status: "failed",
        reason: "INVALID_PHONE",
      });
      continue;
    }

    if (existing) {
      const retryable =
        ["failed"].includes(String(existing.status)) &&
        !cleanStr(existing.telnyxCallControlId) &&
        Number(existing.retryCount || 0) < 2 &&
        isIvrDialRetryable(existing.error);
      if (!retryable) {
        results.push({
          guestId,
          phone,
          status: "already_attempted",
          attemptId: String(existing._id),
        });
        continue;
      }
    }

    const attemptFields = {
      userId: input.due.userId,
      invitationId: input.due.invitationId,
      guestId,
      round: input.due.round,
      phone,
      channel: "outbound_ivr" as const,
      direction: "outbound" as const,
      answered: false,
      dtmfDigits: [],
      rsvpApplied: false,
      startedAt: now,
      introAudioUrl: input.due.introAudioUrl,
      eventNameAudioUrl:
        input.due.audioMode === "self_recorded" ? "" : input.due.eventNameAudioUrl,
      voiceGender: input.due.voiceGender,
      audioMode:
        input.due.audioMode === "self_recorded" ? "self_recorded" : "ai",
    };

    let attempt = existing;
    if (attempt && ["failed"].includes(String(attempt.status))) {
      attempt.retryCount = Number(attempt.retryCount || 0) + 1;
      attempt.status = "queued";
      attempt.phase = "RINGING";
      attempt.inputTarget = "none";
      attempt.introCompleted = false;
      attempt.gatherOpen = false;
      attempt.flowStep = "dialing";
      attempt.error = "";
      attempt.dialLockedAt = now;
      attempt.introAudioUrl = attemptFields.introAudioUrl;
      attempt.eventNameAudioUrl = attemptFields.eventNameAudioUrl;
      attempt.audioMode = attemptFields.audioMode;
      await attempt.save();
      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        {
          $push: {
            timeline: {
              $each: [
                {
                  at: now,
                  source: "server",
                  kind: "retry",
                  label: "נפתח ניסיון חיוג נוסף",
                  detail: "",
                  eventType: "",
                  digit: "",
                  stage: "",
                },
              ],
              $slice: -120,
            },
          },
        }
      );
    } else {
      const allowed = isIvrDialAllowed(phone);
      attempt = await IvrCallAttempt.create({
        ...attemptFields,
        status: allowed ? "queued" : "canceled",
        phase: allowed ? "RINGING" : "COMPLETED",
        inputTarget: "none",
        introCompleted: false,
        gatherOpen: false,
        flowStep: allowed ? "dialing" : "done",
        dialLockedAt: now,
        endedAt: allowed ? null : now,
        durationSeconds: 0,
        error: allowed ? "" : "DIAL_BLOCKED_TEST_MODE",
        retryCount: 0,
        timeline: [
          {
            at: now,
            source: "server",
            kind: allowed ? "queued" : "blocked",
            label: allowed ? "נוצר ניסיון חיוג" : "בוטל / נחסם",
            detail: allowed ? "" : "DIAL_BLOCKED_TEST_MODE",
            eventType: "",
            digit: "",
            stage: "",
          },
        ],
      });
    }

    if (!isIvrDialAllowed(phone)) {
      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: "canceled",
            flowStep: "done",
            endedAt: now,
            error: "DIAL_BLOCKED_TEST_MODE",
          },
        }
      );
      results.push({
        guestId,
        phone,
        status: "blocked_test_mode",
        attemptId: String(attempt._id),
        reason: "DIAL_BLOCKED_TEST_MODE",
      });
      continue;
    }

    try {
      const clientState = {
        source: "invistimo-ivr",
        ivr: true,
        callAttemptId: String(attempt._id),
        userId: input.due.userId,
        invitationId: input.due.invitationId,
        guestId,
        round: input.due.round,
        event_id: input.due.invitationId,
        guest_id: guestId,
        round_id: String(input.due.round),
        call_attempt_id: String(attempt._id),
        voiceGender: input.due.voiceGender,
      };

      const created = await createIvrOutboundCall({
        to: phone,
        webhookUrl: input.webhookUrl,
        clientState,
      });

      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: "initiated",
            telnyxCallControlId: created.callControlId,
            telnyxCallLegId: created.callLegId,
            telnyxCallSessionId: created.callSessionId,
            telnyxConnectionId: created.connectionId,
            dialRequestedAt: new Date(),
          },
          $push: {
            timeline: {
              $each: [
                {
                  at: new Date(),
                  source: "server",
                  kind: "dial_requested",
                  label: "נשלחה בקשת חיוג ל-Telnyx",
                  detail: "",
                  eventType: "",
                  digit: "",
                  stage: "",
                },
              ],
              $slice: -120,
            },
          },
        }
      );

      dialed += 1;
      results.push({
        guestId,
        phone,
        status: "initiated",
        attemptId: String(attempt._id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "DIAL_FAILED";
      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: "failed",
            flowStep: "done",
            endedAt: new Date(),
            error: message,
          },
          $push: {
            timeline: {
              $each: [
                {
                  at: new Date(),
                  source: "server",
                  kind: "dial_failed",
                  label: "ניסיון החיוג נכשל",
                  detail: message.slice(0, 300),
                  eventType: "",
                  digit: "",
                  stage: "",
                },
              ],
              $slice: -120,
            },
          },
        }
      );
      results.push({
        guestId,
        phone,
        status: "failed",
        attemptId: String(attempt._id),
        reason: message,
      });
    }
  }

  const attempts = await IvrCallAttempt.find({
    invitationId: input.due.invitationId,
    round: input.due.round,
    channel: "outbound_ivr",
  })
    .select("status error")
    .lean();

  const live = (await countOccupiedOutboundCalls()) > 0;
  const anyPlaced = attempts.some((a) =>
    ["initiated", "ringing", "answered", "completed", "no_answer", "busy", "voicemail", "hangup_before_response"].includes(
      String(a.status)
    )
  );
  const failureReason =
    results.find((r) => r.status === "failed" || r.status === "blocked_test_mode")
      ?.reason || "";

  let status = "in_progress";
  if (!hitCap && !live) {
    status = anyPlaced || attempts.length === 0 ? "done" : "failed";
  }

  await setRoundExecution({
    userId: input.due.userId,
    round: input.due.round,
    status,
    now,
    failureReason:
      status === "failed"
        ? explainIvrCallFailure(failureReason || "החיוג נכשל")
        : "",
    tasksCreated: results.filter((r) =>
      ["initiated", "blocked_test_mode"].includes(r.status)
    ).length,
    clearClaim: true,
    openedAt: now,
    eligibleCount: eligible.length,
  });

  return {
    invitationId: input.due.invitationId,
    round: input.due.round,
    eligibleCount: eligible.length,
    dialed,
    status,
    results,
    appBaseUrl: getAppBaseUrl(),
  };
}

/** When a live channel ends, dial the next eligible guest without waiting for cron. */
export async function fillIvrRoundCapacity(input: {
  userId: string;
  invitationId: string;
  round: number;
}) {
  const round = Number(input.round);
  if (round !== 1 && round !== 2 && round !== 3) return null;

  const now = new Date();
  const user = (await User.findById(input.userId)
    .select(
      "_id name email includeCalls callsType callRoundsSchedule ivrConfig"
    )
    .lean()) as any;
  if (!user || !isIvrCallsUser(user)) return null;

  const rounds = Array.isArray(user?.callRoundsSchedule?.rounds)
    ? user.callRoundsSchedule.rounds
    : [];
  const raw = rounds.find(
    (item: any) => Number(item?.roundNumber || item?.round || 0) === round
  );
  if (!raw || isRoundTerminal(raw)) return null;

  const scheduledAt = parseCallRoundScheduledAt(raw?.scheduledAt);
  if (!scheduledAt) return null;
  if (
    !isCallRoundDue({
      scheduledAt,
      dateKey: getCallRoundDateKeyInIsrael(now),
      now,
      force: false,
    })
  ) {
    return null;
  }

  const audio = resolveRoundAudio(user);
  if (!audio.audioReady) return null;

  const baseUrl = getAppBaseUrl();
  const webhookUrl =
    process.env.TELNYX_IVR_WEBHOOK_URL ||
    (baseUrl ? `${baseUrl}/api/telnyx/ivr/webhook` : "");
  if (!webhookUrl) return null;

  return executeIvrRound({
    due: {
      userId: String(user._id),
      invitationId: String(input.invitationId),
      round,
      scheduledAt,
      introAudioUrl: audio.introAudioUrl,
      eventNameAudioUrl: audio.eventNameAudioUrl,
      composedIntroAudioUrl: audio.composedIntroAudioUrl,
      voiceGender: audio.voiceGender,
      audioMode: audio.audioMode,
      clientName: cleanStr(user.name) || cleanStr(user.email) || "לקוח",
      audioReady: audio.audioReady,
      audioBlockReason: audio.audioBlockReason,
    },
    webhookUrl,
    maxCalls: ivrMaxParallelCalls(),
    now,
  });
}
