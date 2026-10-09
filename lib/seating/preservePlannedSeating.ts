/**
 * Live seating must treat the couple's saved seating plan as the base.
 * Moving / displaying guests in live mode must never wipe planned chairs
 * just because actualArrivedCount is 0 or lower than the plan.
 */

function normalizeId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown };
    return String(record._id || record.id || "").trim();
  }
  return String(value).trim();
}

function sameId(a: unknown, b: unknown) {
  const left = normalizeId(a);
  const right = normalizeId(b);
  return !!left && !!right && left === right;
}

export function countGuestAllocatedChairs(
  tables: any[] | null | undefined,
  guestId: string
) {
  const id = normalizeId(guestId);
  if (!id) return 0;

  let count = 0;
  for (const table of tables || []) {
    for (const entry of table?.seatedGuests || []) {
      if (sameId(entry?.guestId ?? entry?._id ?? entry?.id, id)) {
        count += 1;
      }
    }
  }
  return count;
}

export function hasActualArrivedValue(guest: any) {
  return (
    guest?.actualArrivedCount !== undefined &&
    guest?.actualArrivedCount !== null &&
    guest?.actualArrivedCount !== ""
  );
}

export function getActualArrivedCount(guest: any) {
  return Math.max(0, Number(guest?.actualArrivedCount || 0));
}

export function getExpectedArrivedCount(guest: any) {
  return Math.max(
    0,
    Number(guest?.arrivedCount || 0) || Number(guest?.guestsCount || 0)
  );
}

/**
 * Seat count when relocating / seating a guest during LIVE.
 * - Already seated → keep the couple's allocated chair count.
 * - actualArrivedCount=0 must NOT release planned chairs.
 * - Fresh seating falls back to RSVP expected count.
 */
export function getSeatsCountForLiveMove(
  guest: any,
  currentAllocated: number
) {
  const allocated = Math.max(0, Math.floor(Number(currentAllocated || 0)));
  if (allocated > 0) return allocated;

  if (hasActualArrivedValue(guest)) {
    const actual = getActualArrivedCount(guest);
    if (actual > 0) return actual;
  }

  return Math.max(1, getExpectedArrivedCount(guest) || 1);
}

/**
 * How many chairs the live UI should treat as "needed" without
 * collapsing to 0 when nobody has checked in yet.
 */
export function getLiveDisplaySeatCount(guest: any, allocatedOnMap = 0) {
  const allocated = Math.max(0, Math.floor(Number(allocatedOnMap || 0)));
  const actual = hasActualArrivedValue(guest)
    ? getActualArrivedCount(guest)
    : 0;
  const planned = getExpectedArrivedCount(guest);

  return Math.max(allocated, actual, planned > 0 ? planned : 0);
}
