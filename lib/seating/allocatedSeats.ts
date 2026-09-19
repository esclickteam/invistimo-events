function normalizeSeatGuestId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown };
    return String(record._id || record.id || "").trim();
  }
  return "";
}

function sameSeatGuest(entry: any, guestId: string) {
  const left = normalizeSeatGuestId(
    entry?.guestId ?? entry?._id ?? entry?.id
  );
  const right = String(guestId || "").trim();
  return !!left && !!right && left === right;
}

function seatsRepresentedByEntry(entry: any) {
  if (
    entry?.seatIndex !== undefined &&
    entry?.seatIndex !== null &&
    entry?.seatIndex !== ""
  ) {
    return 1;
  }

  const explicit = Number(entry?.seats ?? entry?.seatCount);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }

  const planned = Number(entry?.arrivedCount || entry?.guestsCount || 0);
  if (
    planned > 1 &&
    (entry?.name || entry?.fullName || entry?.rsvp || entry?.guestsCount)
  ) {
    return Math.floor(planned);
  }

  return 1;
}

export function countAllocatedSeats(
  tables: any[] | null | undefined,
  guestId: string
) {
  if (!guestId) return 0;

  let count = 0;
  for (const table of tables || []) {
    for (const entry of table?.seatedGuests || []) {
      if (!sameSeatGuest(entry, guestId)) continue;
      count += seatsRepresentedByEntry(entry);
    }
  }

  return count;
}
