/**
 * IVR round dialer: resolve audience at execution time, create attempts, place calls.
 * Never dials unless IVR_ALLOW_LIVE_DIAL=true or phone is on IVR_TEST_PHONE_ALLOWLIST.
 *
 * AI mode plays global pack segments + per-event name sequentially at answer time.
 */

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
import { normalizeIvrVoiceGender } from "@/lib/calls/ivrScript";
import {
  createIvrOutboundCall,
  isIvrDialAllowed,
  normalizePhoneForTelnyx,
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
]);

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
        introAudioUrl,
        eventNameAudioUrl,
        composedIntroAudioUrl,
        voiceGender,
        audioMode,
        clientName: cleanStr(user.name) || cleanStr(user.email) || "לקוח",
        audioReady,
        audioBlockReason,
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
  await User.updateOne(
    {
      _id: input.userId,
      "callRoundsSchedule.rounds.roundNumber": input.round,
    },
    { $set: set }
  );
}

async function claimRound(userId: string, round: number, now: Date) {
  const stale = new Date(now.getTime() - 2 * 60 * 1000);
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
  const maxCalls = Math.max(1, Number(input.maxCalls) || 50);

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

    if (!phone) {
      results.push({
        guestId,
        phone: phoneRaw,
        status: "skipped",
        reason: "bad_phone",
      });
      continue;
    }

    const existing = await IvrCallAttempt.findOne({
      invitationId: input.due.invitationId,
      guestId,
      round: input.due.round,
      channel: "outbound_ivr",
    });

    if (existing) {
      const retryable =
        ["failed"].includes(String(existing.status)) &&
        !cleanStr(existing.telnyxCallControlId) &&
        Number(existing.retryCount || 0) < 2 &&
        cleanStr(existing.error) !== "DIAL_BLOCKED_TEST_MODE";
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
    };

    let attempt = existing;
    if (attempt && ["failed"].includes(String(attempt.status))) {
      attempt.retryCount = Number(attempt.retryCount || 0) + 1;
      attempt.status = "queued";
      attempt.flowStep = "dialing";
      attempt.error = "";
      attempt.dialLockedAt = now;
      attempt.introAudioUrl = attemptFields.introAudioUrl;
      attempt.eventNameAudioUrl = attemptFields.eventNameAudioUrl;
      await attempt.save();
    } else {
      attempt = await IvrCallAttempt.create({
        ...attemptFields,
        status: isIvrDialAllowed(phone) ? "queued" : "canceled",
        flowStep: isIvrDialAllowed(phone) ? "dialing" : "done",
        dialLockedAt: now,
        endedAt: isIvrDialAllowed(phone) ? null : now,
        durationSeconds: 0,
        error: isIvrDialAllowed(phone) ? "" : "DIAL_BLOCKED_TEST_MODE",
        retryCount: 0,
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
        reason: "החיוג חסום — אין אישור חיוג חי למספר זה",
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

  const live = attempts.some((a) => LIVE_ATTEMPT_STATUSES.has(String(a.status)));
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
    failureReason: status === "failed" ? failureReason || "החיוג נכשל" : "",
    tasksCreated: results.filter((r) =>
      ["initiated", "blocked_test_mode"].includes(r.status)
    ).length,
    clearClaim: true,
    openedAt: now,
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
