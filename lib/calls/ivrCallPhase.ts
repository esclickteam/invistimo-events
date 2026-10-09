/**
 * One IVR phase machine for inbound and outbound calls.
 *
 * RINGING → ANSWERED → PLAYING_INTRO → WAITING_FOR_INPUT
 *   → PROCESSING_INPUT → PLAYING_RESPONSE → COMPLETED
 *
 * ANSWERED is the call.answered gate: narration is commanded only from that
 * event, and the stored phase moves straight to PLAYING_INTRO because the
 * playback command is issued in the same turn.
 *
 * The invalid-choice prompt is reachable only from WAITING_FOR_INPUT, after
 * intro playback has completed and a gather is actually open. An empty
 * gather result, a timeout, or a webhook that arrives early cannot play it.
 * Digits 1, 2 and 3 are accepted once. Hangup never creates an RSVP by itself.
 */

import { parseDtmfGuestCount } from "@/lib/calls/ivrRoundEligibility";

export const IVR_PHASES = [
  "RINGING",
  "ANSWERED",
  "PLAYING_INTRO",
  "WAITING_FOR_INPUT",
  "PROCESSING_INPUT",
  "PLAYING_RESPONSE",
  "COMPLETED",
] as const;

export type IvrPhase = (typeof IVR_PHASES)[number];

export type IvrInputTarget = "none" | "choice" | "count";

export type IvrPromptKind =
  | ""
  | "intro"
  | "invalid_choice"
  | "ask_count"
  | "invalid_count"
  | "thanks"
  | "system";

export type IvrChoiceDigit = "" | "1" | "2" | "3";

export type IvrCallMachineState = {
  phase: IvrPhase;
  inputTarget: IvrInputTarget;
  introCompleted: boolean;
  gatherOpen: boolean;
  choiceDigit: IvrChoiceDigit;
  rsvpApplied: boolean;
  mediaGeneration: number;
  invalidReprompts: number;
  countReprompts: number;
  promptKind: IvrPromptKind;
  playbackRetries: number;
};

export type IvrMachineCommand =
  | { type: "ignore"; reason: string }
  | { type: "play_intro"; generation: number }
  | { type: "open_choice_gather"; generation: number }
  | { type: "play_invalid_choice"; generation: number }
  | { type: "play_ask_count"; generation: number }
  | { type: "open_count_gather"; generation: number }
  | { type: "play_invalid_count"; generation: number }
  | {
      type: "apply_rsvp";
      rsvp: "yes" | "no" | "maybe";
      attendingCount: number | null;
    }
  | { type: "play_thanks"; kind: "attending" | "received"; generation: number }
  | { type: "hangup" }
  | { type: "hangup_no_choice" }
  | { type: "close_without_rsvp" }
  | { type: "mark_playback_failed" };

export type IvrMachineEvent =
  | { type: "ringing" }
  | { type: "answered" }
  | { type: "playback_ended"; stage: string; status: string; generation: number }
  | {
      type: "gather_ended";
      digits: string;
      status: string;
      generation: number;
      stage: string;
    }
  | { type: "dtmf"; digit: string; stage: string }
  | { type: "hangup" };

/** One spoken retry after a real choice window. The next miss ends the call. */
export const MAX_INVALID_REPROMPTS = 1;
export const MAX_COUNT_REPROMPTS = 1;
export const MAX_INTRO_PLAYBACK_RETRIES = 1;

const PROMPT_KINDS = new Set<IvrPromptKind>([
  "",
  "intro",
  "invalid_choice",
  "ask_count",
  "invalid_count",
  "thanks",
  "system",
]);

export function initialIvrCallState(): IvrCallMachineState {
  return {
    phase: "RINGING",
    inputTarget: "none",
    introCompleted: false,
    gatherOpen: false,
    choiceDigit: "",
    rsvpApplied: false,
    mediaGeneration: 0,
    invalidReprompts: 0,
    countReprompts: 0,
    promptKind: "",
    playbackRetries: 0,
  };
}

export function isIvrPhase(value: unknown): value is IvrPhase {
  return IVR_PHASES.includes(value as IvrPhase);
}

function asPromptKind(value: unknown): IvrPromptKind {
  const raw = String(value || "") as IvrPromptKind;
  return PROMPT_KINDS.has(raw) ? raw : "";
}

function asChoice(value: unknown): IvrChoiceDigit {
  const raw = String(value || "");
  return raw === "1" || raw === "2" || raw === "3" ? raw : "";
}

export function readIvrMachineState(raw: {
  phase?: unknown;
  inputTarget?: unknown;
  introCompleted?: unknown;
  gatherOpen?: unknown;
  choiceDigit?: unknown;
  rsvpApplied?: unknown;
  mediaGeneration?: unknown;
  invalidReprompts?: unknown;
  countReprompts?: unknown;
  promptKind?: unknown;
  playbackRetries?: unknown;
} | null | undefined): IvrCallMachineState {
  const phase = raw?.phase;
  if (!isIvrPhase(phase)) return initialIvrCallState();
  const inputTarget = raw?.inputTarget;
  return {
    phase,
    inputTarget:
      inputTarget === "choice" || inputTarget === "count" ? inputTarget : "none",
    introCompleted: raw?.introCompleted === true,
    gatherOpen: raw?.gatherOpen === true,
    choiceDigit: asChoice(raw?.choiceDigit),
    rsvpApplied: raw?.rsvpApplied === true,
    mediaGeneration: Number(raw?.mediaGeneration || 0),
    invalidReprompts: Number(raw?.invalidReprompts || 0),
    countReprompts: Number(raw?.countReprompts || 0),
    promptKind: asPromptKind(raw?.promptKind),
    playbackRetries: Number(raw?.playbackRetries || 0),
  };
}

/** flowStep values the call report and stale-dial detector already understand. */
export function flowStepForMachine(state: IvrCallMachineState) {
  switch (state.phase) {
    case "RINGING":
      return "dialing";
    case "ANSWERED":
    case "PLAYING_INTRO":
      return "playing_intro";
    case "WAITING_FOR_INPUT":
      return state.inputTarget === "count" ? "gather_count" : "gather_choice";
    case "PROCESSING_INPUT":
      return state.choiceDigit === "1" ? "playing_ask_count" : "playing_thanks";
    case "PLAYING_RESPONSE":
      if (
        state.promptKind === "invalid_choice" ||
        state.promptKind === "invalid_count"
      ) {
        return "playing_invalid";
      }
      if (state.promptKind === "ask_count") return "playing_ask_count";
      if (state.promptKind === "system") return "playing_system";
      return "playing_thanks";
    case "COMPLETED":
      return "done";
    default:
      return "dialing";
  }
}

export function machinePersistFields(state: IvrCallMachineState) {
  return {
    phase: state.phase,
    inputTarget: state.inputTarget,
    introCompleted: state.introCompleted,
    gatherOpen: state.gatherOpen,
    mediaGeneration: state.mediaGeneration,
    invalidReprompts: state.invalidReprompts,
    countReprompts: state.countReprompts,
    promptKind: state.promptKind,
    playbackRetries: state.playbackRetries,
    choiceDigit: state.choiceDigit,
    flowStep: flowStepForMachine(state),
  };
}

/**
 * The error prompt is legal only while the guest is in the choice window:
 * the approved intro finished, and a digit gather is open.
 */
export function invalidChoiceAllowed(state: IvrCallMachineState) {
  return (
    state.phase === "WAITING_FOR_INPUT" &&
    state.inputTarget === "choice" &&
    state.introCompleted === true &&
    state.gatherOpen === true &&
    state.choiceDigit === "" &&
    state.rsvpApplied !== true
  );
}

export function playsInvalidChoicePrompt(commands: IvrMachineCommand[]) {
  return commands.some((command) => command.type === "play_invalid_choice");
}

function ignore(state: IvrCallMachineState, reason: string) {
  return { state, commands: [{ type: "ignore" as const, reason }] };
}

function bumped(state: IvrCallMachineState, patch: Partial<IvrCallMachineState>) {
  return {
    ...state,
    ...patch,
    mediaGeneration: state.mediaGeneration + 1,
  };
}

function choiceDigitFrom(digits: string): IvrChoiceDigit {
  const one = String(digits || "").trim().slice(0, 1);
  return one === "1" || one === "2" || one === "3" ? one : "";
}

function repromptChoice(state: IvrCallMachineState) {
  if (!invalidChoiceAllowed(state)) {
    return ignore(state, "invalid_choice_before_window");
  }
  if (state.invalidReprompts >= MAX_INVALID_REPROMPTS) {
    const next = bumped(state, {
      phase: "COMPLETED",
      inputTarget: "none",
      gatherOpen: false,
      promptKind: "",
    });
    return { state: next, commands: [{ type: "hangup_no_choice" as const }] };
  }
  const next = bumped(state, {
    phase: "PLAYING_RESPONSE" as const,
    inputTarget: "none" as const,
    gatherOpen: false,
    promptKind: "invalid_choice" as const,
    invalidReprompts: state.invalidReprompts + 1,
  });
  return {
    state: next,
    commands: [{ type: "play_invalid_choice" as const, generation: next.mediaGeneration }],
  };
}

function repromptCount(state: IvrCallMachineState) {
  if (
    state.phase !== "WAITING_FOR_INPUT" ||
    state.inputTarget !== "count" ||
    !state.gatherOpen ||
    !state.introCompleted ||
    state.choiceDigit !== "1" ||
    state.rsvpApplied
  ) {
    return ignore(state, "invalid_count_outside_window");
  }
  if (state.countReprompts >= MAX_COUNT_REPROMPTS) {
    const next = bumped(state, {
      phase: "COMPLETED",
      inputTarget: "none",
      gatherOpen: false,
      promptKind: "",
    });
    return { state: next, commands: [{ type: "hangup_no_choice" as const }] };
  }
  const next = bumped(state, {
    phase: "PLAYING_RESPONSE" as const,
    inputTarget: "none" as const,
    gatherOpen: false,
    promptKind: "invalid_count" as const,
    countReprompts: state.countReprompts + 1,
  });
  return {
    state: next,
    commands: [{ type: "play_invalid_count" as const, generation: next.mediaGeneration }],
  };
}

function acceptChoice(state: IvrCallMachineState, digit: "1" | "2" | "3") {
  if (!invalidChoiceAllowed(state)) {
    return ignore(state, "choice_outside_window");
  }
  if (digit === "1") {
    const next = bumped(state, {
      phase: "PLAYING_RESPONSE",
      inputTarget: "none",
      gatherOpen: false,
      choiceDigit: "1",
      promptKind: "ask_count",
    });
    return {
      state: next,
      commands: [{ type: "play_ask_count" as const, generation: next.mediaGeneration }],
    };
  }
  const next = bumped(state, {
    phase: "PLAYING_RESPONSE",
    inputTarget: "none",
    gatherOpen: false,
    choiceDigit: digit,
    promptKind: "thanks",
    rsvpApplied: true,
  });
  return {
    state: next,
    commands: [
      {
        type: "apply_rsvp" as const,
        rsvp: digit === "2" ? ("no" as const) : ("maybe" as const),
        attendingCount: digit === "2" ? 0 : null,
      },
      {
        type: "play_thanks" as const,
        kind: "received" as const,
        generation: next.mediaGeneration,
      },
    ],
  };
}

function onDigits(input: {
  state: IvrCallMachineState;
  digits: string;
  status: string;
  generation: number;
  stage: string;
  source: "gather" | "dtmf";
}) {
  const state = input.state;
  if (state.rsvpApplied || state.phase === "COMPLETED") {
    return ignore(state, "already_finished");
  }
  const status = String(input.status || "").toLowerCase();
  if (
    status === "cancelled" ||
    status === "canceled" ||
    status === "call_hangup"
  ) {
    return ignore(state, "gather_closed");
  }
  if (
    input.generation &&
    state.mediaGeneration &&
    input.generation !== state.mediaGeneration
  ) {
    return ignore(state, "stale_gather");
  }
  if (
    input.stage &&
    state.inputTarget === "choice" &&
    input.stage !== "choice" &&
    input.stage !== "invalid_choice"
  ) {
    return ignore(state, "stage_mismatch");
  }
  if (
    input.stage &&
    state.inputTarget === "count" &&
    input.stage !== "count" &&
    input.stage !== "invalid_count"
  ) {
    return ignore(state, "stage_mismatch");
  }

  if (state.phase !== "WAITING_FOR_INPUT" || !state.introCompleted || !state.gatherOpen) {
    return ignore(state, "input_before_choice_window");
  }

  if (state.inputTarget === "choice") {
    if (state.choiceDigit) return ignore(state, "choice_already_taken");
    const digits = String(input.digits || "").trim();
    if (!digits) return repromptChoice(state);
    const choice = choiceDigitFrom(digits);
    if (!choice) return repromptChoice(state);
    return acceptChoice(state, choice);
  }

  if (state.inputTarget === "count") {
    if (input.source === "dtmf") {
      return ignore(state, "count_waits_for_gather_end");
    }
    const parsed = parseDtmfGuestCount(input.digits);
    if (!parsed.ok) return repromptCount(state);
    const next = bumped(state, {
      phase: "PLAYING_RESPONSE",
      inputTarget: "none",
      gatherOpen: false,
      promptKind: "thanks",
      rsvpApplied: true,
    });
    return {
      state: next,
      commands: [
        {
          type: "apply_rsvp" as const,
          rsvp: "yes" as const,
          attendingCount: parsed.count,
        },
        {
          type: "play_thanks" as const,
          kind: "attending" as const,
          generation: next.mediaGeneration,
        },
      ],
    };
  }

  return ignore(state, "no_input_target");
}

function onPlaybackEnded(
  state: IvrCallMachineState,
  event: Extract<IvrMachineEvent, { type: "playback_ended" }>
) {
  if (state.phase === "COMPLETED" || state.rsvpApplied && state.phase === "WAITING_FOR_INPUT") {
    return ignore(state, "playback_after_finish");
  }
  if (
    event.generation &&
    state.mediaGeneration &&
    event.generation !== state.mediaGeneration
  ) {
    return ignore(state, "stale_playback");
  }
  const status = String(event.status || "").toLowerCase();
  if (status === "cancelled" || status === "canceled" || status === "call_hangup") {
    return ignore(state, "playback_not_completed");
  }
  if (state.phase !== "PLAYING_INTRO" && state.phase !== "PLAYING_RESPONSE") {
    return ignore(state, "playback_outside_play_phase");
  }
  const stage = String(event.stage || "");
  const prompt = state.promptKind;
  if (stage && prompt && stage !== prompt && !(prompt === "thanks" && stage === "hangup_after_thanks") && !(prompt === "system" && stage === "hangup_after_system")) {
    return ignore(state, "stage_mismatch");
  }

  if (status === "failed") {
    if (
      prompt === "intro" &&
      state.phase === "PLAYING_INTRO" &&
      state.playbackRetries < MAX_INTRO_PLAYBACK_RETRIES
    ) {
      const next = bumped(state, {
        playbackRetries: state.playbackRetries + 1,
        promptKind: "intro",
        gatherOpen: false,
      });
      return {
        state: next,
        commands: [{ type: "play_intro" as const, generation: next.mediaGeneration }],
      };
    }
    const next = bumped(state, {
      phase: "COMPLETED",
      gatherOpen: false,
      inputTarget: "none",
      promptKind: "",
    });
    return {
      state: next,
      commands: [
        { type: "mark_playback_failed" as const },
        { type: "hangup" as const },
      ],
    };
  }

  if (status && status !== "completed") {
    return ignore(state, `playback_status_${status}`);
  }

  if (prompt === "intro" || (state.phase === "PLAYING_INTRO" && (!stage || stage === "intro"))) {
    if (state.introCompleted) return ignore(state, "intro_already_completed");
    const next = bumped(state, {
      phase: "WAITING_FOR_INPUT",
      inputTarget: "choice",
      introCompleted: true,
      gatherOpen: true,
      promptKind: "",
    });
    return {
      state: next,
      commands: [{ type: "open_choice_gather" as const, generation: next.mediaGeneration }],
    };
  }

  if (prompt === "invalid_choice") {
    const next = bumped(state, {
      phase: "WAITING_FOR_INPUT",
      inputTarget: "choice",
      gatherOpen: true,
      promptKind: "",
    });
    return {
      state: next,
      commands: [{ type: "open_choice_gather" as const, generation: next.mediaGeneration }],
    };
  }

  if (prompt === "ask_count") {
    const next = bumped(state, {
      phase: "WAITING_FOR_INPUT",
      inputTarget: "count",
      gatherOpen: true,
      promptKind: "",
    });
    return {
      state: next,
      commands: [{ type: "open_count_gather" as const, generation: next.mediaGeneration }],
    };
  }

  if (prompt === "invalid_count") {
    const next = bumped(state, {
      phase: "WAITING_FOR_INPUT",
      inputTarget: "count",
      gatherOpen: true,
      promptKind: "",
    });
    return {
      state: next,
      commands: [{ type: "open_count_gather" as const, generation: next.mediaGeneration }],
    };
  }

  if (
    prompt === "thanks" ||
    prompt === "system" ||
    stage === "hangup_after_thanks" ||
    stage === "hangup_after_system"
  ) {
    const next = bumped(state, {
      phase: "COMPLETED",
      gatherOpen: false,
      inputTarget: "none",
      promptKind: prompt === "system" ? "system" : "",
    });
    return { state: next, commands: [{ type: "hangup" as const }] };
  }

  return ignore(state, "unexpected_playback");
}

export function reduceIvrCall(
  state: IvrCallMachineState,
  event: IvrMachineEvent
): { state: IvrCallMachineState; commands: IvrMachineCommand[] } {
  if (event.type === "ringing") {
    if (state.phase !== "RINGING") return ignore(state, "ring_after_progress");
    return { state, commands: [] };
  }

  if (event.type === "answered") {
    if (state.rsvpApplied || state.phase === "COMPLETED") {
      return ignore(state, "already_finished");
    }
    if (state.phase !== "RINGING" && state.phase !== "ANSWERED") {
      return ignore(state, "intro_already_started");
    }
    if (state.introCompleted || state.choiceDigit) {
      return ignore(state, "intro_already_started");
    }
    const next = bumped(state, {
      phase: "PLAYING_INTRO",
      inputTarget: "none",
      gatherOpen: false,
      promptKind: "intro",
      introCompleted: false,
    });
    return {
      state: next,
      commands: [{ type: "play_intro", generation: next.mediaGeneration }],
    };
  }

  if (event.type === "playback_ended") {
    return onPlaybackEnded(state, event);
  }

  if (event.type === "gather_ended") {
    return onDigits({
      state,
      digits: event.digits,
      status: event.status,
      generation: event.generation,
      stage: event.stage,
      source: "gather",
    });
  }

  if (event.type === "dtmf") {
    return onDigits({
      state,
      digits: event.digit,
      status: "",
      generation: 0,
      stage: event.stage,
      source: "dtmf",
    });
  }

  if (event.type === "hangup") {
    const next = bumped(state, {
      phase: "COMPLETED",
      gatherOpen: false,
      inputTarget: "none",
    });
    if (state.rsvpApplied) {
      return { state: next, commands: [] };
    }
    return {
      state: next,
      commands: [{ type: "close_without_rsvp" }],
    };
  }

  return ignore(state, "unknown_event");
}
