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
import { createIvrRoundRunId } from "@/lib/calls/ivrRoundSchedule";
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

/** Live legs for one invitation round only — never use the global cap here. */
async function countOccupiedOutboundCallsForRound(
  invitationId: string,
  round: number
) {
  const id = cleanStr(invitationId);
  const roundNumber = Number(round);
  if (!id || (roundNumber !== 1 && roundNumber !== 2 && roundNumber !== 3)) {
    return 0;
  }
  return IvrCallAttempt.countDocuments({
    ...occupiedOutboundFilter(),
    invitationId: id,
    round: roundNumber,
  });
}

/**
 * Close rounds stuck on in_progress/opened after every attempt for the
 * CURRENT runId has left the live set. Prior-run history is ignored.
 * Does not delete history or touch RSVP.
 */
async function reconcileIdleRoundStatuses(input: {
  userId: string;
  invitationId: string;
  rounds: any[];
  now: Date;
}) {
  for (const raw of input.rounds) {
    const roundNumber = Number(raw?.roundNumber || raw?.round || 0);
    if (roundNumber !== 1 && roundNumber !== 2 && roundNumber !== 3) continue;
    const status = String(raw?.status || "")
      .trim()
      .toLowerCase();
    if (status !== "in_progress" && status !== "opened") continue;

    const live = await countOccupiedOutboundCallsForRound(
      input.invitationId,
      roundNumber
    );
    if (live > 0) continue;

    const runId = cleanStr(raw?.runId);
    const attemptFilter: Record<string, unknown> = {
      invitationId: input.invitationId,
      round: roundNumber,
      channel: "outbound_ivr",
    };
    // Only the current schedule-run counts. Legacy rows without runId are
    // ignored once a runId exists — otherwise old dials falsely close a reopen.
    if (runId) {
      attemptFilter.runId = runId;
    }

    const attempts = await IvrCallAttempt.countDocuments(attemptFilter);

    await setRoundExecution({
      userId: input.userId,
      round: roundNumber,
      status: attempts > 0 ? "done" : "failed",
      now: input.now,
      failureReason:
        attempts > 0
          ? ""
          : explainIvrCallFailure("הסבב נסגר — לא נמצאו ניסיונות חיוג"),
      clearClaim: true,
    });
    raw.status = attempts > 0 ? "done" : "failed";
  }
}

function earlierRoundStillRunning(rounds: any[], roundNumber: number) {
  for (const raw of rounds) {
    const n = Number(raw?.roundNumber || raw?.round || 0);
    if (n < 1 || n >= roundNumber) continue;
    const status = String(raw?.status || "")
      .trim()
      .toLowerCase();
    if (status === "in_progress" || status === "opened") return true;
  }
  return false;
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
  /** Current schedule-run id — scopes attempts so history cannot block redial. */
  runId: string;
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

function diagnoseAiAudioBlock(user: any): string {
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
  const approvedLocked = approvedPlaybackUrl(cfg, "");
  composedIntroAudioUrl = approvedPlaybackUrl(cfg, composedIntroAudioUrl);

  const approval = cfg.recordingApproval;
  const legacyApproved =
    !approval &&
    eventAudio?.approved === true &&
    composed?.approved === true;
  const explicitlyApproved =
    approval?.approved === true &&
    approval?.audioMode !== "self_recorded";

  if (!gender) {
    return "לא נבחר קול קריינות (נקבה/זכר) אצל הלקוח";
  }
  if (String(composed?.composeVersion || "") !== IVR_COMPOSE_VERSION) {
    return `הקובץ המחובר בגרסה ישנה או חסרה (${String(composed?.composeVersion || "חסר")} ≠ ${IVR_COMPOSE_VERSION}) — יש ליצור מחדש את הקובץ המחובר ולאשר`;
  }
  if (
    explicitlyApproved &&
    approval?.audioContentHash &&
    composed?.contentHash &&
    String(approval.audioContentHash) !== String(composed.contentHash)
  ) {
    return "אישור ההקלטה מצביע על קובץ מחובר אחר מהקובץ הנוכחי — יש להאזין ולאשר מחדש את התצוגה המקדימה";
  }
  if (!eventNameAudioUrl) {
    return "חסר קובץ שם האירוע או טוקן מדיה תקין";
  }
  if (!composedIntroAudioUrl) {
    if (approval?.approved === true && !approvedLocked) {
      return "אישור ההקלטה קיים אבל טוקן/כתובת השמע של ה־recordingApproval אינם תקינים";
    }
    return "חסר קובץ מחובר יוצא או טוקן מדיה תקין";
  }
  if (eventAudio?.status !== "ready") {
    return `שם האירוע אינו במצב מוכן (status=${String(eventAudio?.status || "חסר")})`;
  }
  if (composed?.status !== "ready") {
    return `הקובץ המחובר אינו במצב מוכן (status=${String(composed?.status || "חסר")})`;
  }
  if (eventAudio?.approved !== true && approval?.approved !== true) {
    return "שם האירוע לא אושר להשמעה";
  }
  if (composed?.approved !== true && approval?.approved !== true) {
    return "הקובץ המחובר לא אושר להשמעה";
  }
  if (!legacyApproved && !explicitlyApproved) {
    if (approval && approval.approved === true && approval.audioMode === "self_recorded") {
      return "אישור ההקלטה הוא למצב הקלטה עצמית, בעוד שהלקוח במצב AI — יש לאשר מחדש את הקריינות";
    }
    if (approval && approval.approved !== true) {
      return "הקריינות ממתינה לאישור (recordingApproval.approved ≠ true)";
    }
    return "אין אישור תקף לקריינות AI (recordingApproval / approved)";
  }
  return "אין הקלטת AI מאושרת לשיחות";
}

function diagnoseSelfAudioBlock(user: any): string {
  const intro = user?.ivrConfig?.introAudio;
  const approval = user?.ivrConfig?.recordingApproval;
  const token = cleanStr(intro?.publicToken);
  let introAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: token,
    storedUrl: intro?.audioUrl,
  });
  introAudioUrl = approvedPlaybackUrl(user?.ivrConfig, introAudioUrl);

  if (!introAudioUrl) {
    if (approval?.approved === true) {
      return "אישור הקלטה עצמית קיים אבל טוקן/כתובת השמע אינם תקינים";
    }
    return "חסרה הקלטה עצמית או טוקן מדיה תקין";
  }
  if (intro?.status !== "ready") {
    return `ההקלטה העצמית אינה במצב מוכן (status=${String(intro?.status || "חסר")})`;
  }
  if (intro?.approved !== true && approval?.approved !== true) {
    return "ההקלטה העצמית לא אושרה להשמעה";
  }
  if (
    approval &&
    !(approval.approved === true && approval.audioMode === "self_recorded") &&
    intro?.approved !== true
  ) {
    return "אין אישור תקף להקלטה עצמית (recordingApproval)";
  }
  return "אין הקלטה עצמית מאושרת לשיחות";
}

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

  // Locked approval must point at the same composed checksum (preview identity).
  if (
    explicitlyApproved &&
    approval?.audioContentHash &&
    composed?.contentHash &&
    String(approval.audioContentHash) !== String(composed.contentHash)
  ) {
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
      audioBlockReason = diagnoseSelfAudioBlock(user);
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
      audioBlockReason = diagnoseAiAudioBlock(user);
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

/** Approved + ready narration check shared by cron and admin open-now. */
export function resolveIvrRoundAudio(user: any) {
  return resolveRoundAudio(user);
}

/** Compact diagnostics for admin UI — never bypasses readiness gates. */
export function describeIvrAudioDiagnostics(user: any) {
  const cfg = user?.ivrConfig || {};
  const audio = resolveRoundAudio(user);
  const composed = cfg.composedIntroAudio || {};
  const eventAudio = cfg.eventNameAudio || {};
  const approval = cfg.recordingApproval || null;
  return {
    audioReady: audio.audioReady,
    audioBlockReason: audio.audioBlockReason || "",
    audioMode: audio.audioMode,
    voiceGender: audio.voiceGender,
    composeVersion: String(composed?.composeVersion || ""),
    requiredComposeVersion: IVR_COMPOSE_VERSION,
    eventNameStatus: String(eventAudio?.status || ""),
    eventNameApproved: eventAudio?.approved === true,
    composedStatus: String(composed?.status || ""),
    composedApproved: composed?.approved === true,
    recordingApprovalApproved: approval?.approved === true,
    recordingApprovalMode: String(approval?.audioMode || ""),
    hasComposedToken: Boolean(cleanStr(composed?.publicToken)),
    hasEventNameToken: Boolean(cleanStr(eventAudio?.publicToken)),
    hasApprovedPlaybackUrl: Boolean(
      approvedPlaybackUrl(cfg, "") || audio.introAudioUrl
    ),
  };
}

/**
 * Admin / manual open of one IVR round.
 * Reuses executeIvrRound — never a separate dial path.
 * Ignores the schedule due-window (open now) but never bypasses audio,
 * eligibility, claim, parallel-cap, or live-dial gates inside executeIvrRound.
 */
export async function openIvrRoundManually(input: {
  userId: string;
  round: number;
  webhookUrl: string;
  maxCalls?: number;
  now?: Date;
  /** When true, allow opening a done/failed/cancelled round after clearing live legs. */
  reopenIfDone?: boolean;
}) {
  const round = Number(input.round);
  if (round !== 1 && round !== 2 && round !== 3) {
    return {
      ok: false as const,
      error: "INVALID_ROUND",
      message: "סבב לא תקין",
    };
  }

  const now = input.now || new Date();
  const user = (await User.findById(input.userId)
    .select(
      "_id name email includeCalls callsType callRoundsSchedule ivrConfig isActive"
    )
    .lean()) as any;

  if (!user || !isIvrCallsUser(user)) {
    return {
      ok: false as const,
      error: "NOT_IVR_USER",
      message: "המשתמש אינו בחבילת שיחות מוקלטות",
    };
  }

  if (user.isActive === false) {
    return {
      ok: false as const,
      error: "USER_INACTIVE",
      message: "המשתמש אינו פעיל",
    };
  }

  const invitation = await Invitation.findOne({ ownerId: user._id })
    .select("_id ownerId")
    .sort({ eventDate: 1, createdAt: -1 })
    .lean();

  if (!invitation?._id) {
    return {
      ok: false as const,
      error: "NO_INVITATION",
      message: "לא נמצאה הזמנה למשתמש",
    };
  }

  const rounds = Array.isArray(user?.callRoundsSchedule?.rounds)
    ? user.callRoundsSchedule.rounds
    : [];

  await reconcileIdleRoundStatuses({
    userId: String(user._id),
    invitationId: String(invitation._id),
    rounds,
    now,
  });

  let raw = rounds.find(
    (item: any) => Number(item?.roundNumber || item?.round || 0) === round
  );

  if (!raw) {
    return {
      ok: false as const,
      error: "ROUND_MISSING",
      message: "הסבב לא מוגדר בלו״ז",
    };
  }

  const liveBefore = await countOccupiedOutboundCallsForRound(
    String(invitation._id),
    round
  );
  if (liveBefore > 0) {
    return {
      ok: false as const,
      error: "ROUND_ALREADY_RUNNING",
      message: "הסבב כבר מתבצע — אין לפתוח חיוג כפול",
    };
  }

  if (isRoundTerminal(raw)) {
    const status = String(raw?.status || "").toLowerCase();
    const canReopenTerminal =
      input.reopenIfDone === true &&
      (status === "done" ||
        status === "completed" ||
        status === "failed" ||
        status === "cancelled" ||
        status === "canceled");
    if (!canReopenTerminal) {
      return {
        ok: false as const,
        error: "ROUND_TERMINAL",
        message:
          status === "done" || status === "completed"
            ? "הסבב כבר הושלם — השתמשו ב״פתח מחדש סבב״"
            : status === "failed"
              ? "הסבב נכשל — יש לפתוח מחדש לפני חיוג"
              : "הסבב מבוטל או סגור",
        status,
      };
    }

    const reopen = await setIvrRoundAdminStatus({
      userId: String(user._id),
      round,
      action: "reopen",
      now,
      invitationId: String(invitation._id),
    });
    if (!reopen.ok) {
      return reopen;
    }
    raw = {
      ...raw,
      status: reopen.status,
      dialClaimedAt: null,
      failureReason: "",
    };
  }

  const status = String(raw?.status || "")
    .trim()
    .toLowerCase();
  if (status === "in_progress" || status === "opened") {
    // Live legs already checked above; clear stale claim so execute can claim.
    await User.updateOne(
      {
        _id: user._id,
        "callRoundsSchedule.rounds.roundNumber": round,
      },
      {
        $set: {
          "callRoundsSchedule.rounds.$.status": "scheduled",
          "callRoundsSchedule.rounds.$.dialClaimedAt": null,
          "callRoundsSchedule.rounds.$.updatedAt": now,
        },
      }
    );
  }

  if (earlierRoundStillRunning(rounds, round)) {
    return {
      ok: false as const,
      error: "EARLIER_ROUND_RUNNING",
      message: "סבב קודם עדיין מתבצע",
    };
  }

  if (process.env.IVR_ALLOW_LIVE_DIAL === "false") {
    return {
      ok: false as const,
      error: "LIVE_DIAL_DISABLED",
      message: "חיוגי IVR מושבתים זמנית במערכת (IVR_ALLOW_LIVE_DIAL=false)",
    };
  }

  const audio = resolveRoundAudio(user);
  if (!audio.audioReady) {
    return {
      ok: false as const,
      error: "AUDIO_NOT_READY",
      message: audio.audioBlockReason || "אין קריינות מאושרת ונגישה",
      audioBlockReason: audio.audioBlockReason,
    };
  }

  const guests = await InvitationGuest.find({
    invitationId: invitation._id,
  }).lean();
  const eligible = filterGuestsForIvrRound({
    guests,
    round: round as IvrRoundNumber,
  });

  if (eligible.length < 1) {
    return {
      ok: false as const,
      error: "NO_ELIGIBLE_GUESTS",
      message: "אין אורחים זכאים לחיוג בסבב זה",
      eligibleCount: 0,
    };
  }

  const scheduledAt =
    parseCallRoundScheduledAt(raw?.scheduledAt) || now;
  let runId = cleanStr(raw?.runId);
  if (!runId) {
    runId = createIvrRoundRunId(round);
    await User.updateOne(
      {
        _id: user._id,
        "callRoundsSchedule.rounds.roundNumber": round,
      },
      {
        $set: {
          "callRoundsSchedule.rounds.$.runId": runId,
          "callRoundsSchedule.rounds.$.updatedAt": now,
        },
      }
    );
  }

  const result = await executeIvrRound({
    due: {
      userId: String(user._id),
      invitationId: String(invitation._id),
      round: round as IvrRoundNumber,
      scheduledAt,
      runId,
      introAudioUrl: audio.introAudioUrl,
      eventNameAudioUrl: audio.eventNameAudioUrl,
      composedIntroAudioUrl: audio.composedIntroAudioUrl,
      voiceGender: audio.voiceGender,
      audioMode: audio.audioMode,
      clientName: cleanStr(user.name) || cleanStr(user.email) || "לקוח",
      audioReady: audio.audioReady,
      audioBlockReason: audio.audioBlockReason,
    },
    webhookUrl: input.webhookUrl,
    maxCalls: input.maxCalls,
    now,
  });

  if ((result as any)?.blocked) {
    return {
      ok: false as const,
      error: "AUDIO_BLOCKED",
      message:
        (result as any)?.reason ||
        audio.audioBlockReason ||
        "החיוג נחסם — אין קריינות תקינה",
      result,
      eligibleCount: eligible.length,
    };
  }

  if ((result as any)?.skipped) {
    return {
      ok: false as const,
      error: String((result as any)?.reason || "SKIPPED"),
      message:
        (result as any)?.reason === "ROUND_ALREADY_RUNNING"
          ? "הסבב כבר מתבצע — אין לפתוח חיוג כפול"
          : (result as any)?.reason === "PARALLEL_CAP"
            ? "מגבלת חיוגים מקבילים — נסו שוב בעוד רגע"
            : "הסבב לא נפתח",
      result,
      eligibleCount: eligible.length,
    };
  }

  return {
    ok: true as const,
    eligibleCount: eligible.length,
    result,
  };
}

/**
 * Admin parity with WhatsApp/SMS message-round controls:
 * - reset / reopen: clear execution lock so the round can be rescheduled
 * - block / stop: cancel so cron/manual dial will not run
 * - unblock / resume: clear an admin block
 *
 * Never dials. Never deletes IvrCallAttempt history or guest RSVP.
 * Audio approval is checked only later inside executeIvrRound.
 */
export async function setIvrRoundAdminStatus(input: {
  userId: string;
  round: number;
  action: "stop" | "resume" | "reopen" | "block" | "unblock" | "reset";
  now?: Date;
  invitationId?: string;
}) {
  const round = Number(input.round);
  if (round !== 1 && round !== 2 && round !== 3) {
    return { ok: false as const, error: "INVALID_ROUND", message: "סבב לא תקין" };
  }

  const now = input.now || new Date();
  const action =
    input.action === "block"
      ? "stop"
      : input.action === "unblock"
        ? "resume"
        : input.action === "reset"
          ? "reopen"
          : input.action;

  const user = (await User.findById(input.userId)
    .select("_id callRoundsSchedule includeCalls callsType")
    .lean()) as any;

  if (!user || !isIvrCallsUser(user)) {
    return {
      ok: false as const,
      error: "NOT_IVR_USER",
      message: "המשתמש אינו בחבילת שיחות מוקלטות",
    };
  }

  const existingRounds = Array.isArray(user?.callRoundsSchedule?.rounds)
    ? [...user.callRoundsSchedule.rounds]
    : [];

  // Ensure all three IVR rounds exist (same shape the client schedule uses).
  const rounds = [1, 2, 3].map((roundNumber) => {
    const existing = existingRounds.find(
      (item: any) => Number(item?.roundNumber || item?.round || 0) === roundNumber
    );
    if (existing) return { ...existing, roundNumber };
    return {
      roundNumber,
      title: `סבב מוקלט ${roundNumber}`,
      scheduledAt: null,
      callType: "ivr",
      status: "draft",
      notes: "",
      failureReason: "",
      dialClaimedAt: null,
      openedAt: null,
      tasksCreated: null,
      updatedAt: now,
      createdAt: now,
    };
  });

  const idx = rounds.findIndex(
    (item: any) => Number(item?.roundNumber || item?.round || 0) === round
  );
  const current = rounds[idx];

  if (input.invitationId) {
    const live = await countOccupiedOutboundCallsForRound(
      String(input.invitationId),
      round
    );
    if (live > 0 && (action === "reopen" || action === "stop")) {
      return {
        ok: false as const,
        error: "ROUND_ALREADY_RUNNING",
        message: "יש שיחות פעילות בסבב — אין לשנות סטטוס תוך כדי חיוג",
      };
    }
  }

  if (action === "stop") {
    // Block like WhatsApp/SMS — allowed even when previously marked done.
    rounds[idx] = {
      ...current,
      status: "cancelled",
      dialClaimedAt: null,
      failureReason: "חסום ידנית מהאדמין",
      updatedAt: now,
    };
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          callRoundsSchedule: {
            enabled: true,
            rounds,
          },
        },
      }
    );
    return { ok: true as const, status: "cancelled", blocked: true };
  }

  if (action === "reopen" || action === "resume") {
    const hasSchedule = Boolean(parseCallRoundScheduledAt(current?.scheduledAt));
    const nextStatus = hasSchedule ? "scheduled" : "draft";
    // Reset execution lock + mint a new runId so prior attempts cannot block
    // the next dial. Attempts and guest RSVP stay intact.
    // Allowed even when narration is not approved — dial gates run later.
    rounds[idx] = {
      ...current,
      status: nextStatus,
      dialClaimedAt: null,
      failureReason: "",
      runId: hasSchedule ? createIvrRoundRunId(round) : "",
      // Keep openedAt/tasksCreated history markers; do not wipe dial history.
      updatedAt: now,
    };
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          callRoundsSchedule: {
            enabled: true,
            rounds,
          },
        },
      }
    );
    return {
      ok: true as const,
      status: nextStatus,
      blocked: false,
      reopened: true,
    };
  }

  return {
    ok: false as const,
    error: "UNKNOWN_ACTION",
    message: "פעולה לא מוכרת",
  };
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

    // Close idle in_progress/opened rounds before deciding what is due.
    await reconcileIdleRoundStatuses({
      userId: String(user._id),
      invitationId: String(invitation._id),
      rounds,
      now,
    });

    for (const raw of rounds) {
      const roundNumber = Number(raw?.roundNumber || raw?.round || 0) as
        | IvrRoundNumber
        | number;
      if (roundNumber !== 1 && roundNumber !== 2 && roundNumber !== 3) continue;
      if (isRoundTerminal(raw)) continue;
      // One round at a time per event — later rounds wait until earlier ones close.
      if (earlierRoundStillRunning(rounds, roundNumber)) continue;

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

      // Ensure every due round has a runId (legacy schedules minted on first due).
      let runId = cleanStr(raw?.runId);
      if (!runId) {
        runId = createIvrRoundRunId(roundNumber);
        await User.updateOne(
          {
            _id: user._id,
            "callRoundsSchedule.rounds.roundNumber": roundNumber,
          },
          {
            $set: {
              "callRoundsSchedule.rounds.$.runId": runId,
              "callRoundsSchedule.rounds.$.updatedAt": now,
            },
          }
        );
        raw.runId = runId;
      }

      due.push({
        userId: String(user._id),
        invitationId: String(invitation._id),
        round: roundNumber,
        scheduledAt,
        runId,
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
    const runId = cleanStr(input.due.runId);
    // Scope by runId so a rescheduled round can dial again. Legacy attempts
    // without runId never match a new run and cannot block redial.
    const existing = runId
      ? await IvrCallAttempt.findOne({
          invitationId: input.due.invitationId,
          guestId,
          round: input.due.round,
          channel: "outbound_ivr",
          runId,
        })
      : await IvrCallAttempt.findOne({
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
          runId,
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
      runId,
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

  const runAttemptFilter: Record<string, unknown> = {
    invitationId: input.due.invitationId,
    round: input.due.round,
    channel: "outbound_ivr",
  };
  if (cleanStr(input.due.runId)) {
    runAttemptFilter.runId = cleanStr(input.due.runId);
  }
  const attempts = await IvrCallAttempt.find(runAttemptFilter)
    .select("status error")
    .lean();

  // Round completion depends only on THIS round's live legs. A parallel
  // event's ringing call must not keep another client's round "מתבצע".
  const liveForRound =
    (await countOccupiedOutboundCallsForRound(
      input.due.invitationId,
      input.due.round
    )) > 0;
  const anyPlaced = attempts.some((a) =>
    ["initiated", "ringing", "answered", "completed", "no_answer", "busy", "voicemail", "hangup_before_response"].includes(
      String(a.status)
    )
  );
  let failureReason =
    results.find((r) => r.status === "failed" || r.status === "blocked_test_mode")
      ?.reason || "";

  let status = "in_progress";
  if (!hitCap && !liveForRound) {
    // Never mark a round "done" when no dial history exists — that falsely
    // locked admin/client rounds as הושלם with zero attempts.
    if (anyPlaced) {
      status = "done";
    } else if (attempts.length === 0) {
      status = "failed";
      if (!failureReason) {
        failureReason =
          eligible.length === 0
            ? "אין אורחים זכאים לחיוג"
            : "לא בוצע אף חיוג בסבב";
      }
    } else {
      status = "failed";
    }
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
  await reconcileIdleRoundStatuses({
    userId: String(user._id),
    invitationId: String(input.invitationId),
    rounds,
    now,
  });

  const raw = rounds.find(
    (item: any) => Number(item?.roundNumber || item?.round || 0) === round
  );
  if (!raw || isRoundTerminal(raw)) return null;
  if (earlierRoundStillRunning(rounds, round)) return null;

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

  let runId = cleanStr(raw?.runId);
  if (!runId) {
    runId = createIvrRoundRunId(round);
    await User.updateOne(
      {
        _id: user._id,
        "callRoundsSchedule.rounds.roundNumber": round,
      },
      {
        $set: {
          "callRoundsSchedule.rounds.$.runId": runId,
          "callRoundsSchedule.rounds.$.updatedAt": now,
        },
      }
    );
  }

  return executeIvrRound({
    due: {
      userId: String(user._id),
      invitationId: String(input.invitationId),
      round,
      scheduledAt,
      runId,
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
