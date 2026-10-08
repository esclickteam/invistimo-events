/**
 * Call package type: human call-center vs recorded IVR.
 * Existing users/events default to "human" — never change behavior silently.
 */

export type CallsType = "human" | "ivr";

type CallsUserLike = {
  includeCalls?: boolean | null;
  callsType?: unknown;
} | null | undefined;

/** Accept lean docs, native Mongo documents, and partial user payloads. */
function asCallsUserLike(user: unknown): CallsUserLike {
  if (!user || typeof user !== "object") return null;
  return user as {
    includeCalls?: boolean | null;
    callsType?: unknown;
  };
}

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
export function getUserCallsType(user: unknown): CallsType {
  const u = asCallsUserLike(user);
  if (!u?.includeCalls) {
    // No calls package — type is irrelevant; still return human as default.
    return normalizeCallsType(u?.callsType);
  }

  return normalizeCallsType(u?.callsType);
}

export function isHumanCallsUser(user: unknown) {
  const u = asCallsUserLike(user);
  return Boolean(u?.includeCalls) && getUserCallsType(u) === "human";
}

export function isIvrCallsUser(user: unknown) {
  const u = asCallsUserLike(user);
  return Boolean(u?.includeCalls) && getUserCallsType(u) === "ivr";
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
