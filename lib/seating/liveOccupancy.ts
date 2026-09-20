import { countAllocatedSeats } from "./allocatedSeats";

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

export function getTableCapacity(table: any) {
  return Math.max(
    0,
    Number(table?.capacity || table?.seats || table?.seatCount || 12)
  );
}

/**
 * LIVE occupancy contribution for one guest.
 * Matches table "בפועל" display: actualArrivedCount when present, otherwise 0.
 */
export function getGuestLiveOccupancy(guest: any | null | undefined) {
  if (!guest || !hasActualArrivedValue(guest)) return 0;
  return getActualArrivedCount(guest);
}

/**
 * Sum of LIVE (actual) occupancy at a table.
 * For the focused guest, use `focusGuestOccupancy` so newly-added arrivals
 * that are not seated yet do not consume free seats in the suggestion UI.
 */
export function getTableLiveActualOccupied(
  table: any,
  guestLookup: Map<string, any>,
  options?: {
    focusGuestId?: string;
    focusGuestOccupancy?: number;
  }
) {
  const seen = new Set<string>();
  let total = 0;

  for (const entry of table?.seatedGuests || []) {
    const guestId = normalizeId(entry?.guestId ?? entry?._id ?? entry?.id);
    if (!guestId || seen.has(guestId)) continue;
    seen.add(guestId);

    if (options?.focusGuestId && sameId(guestId, options.focusGuestId)) {
      total += Math.max(0, Number(options.focusGuestOccupancy ?? 0));
      continue;
    }

    total += getGuestLiveOccupancy(guestLookup.get(guestId));
  }

  return total;
}

export function getTableLiveFreeSeats(
  table: any,
  guestLookup: Map<string, any>,
  options?: {
    focusGuestId?: string;
    focusGuestOccupancy?: number;
  }
) {
  const capacity = getTableCapacity(table);
  const occupied = getTableLiveActualOccupied(table, guestLookup, options);
  return Math.max(0, capacity - occupied);
}

export type CurrentTableLiveOption = {
  tableId: string;
  tableName: string;
  tableNumber: any;
  capacity: number;
  actualOccupied: number;
  freeSeats: number;
  requiredSeats: number;
  usableSeats: number;
  canFit: boolean;
  canFitPartial: boolean;
  isCurrentTable: true;
};

export function buildCurrentTableLiveOption({
  table,
  tableId,
  tableName,
  guestLookup,
  guestId,
  allocated,
  requiredSeats,
}: {
  table: any;
  tableId: string;
  tableName: string;
  guestLookup: Map<string, any>;
  guestId: string;
  allocated: number;
  requiredSeats: number;
}): CurrentTableLiveOption {
  const capacity = getTableCapacity(table);
  const actualOccupied = getTableLiveActualOccupied(table, guestLookup, {
    focusGuestId: guestId,
    focusGuestOccupancy: allocated,
  });
  const freeSeats = Math.max(0, capacity - actualOccupied);
  const needed = Math.max(0, requiredSeats);
  const usableSeats = Math.min(freeSeats, needed);

  return {
    tableId,
    tableName,
    tableNumber: table?.tableNumber || table?.number || null,
    capacity,
    actualOccupied,
    freeSeats,
    requiredSeats: needed,
    usableSeats,
    canFit: freeSeats >= needed,
    canFitPartial: needed > 0 && freeSeats > 0 && freeSeats < needed,
    isCurrentTable: true,
  };
}

/**
 * Free seat indexes that are not taken by anyone (including the focus guest).
 */
export function findAbsolutelyFreeSeatIndexes(table: any, count: number) {
  const capacity = getTableCapacity(table);
  const occupied = new Set(
    (table?.seatedGuests || [])
      .map((sg: any) => Number(sg?.seatIndex))
      .filter((n: number) => Number.isFinite(n))
  );

  const free: number[] = [];
  for (let i = 0; i < capacity; i++) {
    if (!occupied.has(i)) free.push(i);
    if (free.length >= count) break;
  }
  return free;
}

/**
 * Release planned seats that exceed a guest's LIVE actual arrivals.
 * This unlocks physical chairs that show as free in "בפועל" but are still
 * held in the seating plan.
 */
export function reclaimUnusedAllocatedSeats(
  table: any,
  guestLookup: Map<string, any>,
  preserveGuestId?: string
) {
  const grouped = new Map<string, any[]>();

  for (const entry of table?.seatedGuests || []) {
    const guestId = normalizeId(entry?.guestId ?? entry?._id ?? entry?.id);
    if (!guestId) continue;
    if (!grouped.has(guestId)) grouped.set(guestId, []);
    grouped.get(guestId)!.push(entry);
  }

  const next: any[] = [];
  let reclaimed = 0;

  for (const [guestId, entries] of grouped) {
    if (preserveGuestId && sameId(guestId, preserveGuestId)) {
      next.push(...entries);
      continue;
    }

    const guest = guestLookup.get(guestId);
    if (!hasActualArrivedValue(guest)) {
      next.push(...entries);
      continue;
    }

    const keep = getActualArrivedCount(guest);
    if (entries.length <= keep) {
      next.push(...entries);
      continue;
    }

    next.push(...entries.slice(0, keep));
    reclaimed += entries.length - keep;
  }

  table.seatedGuests = next;
  return reclaimed;
}

export function trimGuestSeatsToCount(table: any, guestId: string, keep: number) {
  const mine: any[] = [];
  const others: any[] = [];

  for (const entry of table?.seatedGuests || []) {
    if (sameId(entry?.guestId, guestId)) mine.push(entry);
    else others.push(entry);
  }

  const kept = Math.max(0, keep);
  table.seatedGuests = [...others, ...mine.slice(0, kept)];
  return Math.max(0, mine.length - kept);
}

export function appendGuestSeats(
  table: any,
  guestId: string,
  seatIndexes: number[]
) {
  table.seatedGuests = table.seatedGuests || [];
  table.seatedGuests.push(
    ...seatIndexes.map((seatIndex) => ({
      guestId,
      seatIndex,
      arrived: true,
    }))
  );
}

export function describeAllocatedGap(actual: number, allocated: number) {
  const safeActual = Math.max(0, Number(actual || 0));
  const safeAllocated = Math.max(0, Number(allocated || 0));
  const shortage = Math.max(0, safeActual - safeAllocated);
  const surplus = Math.max(0, safeAllocated - safeActual);

  return {
    actual: safeActual,
    allocated: safeAllocated,
    shortage,
    surplus,
    diff: safeActual - safeAllocated,
    status: shortage > 0 ? "over" : surplus > 0 ? "under" : "match",
  };
}

export function countGuestAllocatedOnTable(table: any, guestId: string) {
  return countAllocatedSeats([table], guestId);
}
