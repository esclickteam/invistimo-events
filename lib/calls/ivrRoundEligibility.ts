/**
 * IVR round eligibility (phase 1 — separate from human call-center).
 *
 * Round 1: RSVP pending only
 * Round 2: still no final RSVP (pending) — includes no_answer / failed / hangup
 * Round 3: still no final RSVP (pending) + undecided/maybe
 *
 * Final RSVP (yes/no) from any channel excludes the guest from further IVR rounds.
 * Audience is always resolved at execution time — never at schedule save.
 */

import {
  extractGuestId,
  getGuestRsvpValue,
  hasGuestPhone,
  type CallRoundNumber,
  type GuestRsvpNormalized,
} from "@/lib/calls/callRoundEligibility";

export type IvrRoundNumber = CallRoundNumber;

export function isFinalRsvp(rsvp: GuestRsvpNormalized) {
  return rsvp === "yes" || rsvp === "no";
}

export function isGuestEligibleForIvrRound(input: {
  guest: any;
  round: IvrRoundNumber;
}): boolean {
  const { guest, round } = input;

  if (!hasGuestPhone(guest)) return false;

  const rsvp = getGuestRsvpValue(guest);

  if (isFinalRsvp(rsvp)) return false;

  if (round === 1 || round === 2) {
    return rsvp === "pending";
  }

  // Round 3: pending + maybe/undecided
  return rsvp === "pending" || rsvp === "maybe";
}

export function filterGuestsForIvrRound(input: {
  guests: any[];
  round: IvrRoundNumber;
}) {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const guest of input.guests) {
    if (!isGuestEligibleForIvrRound({ guest, round: input.round })) {
      continue;
    }

    const guestId =
      extractGuestId(guest?._id || guest?.id) ||
      String(guest?.phone || "").trim();
    if (!guestId || seen.has(guestId)) continue;

    seen.add(guestId);
    result.push(guest);
  }

  return result;
}

export function getIvrRoundAudienceLabel(round: IvrRoundNumber) {
  if (round === 1) return "ממתינים שעדיין לא נתנו תשובה";
  if (round === 2) return "עדיין ללא תשובה סופית לאחר סבב 1";
  return "עדיין ללא תשובה סופית + מתלבטים";
}

export function getIvrRoundDescription(round: IvrRoundNumber) {
  if (round === 1) {
    return "סבב מוקלט 1 - ממתינים שעדיין לא נתנו תשובה";
  }
  if (round === 2) {
    return "סבב מוקלט 2 - ללא תשובה סופית (כולל לא ענו / נכשל / ניתקו)";
  }
  return "סבב מוקלט 3 - ללא תשובה סופית + מתלבטים";
}

/** Max attending count for a guest record (invited party size). */
export function getGuestMaxAttendingCount(guest: any): number {
  const candidates = [
    guest?.guestsCount,
    guest?.amount,
    guest?.invitedCount,
    guest?.maxGuests,
    guest?.maxAttendingCount,
  ];

  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }

  return 1;
}

/** Sanity ceiling so a stuck keypad cannot write an unbounded count. */
export const IVR_ATTENDING_COUNT_SANITY_MAX = 999;

/**
 * Parse the attending count the guest entered.
 * The invited size on the record is not a limit — a party of 1 may confirm 5.
 * The optional second argument is ignored and kept so older callers cannot reintroduce that cap.
 */
export function parseDtmfGuestCount(
  digits: string,
  _invitedCountIgnored?: number
): { ok: true; count: number } | { ok: false; reason: string } {
  const raw = String(digits || "").replace(/\D/g, "");
  if (!raw) return { ok: false, reason: "empty" };

  const count = Number(raw);
  if (
    !Number.isFinite(count) ||
    count < 1 ||
    count > IVR_ATTENDING_COUNT_SANITY_MAX
  ) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, count: Math.floor(count) };
}
