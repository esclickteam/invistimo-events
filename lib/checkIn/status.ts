/**
 * Check-in status is always computed from existing counts.
 * confirmed = InvitationGuest.arrivedCount (RSVP yes count)
 * checkedIn = InvitationGuest.actualArrivedCount (day-of arrivals)
 */

export type CheckInStatus =
  | "NOT_ARRIVED"
  | "PARTIALLY_ARRIVED"
  | "FULLY_ARRIVED";

export function confirmedGuestCount(guest: {
  arrivedCount?: unknown;
  rsvp?: unknown;
  guestsCount?: unknown;
}): number {
  const rsvp = String(guest?.rsvp || "").toLowerCase();
  if (rsvp === "no") return 0;

  const arrived = Number(guest?.arrivedCount);
  if (Number.isFinite(arrived) && arrived > 0) return Math.floor(arrived);

  if (rsvp === "yes") {
    const invited = Number(guest?.guestsCount);
    if (Number.isFinite(invited) && invited > 0) return Math.floor(invited);
    return 1;
  }

  return 0;
}

export function checkedInGuestCount(guest: {
  actualArrivedCount?: unknown;
}): number {
  const n = Number(guest?.actualArrivedCount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function computeCheckInStatus(guest: {
  arrivedCount?: unknown;
  actualArrivedCount?: unknown;
  rsvp?: unknown;
  guestsCount?: unknown;
}): CheckInStatus {
  const checkedIn = checkedInGuestCount(guest);
  if (checkedIn <= 0) return "NOT_ARRIVED";

  const confirmed = confirmedGuestCount(guest);
  if (confirmed > 0 && checkedIn >= confirmed) return "FULLY_ARRIVED";
  return "PARTIALLY_ARRIVED";
}

export function checkInStatusLabel(
  status: CheckInStatus,
  guest?: {
    arrivedCount?: unknown;
    actualArrivedCount?: unknown;
    rsvp?: unknown;
    guestsCount?: unknown;
  }
): string {
  const checkedIn = guest ? checkedInGuestCount(guest) : 0;
  const confirmed = guest ? confirmedGuestCount(guest) : 0;

  if (status === "NOT_ARRIVED") return "טרם הגיע";
  if (status === "FULLY_ARRIVED") {
    return confirmed > 0 ? `הגיע ${checkedIn}/${confirmed}` : "הגיע";
  }
  return `הגיע חלקית ${checkedIn}/${Math.max(confirmed, checkedIn)}`;
}

export function summarizeCheckIn(guests: Array<{
  arrivedCount?: unknown;
  actualArrivedCount?: unknown;
  rsvp?: unknown;
  guestsCount?: unknown;
}>) {
  let confirmed = 0;
  let checkedIn = 0;
  let notArrived = 0;
  let partiallyArrived = 0;
  let fullyArrived = 0;

  for (const guest of guests) {
    const c = confirmedGuestCount(guest);
    const a = checkedInGuestCount(guest);
    confirmed += c;
    checkedIn += a;

    const status = computeCheckInStatus(guest);
    if (status === "NOT_ARRIVED") notArrived += 1;
    else if (status === "PARTIALLY_ARRIVED") partiallyArrived += 1;
    else fullyArrived += 1;
  }

  return {
    confirmed,
    checkedIn,
    remaining: Math.max(0, confirmed - checkedIn),
    notArrived,
    partiallyArrived,
    fullyArrived,
  };
}
