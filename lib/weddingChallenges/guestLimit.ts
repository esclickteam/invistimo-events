import {
  WEDDING_CHALLENGES_GUEST_LIMIT_MESSAGE,
  WEDDING_CHALLENGES_MAX_GUESTS,
} from "./constants";

export function wouldExceedWeddingChallengesGuestLimit(
  existingCount: number,
  incomingNewCount: number,
  maxGuests = WEDDING_CHALLENGES_MAX_GUESTS
) {
  return Number(existingCount || 0) + Number(incomingNewCount || 0) > maxGuests;
}

export function weddingChallengesGuestLimitPayload() {
  return {
    success: false as const,
    error: "GUEST_LIMIT_EXCEEDED",
    message: WEDDING_CHALLENGES_GUEST_LIMIT_MESSAGE,
    maxGuests: WEDDING_CHALLENGES_MAX_GUESTS,
  };
}
