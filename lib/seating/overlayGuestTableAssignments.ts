/**
 * Read-only display overlay: if the couple saved tableId/tableName on
 * InvitationGuest (and sent those numbers yesterday) but seatingtables
 * seatedGuests is missing them, attach those guests to the matching table
 * in the API response only. Never persists. Never moves a guest already
 * present on the map (protects live-day changes and arrived guests).
 */

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function guestIdOf(guest: any) {
  return clean(guest?._id || guest?.id);
}

function tableKeys(table: any) {
  const keys = new Set<string>();
  const id = clean(table?.id || table?._id || table?.tableId);
  const name = clean(table?.name);
  const number = clean(table?.number ?? table?.tableNumber);
  if (id) keys.add(id);
  if (name) {
    keys.add(name);
    keys.add(name.replace(/^שולחן\s*/, "").trim());
  }
  if (number) {
    keys.add(number);
    keys.add(`שולחן ${number}`);
  }
  return keys;
}

function findMatchingTable(tables: any[], guest: any) {
  const candidates = [
    clean(guest?.tableId),
    clean(guest?.tableName),
    clean(guest?.tableNumber),
    guest?.tableNumber ? `שולחן ${guest.tableNumber}` : "",
  ].filter(Boolean);

  if (!candidates.length) return null;

  return (
    tables.find((table) => {
      const keys = tableKeys(table);
      return candidates.some((c) => keys.has(c));
    }) || null
  );
}

function plannedChairCount(guest: any) {
  const arrived = Math.max(0, Number(guest?.arrivedCount || 0));
  const count = Math.max(0, Number(guest?.guestsCount || 0));
  return Math.max(arrived, count, 1);
}

function nextFreeIndexes(table: any, needed: number) {
  const capacity = Math.max(
    0,
    Number(table?.seats ?? table?.capacity ?? table?.seatCount ?? 12)
  );
  const occupied = new Set(
    (table?.seatedGuests || [])
      .map((sg: any) => Number(sg?.seatIndex))
      .filter((n: number) => Number.isFinite(n))
  );
  const free: number[] = [];
  for (let i = 0; i < Math.max(capacity, needed + occupied.size); i++) {
    if (!occupied.has(i)) free.push(i);
    if (free.length >= needed) break;
  }
  return free;
}

export function overlayGuestTableAssignments(tables: any[], guests: any[]) {
  if (!Array.isArray(tables) || !tables.length) {
    return { tables, overlaidGuestIds: [] as string[] };
  }

  const seated = new Set<string>();
  for (const table of tables) {
    for (const entry of table?.seatedGuests || []) {
      const id = clean(entry?.guestId ?? entry?._id ?? entry?.id);
      if (id) seated.add(id);
    }
  }

  const overlaidGuestIds: string[] = [];
  const nextTables = tables.map((table) => ({
    ...table,
    seatedGuests: Array.isArray(table?.seatedGuests)
      ? [...table.seatedGuests]
      : [],
  }));

  for (const guest of guests || []) {
    const guestId = guestIdOf(guest);
    if (!guestId || seated.has(guestId)) continue;

    const table = findMatchingTable(nextTables, guest);
    if (!table) continue;

    const chairs = plannedChairCount(guest);
    const indexes = nextFreeIndexes(table, chairs);
    table.seatedGuests.push(
      ...indexes.map((seatIndex) => ({
        guestId,
        seatIndex,
        arrived: Number(guest?.actualArrivedCount || 0) > 0,
        overlayFromGuestRecord: true,
      }))
    );
    seated.add(guestId);
    overlaidGuestIds.push(guestId);
  }

  return { tables: nextTables, overlaidGuestIds };
}

export function guestHasSavedTable(guest: any) {
  return Boolean(
    clean(guest?.tableId) ||
      clean(guest?.tableName) ||
      (guest?.tableNumber !== undefined &&
        guest?.tableNumber !== null &&
        guest?.tableNumber !== "")
  );
}

export function plannedAllocatedSeats(guest: any, mappedChairs = 0) {
  const mapped = Math.max(0, Math.floor(Number(mappedChairs || 0)));
  if (!guestHasSavedTable(guest) && mapped <= 0) return mapped;
  return Math.max(
    mapped,
    Math.max(0, Number(guest?.arrivedCount || 0)),
    Math.max(0, Number(guest?.guestsCount || 0))
  );
}
