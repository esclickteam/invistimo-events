import type { WeddingChallengesSourceType } from "./types";

export const WEDDING_CHALLENGES_SOURCE_TYPES = [
  "EXISTING_EVENT",
  "STANDALONE_GAME",
] as const;

export function isWeddingChallengesSourceType(
  value: unknown
): value is WeddingChallengesSourceType {
  return value === "EXISTING_EVENT" || value === "STANDALONE_GAME";
}

export function normalizeWeddingChallengesSourceType(
  value: unknown,
  fallback: WeddingChallengesSourceType = "EXISTING_EVENT"
): WeddingChallengesSourceType {
  return isWeddingChallengesSourceType(value) ? value : fallback;
}

export function inferWeddingChallengesSourceType(params: {
  sourceType?: unknown;
  eventProductType?: unknown;
  standaloneGame?: unknown;
}): WeddingChallengesSourceType {
  if (isWeddingChallengesSourceType(params.sourceType)) {
    return params.sourceType;
  }
  if (params.eventProductType === "wedding_challenges" || params.standaloneGame === true) {
    return "STANDALONE_GAME";
  }
  return "EXISTING_EVENT";
}

export function attendingGuestMongoFilter(sourceType: WeddingChallengesSourceType) {
  if (sourceType === "STANDALONE_GAME") {
    return { rsvp: { $ne: "no" } };
  }
  return { rsvp: "yes" };
}

export function guestIsEligibleForWeddingChallenges(params: {
  sourceType: WeddingChallengesSourceType;
  rsvp?: unknown;
}) {
  const rsvp = String(params.rsvp || "").toLowerCase();
  if (params.sourceType === "STANDALONE_GAME") {
    return rsvp !== "no";
  }
  return rsvp === "yes";
}
