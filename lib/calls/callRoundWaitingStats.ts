/**
 * Waiting / done stats for a scheduled call round.
 *
 * Distinguishes:
 * - pendingRsvpTotal: still-pending RSVP without a phone result on this round
 *   (legacy admin "ממתינים" metric — not the dial list for rounds 2/3)
 * - guestsWaiting: guests eligible for THIS round who still need a call
 *   (matches filterGuestsForCallRound / work-order creation)
 */

import {
  filterGuestsForCallRound,
  getGuestStoredCallAnswer,
  isConfiguredHumanCallRound,
  normalizeGuestRsvpForCalls,
  type CallRoundNumber,
} from "@/lib/calls/callRoundEligibility";

export type CallRoundWaitingStats = {
  guestsWaiting: number;
  guestsDone: number;
  pendingRsvpTotal: number;
  eligibleTotal: number;
};

function asCallRoundNumber(round: number): CallRoundNumber | null {
  return isConfiguredHumanCallRound(round) ? round : null;
}

function hasPhoneResultOnRound(guest: any, round: CallRoundNumber) {
  const answer = getGuestStoredCallAnswer(guest, round);
  return answer === "answered" || answer === "no_answer";
}

export function getCallRoundWaitingStats(input: {
  guests: any[];
  round: number;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousCallbackByRound?: Partial<Record<1 | 2, Set<string>>>;
}): CallRoundWaitingStats {
  const round = asCallRoundNumber(Number(input.round || 0));
  const guests = Array.isArray(input.guests) ? input.guests : [];

  if (!round) {
    return {
      guestsWaiting: 0,
      guestsDone: 0,
      pendingRsvpTotal: 0,
      eligibleTotal: 0,
    };
  }

  let guestsDone = 0;
  let pendingRsvpTotal = 0;

  for (const guest of guests) {
    if (hasPhoneResultOnRound(guest, round)) {
      guestsDone += 1;
      continue;
    }

    const rsvp = normalizeGuestRsvpForCalls(guest?.rsvp || guest?.status);
    if (rsvp === "pending") {
      pendingRsvpTotal += 1;
    }
  }

  const eligible = filterGuestsForCallRound({
    guests,
    round,
    previousNoAnswerByRound: input.previousNoAnswerByRound,
    previousCallbackByRound: input.previousCallbackByRound,
  });

  const guestsWaiting = eligible.filter(
    (guest) => !hasPhoneResultOnRound(guest, round)
  ).length;

  return {
    guestsWaiting,
    guestsDone,
    pendingRsvpTotal,
    eligibleTotal: eligible.length,
  };
}
