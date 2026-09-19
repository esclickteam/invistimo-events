/**
 * Day-of / Reception helpers for verified Venue events.
 * Arrival uses InvitationGuest.actualArrivedCount (Live check-in field).
 */

export function rsvpBucket(status: unknown): "yes" | "no" | "pending" {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (["yes", "approved", "coming", "confirmed", "accepted"].includes(s)) {
    return "yes";
  }
  if (["no", "declined", "rejected", "not_coming"].includes(s)) return "no";
  return "pending";
}

export function guestPartySize(g: {
  guestCount?: unknown;
  count?: unknown;
  amount?: unknown;
}) {
  const n = Number(g.guestCount ?? g.count ?? g.amount ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Count of people that have checked in (Live). */
export function guestArrivedCount(g: {
  actualArrivedCount?: unknown;
  arrivedCount?: unknown;
  arrived?: unknown;
  checkedIn?: unknown;
  arrivalStatus?: unknown;
  arrivedAt?: unknown;
}) {
  const actual = Number(g.actualArrivedCount);
  if (Number.isFinite(actual) && actual > 0) return actual;

  // Legacy / alternate stamps — only if actual is unset/zero
  if (g.arrived === true || g.checkedIn === true) {
    return guestPartySize(g as any);
  }
  const status = String(g.arrivalStatus || "")
    .trim()
    .toLowerCase();
  if (status === "arrived" || g.arrivedAt) {
    return guestPartySize(g as any);
  }
  return 0;
}

export function summarizeGuests(guests: any[]) {
  let yes = 0;
  let no = 0;
  let pending = 0;
  let arrived = 0;
  let expected = 0;
  for (const g of guests) {
    const n = guestPartySize(g);
    expected += n;
    const b = rsvpBucket(g.status ?? g.rsvp);
    if (b === "yes") yes += n;
    else if (b === "no") no += n;
    else pending += n;
    arrived += guestArrivedCount(g);
  }
  return {
    groups: guests.length,
    expected,
    rsvpYes: yes,
    rsvpNo: no,
    rsvpPending: pending,
    arrived,
  };
}

export function serializeDayOfGuest(g: any) {
  const expected = guestPartySize(g);
  const arrived = guestArrivedCount(g);
  return {
    id: String(g._id),
    name: String(g.name || g.fullName || "אורח").trim() || "אורח",
    phone: String(g.phone || "").trim(),
    side: String(g.side || "").trim(),
    rsvp: rsvpBucket(g.status ?? g.rsvp),
    expected,
    arrived,
    tableId: g.tableId ? String(g.tableId) : "",
    tableName: String(g.tableName || "").trim(),
    notes: String(g.notes || g.note || "").trim(),
  };
}
