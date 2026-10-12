/**
 * Browser-only IVR sample call.
 * Mirrors the existing keypad flow. It never dials, writes RSVP, or stores attempts.
 */

import { parseDtmfGuestCount } from "@/lib/calls/ivrRoundEligibility";

/** Same gather limit the live IVR uses for the guest-count step. */
export const IVR_PREVIEW_COUNT_DIGIT_MAX = 3;
/** Same inter-digit pause the live gather uses before accepting the count. */
export const IVR_PREVIEW_COUNT_IDLE_MS = 1000;

export type PreviewClip =
  | "intro"
  | "askCount"
  | "invalidChoice"
  | "invalidCount"
  | "thanksYes"
  | "thanksOther";

export type PreviewPhase = "intro" | "choice" | "count" | "ended";

export type PreviewSimState = {
  phase: PreviewPhase;
  clip: PreviewClip | null;
  countDigits: string;
};

export function createPreviewSim(): PreviewSimState {
  return { phase: "intro", clip: "intro", countDigits: "" };
}

function choiceFromDigit(digit: string): PreviewSimState | null {
  if (digit === "1") {
    return { phase: "count", clip: "askCount", countDigits: "" };
  }
  if (digit === "2" || digit === "3") {
    return { phase: "ended", clip: "thanksOther", countDigits: "" };
  }
  return null;
}

function collectingCount(state: PreviewSimState) {
  return (
    state.phase === "count" ||
    state.clip === "askCount" ||
    state.clip === "invalidCount"
  );
}

export function submitPreviewCount(state: PreviewSimState): PreviewSimState {
  const parsed = parseDtmfGuestCount(state.countDigits);
  if (!parsed.ok) {
    return { phase: "count", clip: "invalidCount", countDigits: "" };
  }
  return { phase: "ended", clip: "thanksYes", countDigits: state.countDigits };
}

export function previewSimDigit(
  state: PreviewSimState,
  digit: string
): PreviewSimState {
  const key = String(digit || "").slice(0, 1);
  if (!key) return state;
  if (
    state.phase === "ended" ||
    state.clip === "thanksYes" ||
    state.clip === "thanksOther"
  ) {
    return state;
  }

  if (
    state.phase === "intro" ||
    state.phase === "choice" ||
    state.clip === "invalidChoice"
  ) {
    const choice = choiceFromDigit(key);
    if (choice) return choice;
    if (
      (state.phase === "choice" || state.clip === "invalidChoice") &&
      /^[0-9*#]$/.test(key)
    ) {
      return { phase: "choice", clip: "invalidChoice", countDigits: "" };
    }
    return state;
  }

  if (!collectingCount(state)) return state;
  if (key === "#") return submitPreviewCount(state);
  if (!/^\d$/.test(key)) return state;
  if (state.countDigits.length >= IVR_PREVIEW_COUNT_DIGIT_MAX) return state;
  return {
    phase: "count",
    clip:
      state.clip === "askCount" || state.clip === "invalidCount"
        ? state.clip
        : null,
    countDigits: state.countDigits + key,
  };
}

export function previewSimClipEnded(state: PreviewSimState): PreviewSimState {
  if (state.clip === "intro") {
    return { phase: "choice", clip: null, countDigits: "" };
  }
  if (state.clip === "askCount" || state.clip === "invalidCount") {
    return { phase: "count", clip: null, countDigits: state.countDigits };
  }
  if (state.clip === "invalidChoice") {
    return { phase: "choice", clip: null, countDigits: "" };
  }
  if (state.clip === "thanksYes" || state.clip === "thanksOther") {
    return { phase: "ended", clip: null, countDigits: state.countDigits };
  }
  return state;
}

export function previewSimCountIdle(state: PreviewSimState): PreviewSimState {
  if (!state.countDigits) return state;
  if (
    state.clip === "intro" ||
    state.clip === "invalidChoice" ||
    state.clip === "thanksYes" ||
    state.clip === "thanksOther"
  ) {
    return state;
  }
  if (!collectingCount(state) && state.phase !== "count") return state;
  return submitPreviewCount(state);
}
