/**
 * Call package type: human call-center vs recorded IVR.
 * Existing users/events default to "human" — never change behavior silently.
 */

export type CallsType = "human" | "ivr";

export function normalizeCallsType(value: unknown): CallsType {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (raw === "ivr" || raw === "recorded" || raw === "recorded_ivr") {
    return "ivr";
  }

  return "human";
}

/** Effective type for a user/event. Missing/null → human (backward compatible). */
export function getUserCallsType(user: {
  includeCalls?: boolean | null;
  callsType?: unknown;
} | null | undefined): CallsType {
  if (!user?.includeCalls) {
    // No calls package — type is irrelevant; still return human as default.
    return normalizeCallsType(user?.callsType);
  }

  return normalizeCallsType(user?.callsType);
}

export function isHumanCallsUser(user: {
  includeCalls?: boolean | null;
  callsType?: unknown;
} | null | undefined) {
  return Boolean(user?.includeCalls) && getUserCallsType(user) === "human";
}

export function isIvrCallsUser(user: {
  includeCalls?: boolean | null;
  callsType?: unknown;
} | null | undefined) {
  return Boolean(user?.includeCalls) && getUserCallsType(user) === "ivr";
}

/**
 * Per-round call type for future mixed models.
 * Phase 1: never mix — inherit user.callsType when round.callType is absent.
 */
export function getRoundCallType(input: {
  userCallsType: CallsType;
  roundCallType?: unknown;
}): CallsType {
  if (input.roundCallType == null || input.roundCallType === "") {
    return input.userCallsType;
  }

  return normalizeCallsType(input.roundCallType);
}
