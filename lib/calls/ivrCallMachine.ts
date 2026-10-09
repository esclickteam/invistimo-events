/**
 * Drive the shared IVR phase machine on a live Telnyx leg.
 * Inbound and outbound both enter here after a real call.answered.
 * Playback of the approved file is the only media command until that
 * playback ends; only then does a digit gather open.
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
  hangupIvrCall,
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

function isLegacyInFlight(attempt: any) {
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
      { _id: claimed._id },
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
  generation: number
) {
  const result = await playbackIvrAudio(
    callControlId,
    audioUrl,
    clientState(attempt, { stage, generation })
  );
  return !telnyxCommandFailed(result);
}

async function reopenGatherAfterPrompt(input: {
  attempt: any;
  callControlId: string;
  stage: "invalid_choice" | "invalid_count" | "ask_count";
  generation: number;
  kind: "choice" | "count";
}) {
  const opened = reduceIvrCall(readIvrMachineState(input.attempt), {
    type: "playback_ended",
    stage: input.stage,
    status: "completed",
    generation: input.generation,
  });
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
  const playIntro = decision.commands.find((command) => command.type === "play_intro");
  if (!playIntro || playIntro.type !== "play_intro") {
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

  const introUrl = cleanStr(attempt.introAudioUrl);
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
      .select("error introAudioUrl phase introCompleted rsvpApplied")
      .lean();
    if (cleanStr(fresh?.error) === "AUDIO_NOT_READY" || !cleanStr(fresh?.introAudioUrl)) {
      await speakNotReady(
        { ...attempt, ...(fresh || {}), _id: attempt._id },
        callControlId
      );
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

  void warmIvrChoiceFollowUps(voiceGender(claimed));
  const played = await playFile(
    claimed,
    callControlId,
    introUrl,
    "intro",
    playIntro.generation
  );
  if (!played) {
    await failClosed(claimed, callControlId, "AUDIO_PLAYBACK_FAILED");
  } else {
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
  if (playsInvalidChoicePrompt(commands) && !invalidChoiceAllowed(state)) {
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
    const played = await playFile(claimed, callControlId, introUrl, "intro", first.generation);
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
  const decision =
    input.eventType === "call.dtmf.received"
      ? reduceIvrCall(state, { type: "dtmf", digit: digits, stage })
      : reduceIvrCall(state, {
          type: "gather_ended",
          digits,
          status,
          generation: generation || state.mediaGeneration,
          stage,
        });

  if (playsInvalidChoicePrompt(decision.commands) && !invalidChoiceAllowed(state)) {
    return { handled: true };
  }

  const commands = decision.commands.filter((command) => command.type !== "ignore");
  if (!commands.length) return { handled: true };

  const callControlId = cleanStr(input.callControlId);
  const gender = voiceGender(attempt);

  if (commands.some((command) => command.type === "play_invalid_choice")) {
    const claimed = await claimFields(
      attempt._id,
      {
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
      ? await playFile(
          claimed,
          callControlId,
          url,
          "invalid_choice",
          decision.state.mediaGeneration
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
      {
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
      ? await playFile(
          claimed,
          callControlId,
          url,
          "invalid_count",
          decision.state.mediaGeneration
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
    const claimed = await IvrCallAttempt.findOneAndUpdate(
      {
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
    if (!claimed || !callControlId) return { handled: true };
    copyClaim(attempt, claimed);
    const url = await getIvrSystemAudioUrlForGender(gender, "askGuestCount");
    if (url) {
      await playFile(claimed, callControlId, url, "ask_count", decision.state.mediaGeneration);
    } else {
      const opened = reduceIvrCall(readIvrMachineState(claimed), {
        type: "playback_ended",
        stage: "ask_count",
        status: "completed",
        generation: decision.state.mediaGeneration,
      });
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
    const choiceClaim =
      apply.rsvp === "yes"
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
    if (!claimed) return { handled: true };
    copyClaim(attempt, claimed);
    // The reducer marks rsvpApplied optimistically. The DB row is still false
    // until the atomic guest write below.
    claimed.rsvpApplied = false;
    attempt.rsvpApplied = false;
    const thanksKey = apply.rsvp === "yes" ? "thanksAttending" : "thanksReceived";
    const thanksPromise = getIvrSystemAudioUrlForGender(gender, thanksKey);
    const saved = await applyRsvpOnce({
      attempt: claimed,
      rsvp: apply.rsvp,
      attendingCount: apply.attendingCount,
    });
    if (!saved.applied) return { handled: true };
    attempt.rsvpApplied = true;
    const thanksUrl = await thanksPromise;
    if (callControlId && thanksUrl) {
      await playFile(
        claimed,
        callControlId,
        thanksUrl,
        "thanks",
        decision.state.mediaGeneration
      );
    } else if (callControlId) {
      await hangupIvrCall(callControlId);
    }
    return { handled: true };
  }

  if (commands.some((command) => command.type === "hangup_no_choice")) {
    const claimed = await claimFields(
      attempt._id,
      {
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
