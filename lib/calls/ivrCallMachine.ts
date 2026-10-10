/**
 * Drive the shared IVR phase machine on a live Telnyx leg.
 * Inbound and outbound both enter here after a real call.answered.
 * An input prompt is gather_using_audio on the approved file: Telnyx stops
 * that playback when a digit arrives. The follow-up starts after playback
 * has ended, and only a gather release (never a late playback stop) runs
 * first when a gather is still open.
 */

import type { QueryFilter } from "mongoose";
import IvrCallAttempt, { type IIvrCallAttempt } from "@/models/IvrCallAttempt";
import { applyIvrRsvpToGuest } from "@/lib/calls/ivrApplyRsvp";
import {
  flowStepForMachine,
  invalidChoiceAllowed,
  machinePersistFields,
  playsInvalidChoicePrompt,
  readIvrMachineState,
  reduceIvrCall,
  type IvrCallMachineState,
  type IvrFollowUpSlot,
  type IvrMachineCommand,
} from "@/lib/calls/ivrCallPhase";
import {
  getGlobalPackSegmentUrl,
  getIvrSystemAudioUrlForGender,
  warmIvrChoiceFollowUps,
} from "@/lib/calls/ivrSystemAudio";
import {
  normalizeIvrVoiceGender,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";
import { pushIvrTimeline } from "@/lib/calls/ivrCallTimeline";
import {
  decodeIvrClientState,
  gatherIvrDigits,
  gatherIvrUsingAudio,
  hangupIvrCall,
  mediaClearReasonForPlaybackStage,
  playbackIvrAudio,
  speakIvrCall,
} from "@/lib/telnyx/ivrCallControl";

const CHOICE_TIMEOUT_MS = 15000;
const COUNT_TIMEOUT_MS = 20000;
const COUNT_DIGIT_MAX = 3;
const COUNT_INTER_DIGIT_MS = 2500;

const AUDIO_NOT_READY_TEXT =
  "שלום, לא ניתן כרגע להשמיע את קריינות האירוע. אנא נסו שוב מאוחר יותר.";

const LEGACY_CHAIN_STEPS = new Set([
  "playing_event_name",
  "playing_intro_after",
  "gather_choice",
  "gather_count",
  "playing_ask_count",
  "playing_thanks",
  "playing_invalid",
  "playing_system",
  "done",
]);

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isInbound(attempt: any) {
  return (
    cleanStr(attempt?.channel) === "inbound_ivr" ||
    cleanStr(attempt?.direction) === "inbound"
  );
}

function voiceGender(attempt: any): IvrVoiceGender {
  return normalizeIvrVoiceGender(attempt?.voiceGender) || "female";
}

function telnyxCommandFailed(result: {
  errors?: unknown;
  data?: { error?: unknown } | Record<string, unknown>;
} | void) {
  if (!result) return false;
  if (result.errors) return true;
  const data = result.data;
  if (!data || typeof data !== "object") return false;
  return Boolean((data as { error?: unknown }).error);
}

function clientState(attempt: any, extra: Record<string, unknown>) {
  return {
    source: "invistimo-ivr",
    ivr: true,
    ...(isInbound(attempt) ? { inbound_ivr: true, channel: "inbound_ivr" } : {}),
    callAttemptId: String(attempt._id),
    call_attempt_id: String(attempt._id),
    voiceGender: voiceGender(attempt),
    ...extra,
  };
}

function payloadOf(body: any) {
  return body?.data?.payload || body?.payload || {};
}

/**
 * True only for calls already mid three-clip chain without a phase.
 * New answered legs always use the shared phase machine — never switch
 * into legacy mid-call once phase is set.
 */
export function isLegacyInFlight(attempt: any) {
  if (cleanStr(attempt?.phase)) return false;
  return LEGACY_CHAIN_STEPS.has(cleanStr(attempt?.flowStep));
}

async function note(attemptId: unknown, label: string, detail = "") {
  await pushIvrTimeline(attemptId, {
    source: "server",
    kind: "phase",
    label,
    detail,
  }).catch(() => null);
}

export async function applyRsvpOnce(input: {
  attempt: any;
  rsvp: "yes" | "no" | "maybe";
  attendingCount?: number | null;
}) {
  if (input.attempt.rsvpApplied) {
    return { applied: false, reason: "already_applied" };
  }
  if (cleanStr(input.attempt.error) === "AMBIGUOUS_EVENT") {
    return { applied: false, reason: "ambiguous_event" };
  }
  if (input.attempt.phase && input.attempt.introCompleted !== true) {
    return { applied: false, reason: "intro_not_completed" };
  }
  if (!input.attempt.guestId || !input.attempt.invitationId) {
    return { applied: false, reason: "no_guest" };
  }

  const claimed = await IvrCallAttempt.findOneAndUpdate(
    {
      _id: input.attempt._id,
      rsvpApplied: false,
      error: { $ne: "AMBIGUOUS_EVENT" },
    },
    {
      $set: {
        rsvpApplied: true,
        rsvpAppliedAt: new Date(),
        rsvpResult: input.rsvp,
        attendingCount:
          typeof input.attendingCount === "number" ? input.attendingCount : null,
        status: "completed",
      },
      $push: {
        timeline: {
          $each: [
            {
              at: new Date(),
              source: "server",
              kind: "rsvp_saved",
              label: "נשמרה תשובה ברשומה",
              detail: `${input.rsvp}${
                typeof input.attendingCount === "number"
                  ? `:${input.attendingCount}`
                  : ""
              }`,
              eventType: "",
              digit: "",
              stage: "",
            },
          ],
          $slice: -120,
        },
      },
    },
    { new: true }
  );

  if (!claimed) {
    return { applied: false, reason: "race_already_applied" };
  }

  try {
    await applyIvrRsvpToGuest({
      guestId: String(claimed.guestId),
      invitationId: String(claimed.invitationId),
      rsvp: input.rsvp,
      attendingCount: input.attendingCount,
      respondedAt: claimed.rsvpAppliedAt || new Date(),
      round: claimed.round ?? null,
      callAttemptId: String(claimed._id),
      callControlId: String(claimed.telnyxCallControlId || ""),
      source: isInbound(claimed) ? "inbound" : "outbound",
    });
  } catch (error) {
    await IvrCallAttempt.updateOne(
      { _id: claimed._id, promptKind: { $ne: "thanks" } },
      {
        $set: {
          rsvpApplied: false,
          rsvpAppliedAt: null,
          rsvpResult: null,
          status: "answered",
          phase: "WAITING_FOR_INPUT",
          inputTarget: claimed.choiceDigit === "1" ? "count" : "choice",
          gatherOpen: true,
          introCompleted: true,
          flowStep: claimed.choiceDigit === "1" ? "gather_count" : "gather_choice",
          choiceDigit: claimed.choiceDigit === "1" ? "1" : "",
          promptKind: "",
        },
      }
    );
    await IvrCallAttempt.updateOne(
      { _id: claimed._id, promptKind: "thanks" },
      {
        $set: {
          rsvpApplied: false,
          rsvpAppliedAt: null,
          rsvpResult: null,
          status: "answered",
        },
      }
    );
    throw error;
  }

  input.attempt.rsvpApplied = true;
  input.attempt.status = "completed";
  return { applied: true };
}

async function claimFields(
  attemptId: unknown,
  filter: Record<string, unknown>,
  state: IvrCallMachineState,
  extra: Record<string, unknown> = {}
) {
  return IvrCallAttempt.findOneAndUpdate(
    { ...filter, _id: attemptId } as QueryFilter<IIvrCallAttempt>,
    { $set: { ...machinePersistFields(state), ...extra } },
    { new: true }
  );
}

function copyClaim(attempt: any, claimed: any) {
  if (!claimed) return;
  attempt.phase = claimed.phase;
  attempt.inputTarget = claimed.inputTarget;
  attempt.introCompleted = claimed.introCompleted;
  attempt.gatherOpen = claimed.gatherOpen;
  attempt.audioRunning = claimed.audioRunning;
  attempt.pendingChoice = claimed.pendingChoice;
  attempt.heldCount = claimed.heldCount;
  attempt.pendingFault = claimed.pendingFault;
  attempt.mediaGeneration = claimed.mediaGeneration;
  attempt.invalidReprompts = claimed.invalidReprompts;
  attempt.countReprompts = claimed.countReprompts;
  attempt.promptKind = claimed.promptKind;
  attempt.playbackRetries = claimed.playbackRetries;
  attempt.choiceDigit = claimed.choiceDigit;
  attempt.flowStep = claimed.flowStep;
  attempt.status = claimed.status;
  attempt.answered = claimed.answered;
  attempt.rsvpApplied = claimed.rsvpApplied;
  attempt.error = claimed.error;
}

async function playFile(
  attempt: any,
  callControlId: string,
  audioUrl: string,
  stage: string,
  generation: number,
  mediaSlot?: IvrFollowUpSlot
) {
  const result = await playbackIvrAudio(
    callControlId,
    audioUrl,
    clientState(attempt, { stage, generation }),
    {
      mediaClear:
        mediaSlot ?? mediaClearReasonForPlaybackStage(stage),
    }
  );
  return !telnyxCommandFailed(result);
}

async function playGatherPrompt(
  attempt: any,
  callControlId: string,
  audioUrl: string,
  stage: string,
  generation: number,
  kind: "choice" | "count",
  mediaSlot: IvrFollowUpSlot
) {
  const result = await gatherIvrUsingAudio({
    callControlId,
    audioUrl,
    minimumDigits: 1,
    maximumDigits: kind === "choice" ? 1 : COUNT_DIGIT_MAX,
    // Telnyx waits this long after the file ends. It does not cut the file.
    timeoutMillis: kind === "choice" ? CHOICE_TIMEOUT_MS : COUNT_TIMEOUT_MS,
    ...(kind === "count" ? { interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS } : {}),
    terminatingDigit: kind === "choice" ? "" : "#",
    validDigits: kind === "choice" ? "123" : "0123456789",
    clientState: clientState(attempt, { stage, generation }),
    mediaClear: mediaSlot,
  });
  return !telnyxCommandFailed(result);
}

function playIntroAudio(
  attempt: any,
  callControlId: string,
  introUrl: string,
  generation: number
) {
  return playGatherPrompt(
    attempt,
    callControlId,
    introUrl,
    "intro",
    generation,
    "choice",
    "none"
  );
}

async function reopenGatherAfterPrompt(input: {
  attempt: any;
  callControlId: string;
  stage: "invalid_choice" | "invalid_count" | "ask_count";
  generation: number;
  kind: "choice" | "count";
}) {
  const opened = reduceIvrCall(
    {
      ...readIvrMachineState(input.attempt),
      // The gather command failed, so settle as a finished playback_start and
      // open a silent gather. Do not keep a gather that never started.
      audioRunning: false,
      gatherOpen: false,
    },
    {
      type: "playback_ended",
      stage: input.stage,
      status: "completed",
      generation: input.generation,
    }
  );
  const reopen = opened.commands[0];
  if (!reopen || (reopen.type !== "open_choice_gather" && reopen.type !== "open_count_gather")) {
    return;
  }
  const saved = await claimFields(
    input.attempt._id,
    {
      phase: "PLAYING_RESPONSE",
      promptKind: input.stage,
      rsvpApplied: { $ne: true },
    },
    opened.state
  );
  if (!saved) return;
  copyClaim(input.attempt, saved);
  if (input.kind === "count") {
    await openCountGather(saved, input.callControlId, opened.state.mediaGeneration);
  } else {
    await openChoiceGather(saved, input.callControlId, opened.state.mediaGeneration);
  }
}

async function openChoiceGather(attempt: any, callControlId: string, generation: number) {
  await gatherIvrDigits({
    callControlId,
    minimumDigits: 1,
    maximumDigits: 1,
    validDigits: "123",
    terminatingDigit: "",
    timeoutMillis: CHOICE_TIMEOUT_MS,
    clientState: clientState(attempt, { stage: "choice", generation }),
  });
}

async function openCountGather(attempt: any, callControlId: string, generation: number) {
  await gatherIvrDigits({
    callControlId,
    minimumDigits: 1,
    maximumDigits: COUNT_DIGIT_MAX,
    terminatingDigit: "#",
    interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS,
    timeoutMillis: COUNT_TIMEOUT_MS,
    clientState: clientState(attempt, { stage: "count", generation }),
  });
}

async function failClosed(attempt: any, callControlId: string, error: string) {
  await IvrCallAttempt.updateOne(
    { _id: attempt._id, rsvpApplied: { $ne: true } },
    {
      $set: {
        phase: "COMPLETED",
        flowStep: "done",
        gatherOpen: false,
        inputTarget: "none",
        status: attempt.answered ? "hangup_before_response" : "failed",
        error,
        endedAt: new Date(),
      },
    }
  );
  await hangupIvrCall(callControlId).catch(() => null);
}

async function playSafeSystem(attempt: any, callControlId: string) {
  const claimed = await IvrCallAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      rsvpApplied: { $ne: true },
      error: "AMBIGUOUS_EVENT",
      phase: { $in: ["RINGING", "ANSWERED", "", null] },
    },
    {
      $set: {
        phase: "PLAYING_RESPONSE",
        promptKind: "system",
        inputTarget: "none",
        gatherOpen: false,
        introCompleted: false,
        flowStep: "playing_system",
        status: "unresolved",
        answered: true,
        answeredAt: attempt.answeredAt || new Date(),
        mediaGeneration: Number(attempt.mediaGeneration || 0) + 1,
      },
    },
    { new: true }
  );
  if (!claimed) return;
  copyClaim(attempt, claimed);
  const url = await getGlobalPackSegmentUrl(voiceGender(attempt), "inboundAmbiguous");
  if (!url) {
    await failClosed(claimed, callControlId, "AMBIGUOUS_EVENT");
    return;
  }
  const played = await playFile(
    claimed,
    callControlId,
    url,
    "system",
    Number(claimed.mediaGeneration || 1)
  );
  if (!played) await failClosed(claimed, callControlId, "AMBIGUOUS_EVENT");
}

async function speakNotReady(attempt: any, callControlId: string) {
  const claimed = await IvrCallAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      rsvpApplied: { $ne: true },
      phase: { $in: ["RINGING", "ANSWERED", "PLAYING_INTRO", "", null] },
      introCompleted: { $ne: true },
    },
    {
      $set: {
        phase: "PLAYING_RESPONSE",
        promptKind: "system",
        inputTarget: "none",
        gatherOpen: false,
        flowStep: "playing_system",
        status: "unresolved",
        answered: true,
        answeredAt: attempt.answeredAt || new Date(),
        error: "AUDIO_NOT_READY",
        mediaGeneration: Number(attempt.mediaGeneration || 0) + 1,
      },
    },
    { new: true }
  );
  if (!claimed) return;
  copyClaim(attempt, claimed);
  const result = await speakIvrCall(callControlId, AUDIO_NOT_READY_TEXT, {
    ...clientState(claimed, {
      stage: "system",
      generation: Number(claimed.mediaGeneration || 1),
    }),
  });
  if (telnyxCommandFailed(result)) {
    await failClosed(claimed, callControlId, "AUDIO_NOT_READY");
  }
}

/**
 * Shared answer entry. Plays the approved narration only after Telnyx
 * reports call.answered. Does not open a DTMF timer.
 */
export async function startOutboundFromBeginning(input: {
  attempt: any;
  callControlId: string;
}) {
  return handleIvrAnswered(input);
}

export async function handleIvrAnswered(input: {
  attempt: any;
  callControlId: string;
}): Promise<{ handled: boolean }> {
  const attempt = input.attempt;
  const callControlId = cleanStr(input.callControlId);
  if (!callControlId) return { handled: false };

  if (cleanStr(attempt.error) === "AMBIGUOUS_EVENT") {
    await playSafeSystem(attempt, callControlId);
    return { handled: true };
  }
  if (cleanStr(attempt.error) === "AUDIO_NOT_READY") {
    await speakNotReady(attempt, callControlId);
    return { handled: true };
  }
  if (isLegacyInFlight(attempt)) return { handled: false };

  const state = readIvrMachineState(
    cleanStr(attempt.phase) ? attempt : { ...attempt, phase: "RINGING" }
  );
  const decision = reduceIvrCall(state, { type: "answered" });
  let playIntro = decision.commands.find((command) => command.type === "play_intro");
  const introUrl = cleanStr(attempt.introAudioUrl);
  // Recovery: claimed PLAYING_INTRO earlier but no playback command was ever
  // recorded (stop/play race left the guest in silence). Re-send intro once.
  const stuckSilentIntro =
    (!playIntro || playIntro.type !== "play_intro") &&
    state.phase === "PLAYING_INTRO" &&
    state.introCompleted !== true &&
    !attempt.playbackCommandAt &&
    !attempt.playbackStartedAt &&
    Boolean(introUrl);

  if ((!playIntro || playIntro.type !== "play_intro") && !stuckSilentIntro) {
    if (!attempt.answered) {
      await IvrCallAttempt.updateOne(
        { _id: attempt._id, answered: { $ne: true } },
        {
          $set: {
            answered: true,
            answeredAt: attempt.answeredAt || new Date(),
            status:
              attempt.status === "completed" || attempt.status === "unresolved"
                ? attempt.status
                : "answered",
          },
        }
      );
    }
    return { handled: true };
  }

  if (stuckSilentIntro) {
    playIntro = {
      type: "play_intro",
      generation: Number(state.mediaGeneration || 1),
    };
    console.error("IVR_ANSWER_RECOVER_SILENT_INTRO", {
      attemptId: String(attempt._id),
      phase: state.phase,
      mediaGeneration: state.mediaGeneration,
    });
    void warmIvrChoiceFollowUps(voiceGender(attempt));
    const played = await playIntroAudio(
      attempt,
      callControlId,
      introUrl,
      playIntro.generation
    );
    if (!played) {
      await failClosed(attempt, callControlId, "AUDIO_PLAYBACK_FAILED");
    } else {
      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        { $set: { playbackCommandAt: new Date() } }
      ).catch(() => null);
      await note(attempt._id, "שוחזר פתיח אחרי שקט", introUrl);
    }
    return { handled: true };
  }

  // Do not gate the claim on playbackStartedAt. That field is telemetry from
  // Telnyx webhooks (via timeline pipeline). A failed/racy timeline write must
  // never leave the guest in silence after answer.
  const claimed = await claimFields(
    attempt._id,
    {
      rsvpApplied: { $ne: true },
      introCompleted: { $ne: true },
      choiceDigit: { $nin: ["1", "2", "3"] },
      error: { $nin: ["AMBIGUOUS_EVENT", "AUDIO_NOT_READY"] },
      $or: [
        { phase: { $in: ["RINGING", "ANSWERED"] } },
        {
          phase: { $in: ["", null] },
          flowStep: {
            $in: ["dialing", "playing_intro", "playing_intro_before", "answer_delay"],
          },
        },
      ],
    },
    decision.state,
    {
      status: "answered",
      answered: true,
      answeredAt: attempt.answeredAt || new Date(),
    }
  );
  if (!claimed) {
    // Another writer may have stamped AUDIO_NOT_READY between load and claim.
    const fresh = await IvrCallAttempt.findById(attempt._id)
      .select(
        "error introAudioUrl phase introCompleted rsvpApplied playbackCommandAt playbackStartedAt mediaGeneration"
      )
      .lean();
    if (cleanStr(fresh?.error) === "AUDIO_NOT_READY" || !cleanStr(fresh?.introAudioUrl)) {
      await speakNotReady(
        { ...attempt, ...(fresh || {}), _id: attempt._id },
        callControlId
      );
    } else if (
      cleanStr(fresh?.phase) === "PLAYING_INTRO" &&
      !fresh?.playbackCommandAt &&
      !fresh?.playbackStartedAt &&
      cleanStr(fresh?.introAudioUrl)
    ) {
      const played = await playIntroAudio(
        { ...attempt, ...fresh, _id: attempt._id },
        callControlId,
        cleanStr(fresh?.introAudioUrl),
        Number(fresh?.mediaGeneration || 1)
      );
      if (played) {
        await IvrCallAttempt.updateOne(
          { _id: attempt._id },
          { $set: { playbackCommandAt: new Date() } }
        ).catch(() => null);
      }
    } else {
      console.error("IVR_ANSWER_CLAIM_MISSED", {
        attemptId: String(attempt._id),
        phase: fresh?.phase,
        introCompleted: fresh?.introCompleted,
        hasIntro: Boolean(cleanStr(fresh?.introAudioUrl)),
      });
    }
    return { handled: true };
  }
  copyClaim(attempt, claimed);

  if (!introUrl) {
    await speakNotReady(claimed, callControlId);
    return { handled: true };
  }
  if (!playIntro || playIntro.type !== "play_intro") {
    // Unreachable after the early returns above; keeps the type checker honest.
    return { handled: true };
  }

  void warmIvrChoiceFollowUps(voiceGender(claimed));
  const played = await playIntroAudio(
    claimed,
    callControlId,
    introUrl,
    playIntro.generation
  );
  if (!played) {
    await failClosed(claimed, callControlId, "AUDIO_PLAYBACK_FAILED");
  } else {
    await IvrCallAttempt.updateOne(
      { _id: claimed._id },
      { $set: { playbackCommandAt: new Date() } }
    ).catch(() => null);
    await note(claimed._id, "הושמע הפתיח המאושר אחרי מענה", introUrl);
  }
  return { handled: true };
}

function eventFromPlayback(attempt: any, body: any) {
  const payload = payloadOf(body);
  const decoded = decodeIvrClientState(payload?.client_state);
  const state = readIvrMachineState(attempt);
  return {
    stage: cleanStr(decoded.stage) || state.promptKind,
    status: cleanStr(payload?.status).toLowerCase(),
    generation: Number(decoded.generation || state.mediaGeneration || 0),
  };
}

export async function handleIvrPlaybackEnded(input: {
  attempt: any;
  callControlId: string;
  body: any;
}): Promise<{ handled: boolean }> {
  const attempt = input.attempt;
  if (!cleanStr(attempt.phase)) return { handled: false };
  const callControlId = cleanStr(input.callControlId);
  const playback = eventFromPlayback(attempt, input.body);
  const state = readIvrMachineState(attempt);
  const decision = reduceIvrCall(state, {
    type: "playback_ended",
    ...playback,
  });
  const commands = decision.commands.filter((command) => command.type !== "ignore");
  if (!commands.length) return { handled: true };
  if (
    playsInvalidChoicePrompt(commands) &&
    !invalidChoiceAllowed(state) &&
    state.pendingFault !== "choice"
  ) {
    return { handled: true };
  }
  const followUp = commands.some((command) =>
    command.type === "play_ask_count" ||
    command.type === "play_invalid_choice" ||
    command.type === "play_invalid_count" ||
    command.type === "apply_rsvp" ||
    command.type === "play_thanks" ||
    command.type === "hangup_no_choice"
  );
  if (followUp) {
    await handleIvrDigits({
      attempt,
      callControlId,
      body: input.body,
      eventType: "call.playback.ended",
      prepared: {
        commands,
        next: decision.state,
        fromPlayback: true,
        playbackGeneration: playback.generation,
      },
    });
    return { handled: true };
  }
  await runPlaybackCommands({
    attempt,
    callControlId,
    commands,
    next: decision.state,
    playback,
  });
  return { handled: true };
}

async function runPlaybackCommands(input: {
  attempt: any;
  callControlId: string;
  commands: IvrMachineCommand[];
  next: IvrCallMachineState;
  playback: { generation: number; stage: string };
}) {
  const first = input.commands[0];
  const attempt = input.attempt;
  const callControlId = input.callControlId;
  const generationFilter = input.playback.generation
    ? { mediaGeneration: input.playback.generation }
    : {};
  const endingIntro =
    input.playback.stage === "intro" || attempt.promptKind === "intro";

  if (first.type === "keep_gather") {
    const claimed = await claimFields(
      attempt._id,
      {
        phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
        audioRunning: true,
        pendingChoice: { $in: ["", null] },
        pendingFault: { $in: ["", null] },
        heldCount: { $in: [0, null] },
        rsvpApplied: { $ne: true },
        ...generationFilter,
      },
      input.next
    );
    if (!claimed) {
      const fresh = await IvrCallAttempt.findById(attempt._id);
      if (
        fresh &&
        (cleanStr(fresh.pendingChoice) ||
          Number(fresh.heldCount || 0) > 0 ||
          cleanStr(fresh.pendingFault))
      ) {
        const retry = reduceIvrCall(readIvrMachineState(fresh), {
          type: "playback_ended",
          stage: input.playback.stage,
          status: "completed",
          generation: input.playback.generation,
        });
        const retryCommands = retry.commands.filter((command) => command.type !== "ignore");
        if (retryCommands.length && retryCommands[0]?.type !== "keep_gather") {
          await handleIvrDigits({
            attempt: fresh,
            callControlId,
            body: {},
            eventType: "call.playback.ended",
            prepared: {
              commands: retryCommands,
              next: retry.state,
              fromPlayback: true,
              playbackGeneration: input.playback.generation,
            },
          });
        }
      }
      return;
    }
    copyClaim(attempt, claimed);
    await note(claimed._id, "ההשמעה נעצרה והקליטה נשארת פתוחה", "");
    return;
  }

  if (first.type === "open_choice_gather" || first.type === "open_count_gather") {
    const fromPrompt =
      first.type === "open_count_gather"
        ? ["ask_count", "invalid_count"]
        : endingIntro
          ? ["intro", ""]
          : ["invalid_choice"];
    const claimed = await claimFields(
      attempt._id,
      {
        phase: endingIntro ? "PLAYING_INTRO" : "PLAYING_RESPONSE",
        promptKind: { $in: fromPrompt },
        rsvpApplied: { $ne: true },
        ...generationFilter,
      },
      input.next
    );
    if (!claimed) return;
    copyClaim(attempt, claimed);
    if (!callControlId) return;
    if (first.type === "open_count_gather") {
      await openCountGather(claimed, callControlId, input.next.mediaGeneration);
    } else {
      await openChoiceGather(claimed, callControlId, input.next.mediaGeneration);
    }
    await note(
      claimed._id,
      first.type === "open_count_gather"
        ? "נפתחה קליטת מספר האורחים"
        : "הפתיח הסתיים ונפתחה קליטת הבחירה",
      ""
    );
    return;
  }

  if (first.type === "play_intro") {
    const introUrl = cleanStr(attempt.introAudioUrl);
    const claimed = await claimFields(
      attempt._id,
      {
        phase: "PLAYING_INTRO",
        promptKind: "intro",
        introCompleted: { $ne: true },
        ...generationFilter,
      },
      input.next
    );
    if (!claimed || !introUrl || !callControlId) return;
    copyClaim(attempt, claimed);
    const played = await playIntroAudio(claimed, callControlId, introUrl, first.generation);
    if (!played) await failClosed(claimed, callControlId, "AUDIO_PLAYBACK_FAILED");
    return;
  }

  if (first.type === "mark_playback_failed") {
    await failClosed(attempt, callControlId, "AUDIO_PLAYBACK_FAILED");
    return;
  }

  if (first.type === "hangup") {
    const system =
      input.next.promptKind === "system" || attempt.promptKind === "system";
    const claimed = await claimFields(
      attempt._id,
      { phase: { $in: ["PLAYING_RESPONSE", "PLAYING_INTRO"] }, ...generationFilter },
      input.next,
      system
        ? { status: "unresolved", endedAt: new Date(), flowStep: "done" }
        : { flowStep: "done" }
    );
    if (!claimed) return;
    copyClaim(attempt, claimed);
    if (callControlId) await hangupIvrCall(callControlId);
  }
}

export async function handleIvrDigits(input: {
  attempt: any;
  callControlId: string;
  body: any;
  eventType: string;
  prepared?: {
    commands: IvrMachineCommand[];
    next: IvrCallMachineState;
    fromPlayback: boolean;
    playbackGeneration: number;
  };
  retried?: boolean;
}): Promise<{ handled: boolean }> {
  const attempt = input.attempt;
  if (!cleanStr(attempt.phase)) return { handled: false };
  if (cleanStr(attempt.error) === "AMBIGUOUS_EVENT") return { handled: true };
  if (!attempt.guestId || !attempt.invitationId) return { handled: true };

  const payload = payloadOf(input.body);
  const decoded = decodeIvrClientState(payload?.client_state);
  const digits = cleanStr(
    payload?.digit || payload?.digits || payload?.result || payload?.gathered_digits
  );
  const status = cleanStr(payload?.status).toLowerCase();
  const stage = cleanStr(decoded.stage);
  const generation = Number(decoded.generation || 0);
  const state = readIvrMachineState(attempt);
  const decision = input.prepared
    ? { state: input.prepared.next, commands: input.prepared.commands }
    : input.eventType === "call.dtmf.received"
      ? reduceIvrCall(state, { type: "dtmf", digit: digits, stage })
      : reduceIvrCall(state, {
          type: "gather_ended",
          digits,
          status,
          generation: generation || state.mediaGeneration,
          stage,
        });

  if (
    playsInvalidChoicePrompt(decision.commands) &&
    !invalidChoiceAllowed(state) &&
    state.pendingFault !== "choice"
  ) {
    return { handled: true };
  }

  const commands = decision.commands.filter((command) => command.type !== "ignore");
  if (!commands.length) return { handled: true };

  const callControlId = cleanStr(input.callControlId);
  const gender = voiceGender(attempt);
  const fromPlayback = input.prepared?.fromPlayback === true;
  const playbackGeneration = Number(input.prepared?.playbackGeneration || 0);
  const promptStillPlaying =
    !fromPlayback &&
    attempt.audioRunning === true &&
    (attempt.phase === "PLAYING_INTRO" || attempt.phase === "PLAYING_RESPONSE") &&
    !["1", "2", "3"].includes(cleanStr(attempt.choiceDigit));
  const countStillPlaying =
    !fromPlayback &&
    attempt.audioRunning === true &&
    attempt.phase === "PLAYING_RESPONSE" &&
    cleanStr(attempt.choiceDigit) === "1" &&
    ["ask_count", "invalid_count"].includes(cleanStr(attempt.promptKind));

  async function retryAfterAudioSettled(kind: "menu" | "count") {
    if (input.retried) return { handled: true as const };
    const fresh = await IvrCallAttempt.findById(attempt._id);
    if (!fresh || fresh.rsvpApplied === true || fresh.audioRunning === true) {
      return { handled: true as const };
    }
    const digit = cleanStr(fresh.choiceDigit);
    if (kind === "menu" && ["1", "2", "3"].includes(digit)) return { handled: true as const };
    if (kind === "count" && digit !== "1") return { handled: true as const };
    return handleIvrDigits({ ...input, attempt: fresh, retried: true });
  }

  if (commands[0]?.type === "hold_barge") {
    const claimed = await claimFields(
      attempt._id,
      {
        phase: attempt.phase === "PLAYING_INTRO" ? "PLAYING_INTRO" : "PLAYING_RESPONSE",
        audioRunning: true,
        pendingChoice: { $in: ["", null] },
        pendingFault: { $in: ["", null] },
        heldCount: { $in: [0, null] },
        rsvpApplied: { $ne: true },
      },
      decision.state
    );
    if (!claimed) {
      const fresh = await IvrCallAttempt.findById(attempt._id);
      if (fresh && fresh.audioRunning !== true && !input.prepared) {
        return handleIvrDigits({ ...input, attempt: fresh });
      }
      return { handled: true };
    }
    copyClaim(attempt, claimed);
    return { handled: true };
  }

  function slotFor(type: IvrMachineCommand["type"]): IvrFollowUpSlot {
    for (const command of commands) {
      if (command.type === type && "mediaSlot" in command) return command.mediaSlot;
    }
    return "release_gather";
  }

  if (commands.some((command) => command.type === "play_invalid_choice")) {
    const claimed = await claimFields(
      attempt._id,
      fromPlayback
        ? {
            phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
            pendingFault: "choice",
            rsvpApplied: { $ne: true },
            ...(playbackGeneration ? { mediaGeneration: playbackGeneration } : {}),
          }
        : {
            phase: "WAITING_FOR_INPUT",
            inputTarget: "choice",
            introCompleted: true,
            gatherOpen: true,
            choiceDigit: { $nin: ["1", "2", "3"] },
            rsvpApplied: { $ne: true },
            error: { $ne: "AMBIGUOUS_EVENT" },
          },
      decision.state,
      { status: "invalid_input" }
    );
    if (!claimed || !callControlId) return { handled: true };
    copyClaim(attempt, claimed);
    const url = await getIvrSystemAudioUrlForGender(gender, "invalidInput");
    const played = url
      ? await playGatherPrompt(
          claimed,
          callControlId,
          url,
          "invalid_choice",
          decision.state.mediaGeneration,
          "choice",
          slotFor("play_invalid_choice")
        )
      : false;
    if (!played) {
      await reopenGatherAfterPrompt({
        attempt: claimed,
        callControlId,
        stage: "invalid_choice",
        generation: decision.state.mediaGeneration,
        kind: "choice",
      });
    }
    return { handled: true };
  }

  if (commands.some((command) => command.type === "play_invalid_count")) {
    const claimed = await claimFields(
      attempt._id,
      fromPlayback
        ? {
            phase: "PLAYING_RESPONSE",
            pendingFault: "count",
            choiceDigit: "1",
            rsvpApplied: { $ne: true },
            ...(playbackGeneration ? { mediaGeneration: playbackGeneration } : {}),
          }
        : {
            phase: "WAITING_FOR_INPUT",
            inputTarget: "count",
            gatherOpen: true,
            choiceDigit: "1",
            rsvpApplied: { $ne: true },
          },
      decision.state,
      { status: "invalid_input" }
    );
    if (!claimed || !callControlId) return { handled: true };
    copyClaim(attempt, claimed);
    const url = await getIvrSystemAudioUrlForGender(gender, "invalidGuestCount");
    const played = url
      ? await playGatherPrompt(
          claimed,
          callControlId,
          url,
          "invalid_count",
          decision.state.mediaGeneration,
          "count",
          slotFor("play_invalid_count")
        )
      : false;
    if (!played) {
      await reopenGatherAfterPrompt({
        attempt: claimed,
        callControlId,
        stage: "invalid_count",
        generation: decision.state.mediaGeneration,
        kind: "count",
      });
    }
    return { handled: true };
  }

  if (commands.some((command) => command.type === "play_ask_count")) {
    const askCountUrl = getIvrSystemAudioUrlForGender(gender, "askGuestCount");
    const claimed = await IvrCallAttempt.findOneAndUpdate(
      promptStillPlaying
        ? {
            _id: attempt._id,
            rsvpApplied: { $ne: true },
            phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
            audioRunning: true,
            choiceDigit: { $nin: ["1", "2", "3"] },
            promptKind: { $in: ["intro", "invalid_choice"] },
            error: { $ne: "AMBIGUOUS_EVENT" },
          }
        : fromPlayback
        ? {
            _id: attempt._id,
            rsvpApplied: { $ne: true },
            phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
            pendingChoice: "1",
            error: { $ne: "AMBIGUOUS_EVENT" },
            ...(playbackGeneration ? { mediaGeneration: playbackGeneration } : {}),
          }
        : {
            _id: attempt._id,
            rsvpApplied: { $ne: true },
            phase: "WAITING_FOR_INPUT",
            inputTarget: "choice",
            introCompleted: true,
            gatherOpen: true,
            choiceDigit: { $nin: ["1", "2", "3"] },
            error: { $ne: "AMBIGUOUS_EVENT" },
          },
      {
        $set: { ...machinePersistFields(decision.state), status: "answered" },
        $push: { dtmfDigits: "1" },
      },
      { new: true }
    );
    if (!claimed) return retryAfterAudioSettled("menu");
    if (!callControlId) return { handled: true };
    copyClaim(attempt, claimed);
    const url = await askCountUrl;
    console.log("IVR_FOLLOW_UP_GAP", {
      attemptId: String(claimed._id),
      digit: "1",
      trigger: promptStillPlaying ? "dtmf" : fromPlayback ? "playback_ended" : "gather_settled",
      mediaSlot: slotFor("play_ask_count"),
      waitsForPlaybackEnded: false,
      waitsForGatherEnded: false,
      rsvpBeforeAudio: false,
    });
    if (url) {
      await playGatherPrompt(
        claimed,
        callControlId,
        url,
        "ask_count",
        decision.state.mediaGeneration,
        "count",
        slotFor("play_ask_count")
      );
    } else {
      const opened = reduceIvrCall(
        { ...readIvrMachineState(claimed), audioRunning: false, gatherOpen: false },
        {
          type: "playback_ended",
          stage: "ask_count",
          status: "completed",
          generation: decision.state.mediaGeneration,
        }
      );
      const saved = await claimFields(
        claimed._id,
        { phase: "PLAYING_RESPONSE", promptKind: "ask_count", choiceDigit: "1" },
        opened.state
      );
      if (saved) {
        copyClaim(attempt, saved);
        await openCountGather(saved, callControlId, opened.state.mediaGeneration);
      }
    }
    return { handled: true };
  }

  const apply = commands.find((command) => command.type === "apply_rsvp");
  if (apply && apply.type === "apply_rsvp") {
    const digit = decision.state.choiceDigit;
    const playbackClaim = playbackGeneration
      ? { mediaGeneration: playbackGeneration }
      : {};
    const thanksKey = apply.rsvp === "yes" ? "thanksAttending" : "thanksReceived";
    const thanksUrlPromise = getIvrSystemAudioUrlForGender(gender, thanksKey);
    const choiceClaim = countStillPlaying
      ? {
          phase: "PLAYING_RESPONSE",
          audioRunning: true,
          promptKind: { $in: ["ask_count", "invalid_count"] },
          choiceDigit: "1",
        }
      : promptStillPlaying
      ? {
          phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
          audioRunning: true,
          promptKind: { $in: ["intro", "invalid_choice"] },
          choiceDigit: { $nin: ["1", "2", "3"] },
        }
      : fromPlayback
      ? apply.rsvp === "yes"
        ? {
            phase: "PLAYING_RESPONSE",
            promptKind: { $in: ["ask_count", "invalid_count"] },
            choiceDigit: "1",
            heldCount: { $gt: 0 },
            ...playbackClaim,
          }
        : {
            phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
            pendingChoice: apply.rsvp === "no" ? "2" : "3",
            ...playbackClaim,
          }
      : apply.rsvp === "yes"
        ? {
            phase: "WAITING_FOR_INPUT",
            inputTarget: "count",
            gatherOpen: true,
            choiceDigit: "1",
          }
        : {
            phase: "WAITING_FOR_INPUT",
            inputTarget: "choice",
            introCompleted: true,
            gatherOpen: true,
            choiceDigit: { $nin: ["1", "2", "3"] },
          };
    const claimed = await IvrCallAttempt.findOneAndUpdate(
      {
        _id: attempt._id,
        rsvpApplied: { $ne: true },
        error: { $ne: "AMBIGUOUS_EVENT" },
        ...choiceClaim,
      },
      {
        $set: {
          ...machinePersistFields(decision.state),
          // RSVP flag is set only by applyRsvpOnce, after the guest write.
          rsvpApplied: false,
          status: "answered",
          ...(apply.rsvp === "yes" && apply.attendingCount
            ? { guestCountDigits: String(apply.attendingCount) }
            : {}),
        },
        ...(digit && apply.rsvp !== "yes"
          ? { $push: { dtmfDigits: digit } }
          : apply.rsvp === "yes"
            ? { $push: { dtmfDigits: String(apply.attendingCount || "") } }
            : {}),
      },
      { new: true }
    );
    if (!claimed) return retryAfterAudioSettled(apply.rsvp === "yes" ? "count" : "menu");
    copyClaim(attempt, claimed);
    // The reducer marks rsvpApplied optimistically. The DB row is still false
    // until the atomic guest write below.
    claimed.rsvpApplied = false;
    attempt.rsvpApplied = false;
    const thanksUrl = await thanksUrlPromise;
    const slot = slotFor("play_thanks");
    console.log("IVR_FOLLOW_UP_GAP", {
      attemptId: String(claimed._id),
      digit: digit || String(apply.attendingCount || ""),
      trigger: countStillPlaying
        ? "count_complete"
        : promptStillPlaying
          ? "dtmf"
          : fromPlayback
            ? "playback_ended"
            : "gather_settled",
      mediaSlot: slot,
      waitsForPlaybackEnded: false,
      waitsForGatherEnded: false,
      rsvpBeforeAudio: false,
    });
    const playPromise =
      callControlId && thanksUrl
        ? playFile(
            claimed,
            callControlId,
            thanksUrl,
            "thanks",
            decision.state.mediaGeneration,
            slot
          )
        : callControlId
          ? hangupIvrCall(callControlId)
          : Promise.resolve(null);
    const [saved] = await Promise.all([
      applyRsvpOnce({
        attempt: claimed,
        rsvp: apply.rsvp,
        attendingCount: apply.attendingCount,
      }),
      playPromise,
    ]);
    if (!saved.applied) return { handled: true };
    attempt.rsvpApplied = true;
    return { handled: true };
  }

  if (commands.some((command) => command.type === "hangup_no_choice")) {
    const claimed = await claimFields(
      attempt._id,
      fromPlayback
        ? {
            phase: { $in: ["PLAYING_INTRO", "PLAYING_RESPONSE"] },
            pendingFault: { $in: ["choice", "count"] },
            rsvpApplied: { $ne: true },
          }
        : {
            phase: "WAITING_FOR_INPUT",
            gatherOpen: true,
            rsvpApplied: { $ne: true },
            choiceDigit: attempt.inputTarget === "count" ? "1" : { $nin: ["1", "2", "3"] },
          },
      decision.state,
      { status: "hangup_before_response" }
    );
    if (!claimed) return { handled: true };
    copyClaim(attempt, claimed);
    if (callControlId) await hangupIvrCall(callControlId);
    return { handled: true };
  }

  return { handled: true };
}

export function flowStepAfterMachine(state: IvrCallMachineState) {
  return flowStepForMachine(state);
}
