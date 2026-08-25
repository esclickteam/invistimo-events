/**
 * InvitationGuest write guards.
 *
 * Root cause of the invite Mongo CPU spike:
 * POST /api/seating/save/[eventId] rewrote every guest on every autosave
 * because it always $set updatedAt (and seating fields) even when unchanged.
 *
 * Indexed fields on invitationguests (do not $set unless they actually change):
 * _id, invitationId, groupId, rsvp, status, token, plus Atlas extras
 * such as createdAt / updatedAt / compound keys. Never drop indexes here.
 */

export const INVITATION_GUEST_INDEXED_FIELDS = [
  "_id",
  "invitationId",
  "groupId",
  "rsvp",
  "status",
  "token",
] as const;

export const SEATING_ASSIGNMENT_FIELDS = [
  "tableId",
  "tableNumber",
  "tableName",
] as const;

export type SeatingAssignment = {
  tableId: string | null;
  tableNumber: number | null;
  tableName: string;
};

export type InvitationGuestSeatingSnapshot = {
  _id?: unknown;
  id?: unknown;
  tableId?: unknown;
  tableNumber?: unknown;
  tableName?: unknown;
};

export type SeatingTableLike = {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  tableNumber?: unknown;
  seatedGuests?: Array<{
    guestId?: unknown;
    _id?: unknown;
    id?: unknown;
  }>;
};

export type PlannedSeatingGuestWrite = {
  guestId: string;
  fields: SeatingAssignment;
  previous: SeatingAssignment;
  changedFields: string[];
};

export type GuestWriteAttempt = {
  source: string;
  guestId: string;
  eventId?: string | null;
  invitationId?: string | null;
  fieldsAttempted: string[];
  changedFields: string[];
  valuesChanged: boolean;
  skipped: boolean;
  skipReason?: string;
  recentAttempts: number;
};

export type SeatingGuestWritePlan = {
  source: string;
  eventId?: string | null;
  invitationId?: string | null;
  guestsConsidered: number;
  writes: PlannedSeatingGuestWrite[];
  skippedUnchanged: number;
  skippedMissingId: number;
  attempts: GuestWriteAttempt[];
  maxRecentAttempts: number;
};

const RECENT_WINDOW_MS = 60_000;
const HOT_GUEST_WARN_THRESHOLD = 5;
const MAX_TRACKED_GUESTS = 4_000;

const recentAttemptsByGuest = new Map<string, number[]>();

export function resetInvitationGuestWriteInstrumentation() {
  recentAttemptsByGuest.clear();
}

function pruneRecent(now: number) {
  if (recentAttemptsByGuest.size <= MAX_TRACKED_GUESTS) {
    for (const [guestId, times] of recentAttemptsByGuest) {
      const kept = times.filter((t) => now - t < RECENT_WINDOW_MS);
      if (kept.length) recentAttemptsByGuest.set(guestId, kept);
      else recentAttemptsByGuest.delete(guestId);
    }
    return;
  }

  recentAttemptsByGuest.clear();
}

export function recordGuestWriteAttempt(guestId: string, at = Date.now()) {
  pruneRecent(at);
  const key = String(guestId || "").trim();
  if (!key) return 0;
  const kept = (recentAttemptsByGuest.get(key) || []).filter(
    (t) => at - t < RECENT_WINDOW_MS
  );
  kept.push(at);
  recentAttemptsByGuest.set(key, kept);
  return kept.length;
}

export function getRecentGuestWriteAttempts(guestId: string, at = Date.now()) {
  const key = String(guestId || "").trim();
  const kept = (recentAttemptsByGuest.get(key) || []).filter(
    (t) => at - t < RECENT_WINDOW_MS
  );
  return kept.length;
}

export function normalizeEmptyId(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "null" || raw === "undefined") return null;
  return raw;
}

export function normalizeTableName(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeTableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value !== 0 ? value : null;
  }
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export function seatingAssignmentFromGuest(
  guest: InvitationGuestSeatingSnapshot | null | undefined
): SeatingAssignment {
  return {
    tableId: normalizeEmptyId(guest?.tableId),
    tableNumber: normalizeTableNumber(guest?.tableNumber),
    tableName: normalizeTableName(guest?.tableName),
  };
}

export function seatingAssignmentFromTable(table: SeatingTableLike | null | undefined): SeatingAssignment {
  return {
    tableId: normalizeEmptyId(table?.id ?? table?._id),
    tableNumber:
      normalizeTableNumber(table?.tableNumber) ??
      normalizeTableNumber(table?.name),
    tableName: normalizeTableName(table?.name),
  };
}

export function emptySeatingAssignment(): SeatingAssignment {
  return {
    tableId: null,
    tableNumber: null,
    tableName: "",
  };
}

export function seatingAssignmentsEqual(
  a: SeatingAssignment,
  b: SeatingAssignment
): boolean {
  return (
    a.tableId === b.tableId &&
    a.tableNumber === b.tableNumber &&
    a.tableName === b.tableName
  );
}

export function diffSeatingAssignment(
  current: SeatingAssignment,
  next: SeatingAssignment
): string[] {
  return SEATING_ASSIGNMENT_FIELDS.filter((field) => current[field] !== next[field]);
}

export function guestIdFromValue(value: unknown): string | null {
  if (value && typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown; guestId?: unknown };
    return normalizeEmptyId(obj.guestId ?? obj._id ?? obj.id);
  }
  return normalizeEmptyId(value);
}

export function buildDesiredSeatingByGuestId(
  tables: SeatingTableLike[] | null | undefined
): Map<string, SeatingAssignment> {
  const desired = new Map<string, SeatingAssignment>();

  for (const table of tables || []) {
    const assignment = seatingAssignmentFromTable(table);
    const seated = Array.isArray(table?.seatedGuests) ? table.seatedGuests : [];

    for (const seatedGuest of seated) {
      const guestId = guestIdFromValue(seatedGuest);
      if (!guestId) continue;
      desired.set(guestId, assignment);
    }
  }

  return desired;
}

export function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null && b == null) return true;

  if (typeof a === "string" || typeof b === "string") {
    const left = normalizeEmptyId(a);
    const right = normalizeEmptyId(b);
    if (left === null && right === null) {
      return normalizeTableName(a) === normalizeTableName(b);
    }
    return left === right;
  }

  if (typeof a === "number" || typeof b === "number") {
    return normalizeTableNumber(a) === normalizeTableNumber(b);
  }

  if (typeof a === "object" && typeof b === "object") {
    return String(a) === String(b);
  }

  return false;
}

export function getChangedFields(
  current: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
  keys: string[]
): string[] {
  return keys.filter((key) => !looseEqual(current?.[key], next?.[key]));
}

export function coalesceLatestByGuestId<T extends { guestId: string }>(
  events: T[]
): T[] {
  const latest = new Map<string, T>();
  for (const event of events) {
    const guestId = String(event?.guestId || "").trim();
    if (!guestId) continue;
    latest.set(guestId, event);
  }
  return Array.from(latest.values());
}

function logGuestWrite(payload: Record<string, unknown>) {
  console.info("[invitationGuestWrite]", payload);
}

export function instrumentGuestWrite(attempt: GuestWriteAttempt) {
  const recentAttempts = recordGuestWriteAttempt(attempt.guestId);
  const payload = {
    ...attempt,
    recentAttempts,
  };

  if (!attempt.skipped && recentAttempts >= HOT_GUEST_WARN_THRESHOLD) {
    console.warn("[invitationGuestWrite:hot]", payload);
  }

  return payload;
}

export function planInvitationGuestSeatingWrites(input: {
  guests: InvitationGuestSeatingSnapshot[] | null | undefined;
  tables?: SeatingTableLike[] | null;
  desiredByGuestId?: Map<string, SeatingAssignment>;
  source: string;
  eventId?: string | null;
  invitationId?: string | null;
  instrument?: boolean;
}): SeatingGuestWritePlan {
  const desired =
    input.desiredByGuestId || buildDesiredSeatingByGuestId(input.tables);
  const writes: PlannedSeatingGuestWrite[] = [];
  const attempts: GuestWriteAttempt[] = [];
  let skippedUnchanged = 0;
  let skippedMissingId = 0;
  let maxRecentAttempts = 0;

  for (const guest of input.guests || []) {
    const guestId = guestIdFromValue(guest);

    if (!guestId) {
      skippedMissingId += 1;
      continue;
    }

    const previous = seatingAssignmentFromGuest(guest);
    const next = desired.get(guestId) || emptySeatingAssignment();
    const changedFields = diffSeatingAssignment(previous, next);
    const valuesChanged = changedFields.length > 0;

    const attempt: GuestWriteAttempt = {
      source: input.source,
      guestId,
      eventId: input.eventId || null,
      invitationId: input.invitationId || null,
      fieldsAttempted: [...SEATING_ASSIGNMENT_FIELDS],
      changedFields,
      valuesChanged,
      skipped: !valuesChanged,
      skipReason: valuesChanged ? undefined : "unchanged",
      recentAttempts: 0,
    };

    if (input.instrument !== false) {
      const logged = instrumentGuestWrite(attempt);
      attempt.recentAttempts = logged.recentAttempts;
      maxRecentAttempts = Math.max(maxRecentAttempts, logged.recentAttempts);
    }

    attempts.push(attempt);

    if (!valuesChanged) {
      skippedUnchanged += 1;
      continue;
    }

    writes.push({
      guestId,
      fields: next,
      previous,
      changedFields,
    });
  }

  const plan: SeatingGuestWritePlan = {
    source: input.source,
    eventId: input.eventId || null,
    invitationId: input.invitationId || null,
    guestsConsidered: (input.guests || []).length,
    writes,
    skippedUnchanged,
    skippedMissingId,
    attempts,
    maxRecentAttempts,
  };

  if (input.instrument !== false) {
    logSeatingGuestWritePlan(plan);
  }

  return plan;
}

export function logSeatingGuestWritePlan(plan: SeatingGuestWritePlan) {
  const sampleWrites = plan.writes.slice(0, 8).map((write) => ({
    guestId: write.guestId,
    changedFields: write.changedFields,
    previous: write.previous,
    next: write.fields,
  }));

  logGuestWrite({
    source: plan.source,
    eventId: plan.eventId || null,
    invitationId: plan.invitationId || null,
    guestsConsidered: plan.guestsConsidered,
    writes: plan.writes.length,
    skippedUnchanged: plan.skippedUnchanged,
    skippedMissingId: plan.skippedMissingId,
    maxRecentAttempts: plan.maxRecentAttempts,
    sampleWrites,
  });
}

export function seatingWritesTouchIndexedFields(
  writes: PlannedSeatingGuestWrite[]
): string[] {
  const touched = new Set<string>();

  for (const write of writes) {
    for (const field of Object.keys(write.fields)) {
      if (
        (INVITATION_GUEST_INDEXED_FIELDS as readonly string[]).includes(field)
      ) {
        touched.add(field);
      }
    }
  }

  return Array.from(touched);
}

export function countLegacySeatingGuestDocumentWrites(input: {
  guestCount: number;
  saveCount: number;
}): number {
  return Math.max(0, input.guestCount) * Math.max(0, input.saveCount);
}

export function simulateRepeatedSeatingSaves(input: {
  guests: InvitationGuestSeatingSnapshot[];
  tables: SeatingTableLike[];
  saveCount: number;
  source?: string;
}): {
  totalWrites: number;
  writesPerSave: number[];
  guestsAfter: InvitationGuestSeatingSnapshot[];
} {
  let guests = input.guests.map((guest) => ({ ...guest }));
  const writesPerSave: number[] = [];

  for (let i = 0; i < input.saveCount; i += 1) {
    const plan = planInvitationGuestSeatingWrites({
      guests,
      tables: input.tables,
      source: input.source || "test.seating.save",
      instrument: false,
    });

    writesPerSave.push(plan.writes.length);

    guests = guests.map((guest) => {
      const guestId = guestIdFromValue(guest);
      const write = plan.writes.find((item) => item.guestId === guestId);
      if (!write) return guest;
      return {
        ...guest,
        tableId: write.fields.tableId,
        tableNumber: write.fields.tableNumber,
        tableName: write.fields.tableName,
      };
    });
  }

  return {
    totalWrites: writesPerSave.reduce((sum, n) => sum + n, 0),
    writesPerSave,
    guestsAfter: guests,
  };
}

export type SingleGuestWritePlan = {
  source: string;
  guestId: string;
  eventId?: string | null;
  invitationId?: string | null;
  fieldsAttempted: string[];
  changedFields: string[];
  shouldWrite: boolean;
  next: Record<string, unknown>;
};

export function planSingleGuestWrite(input: {
  source: string;
  guestId: string;
  eventId?: string | null;
  invitationId?: string | null;
  current: Record<string, unknown>;
  next: Record<string, unknown>;
  keys: string[];
}): SingleGuestWritePlan {
  const changedFields = getChangedFields(input.current, input.next, input.keys);
  const shouldWrite = changedFields.length > 0;

  const attempt = instrumentGuestWrite({
    source: input.source,
    guestId: input.guestId,
    eventId: input.eventId || null,
    invitationId: input.invitationId || null,
    fieldsAttempted: input.keys,
    changedFields,
    valuesChanged: shouldWrite,
    skipped: !shouldWrite,
    skipReason: shouldWrite ? undefined : "unchanged",
    recentAttempts: 0,
  });

  if (shouldWrite || changedFields.length === 0) {
    logGuestWrite({
      source: input.source,
      guestId: input.guestId,
      eventId: input.eventId || null,
      invitationId: input.invitationId || null,
      fieldsAttempted: input.keys,
      changedFields,
      valuesChanged: shouldWrite,
      skipped: !shouldWrite,
      recentAttempts: attempt.recentAttempts,
    });
  }

  const next: Record<string, unknown> = {};
  for (const key of changedFields) {
    next[key] = input.next[key];
  }

  return {
    source: input.source,
    guestId: input.guestId,
    eventId: input.eventId || null,
    invitationId: input.invitationId || null,
    fieldsAttempted: input.keys,
    changedFields,
    shouldWrite,
    next,
  };
}

export function applyCoalescedGuestWrites<T extends { guestId: string }>(input: {
  source: string;
  events: T[];
  getCurrent: (guestId: string) => Record<string, unknown> | null;
  getNext: (event: T) => Record<string, unknown>;
  keys: string[];
}): { writes: SingleGuestWritePlan[]; skipped: number } {
  const coalesced = coalesceLatestByGuestId(input.events);
  const writes: SingleGuestWritePlan[] = [];
  let skipped = 0;

  for (const event of coalesced) {
    const current = input.getCurrent(event.guestId);
    if (!current) {
      skipped += 1;
      continue;
    }

    const plan = planSingleGuestWrite({
      source: input.source,
      guestId: event.guestId,
      current,
      next: input.getNext(event),
      keys: input.keys,
    });

    if (plan.shouldWrite) writes.push(plan);
    else skipped += 1;
  }

  return { writes, skipped };
}
