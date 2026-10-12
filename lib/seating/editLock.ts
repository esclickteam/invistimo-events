/**
 * Seating-map edit lock.
 *
 * One active editor per event, identified by a screen instance (a tab or
 * device), not only by user. The server is the authority for expiry:
 * heartbeats keep a disconnected client from holding the lock, and they do
 * not reset the inactivity clock.
 */

export const SEATING_INACTIVITY_MS = 5 * 60 * 1000;
export const SEATING_INACTIVITY_WARNING_MS = 4 * 60 * 1000;
export const SEATING_HEARTBEAT_TTL_MS = 75 * 1000;

export const LAYOUT_TABLE_FIELDS = [
  "x",
  "y",
  "rotation",
  "type",
  "width",
  "height",
  "radius",
  "seats",
  "capacity",
  "name",
  "number",
  "color",
  "locked",
  "reserved",
  "reserveLabel",
  "group",
] as const;

export type SaveScope = "layout" | "full";

export type LockRecord = {
  lockId: string;
  generation: number;
  screenInstanceId: string;
  userId: string;
  acquiredAt: number;
  lastHeartbeatAt: number;
  lastUserActivityAt: number;
};

export type LockDocument = {
  mapVersion: number;
  lockGeneration: number;
  editLock: LockRecord | null;
};

export type WriteCredentials = {
  lockId: string;
  generation: number;
  screenInstanceId: string;
  baseMapVersion: number;
};

export type LockFailureCode =
  | "LOCK_REQUIRED"
  | "LOCK_NOT_HELD"
  | "LOCK_EXPIRED"
  | "STALE_VERSION"
  | "LOCK_HELD_BY_OTHER"
  | "TRANSFER_NOT_CONFIRMED";

export type LockFailure = {
  ok: false;
  code: LockFailureCode;
  message: string;
};

export type SeatingChange = {
  kind: "table-layout" | "table-added" | "table-removed" | "assignment";
  tableId?: string;
  guestId?: string;
  field?: string;
  before: unknown;
  after: unknown;
};

const CLOSED_MESSAGE =
  "העריכה נסגרה אוטומטית כדי להגן על סידורי ההושבה שלך. כדי להמשיך, יש לטעון מחדש את מפת ההושבה המעודכנת.";

export function seatingEditClosedMessage() {
  return CLOSED_MESSAGE;
}

export function emptyLockDocument(): LockDocument {
  return {
    mapVersion: 0,
    lockGeneration: 0,
    editLock: null,
  };
}

export function normalizeMapVersion(value: unknown) {
  const version = Number(value);
  return Number.isFinite(version) && version > 0 ? Math.floor(version) : 0;
}

function cloneLock(lock: LockRecord): LockRecord {
  return { ...lock };
}

function cloneDoc(doc: LockDocument): LockDocument {
  return {
    mapVersion: normalizeMapVersion(doc.mapVersion),
    lockGeneration: normalizeMapVersion(doc.lockGeneration),
    editLock: doc.editLock ? cloneLock(doc.editLock) : null,
  };
}

export function heartbeatAge(lock: LockRecord, now: number) {
  return Math.max(0, now - lock.lastHeartbeatAt);
}

export function inactivityAge(lock: LockRecord, now: number) {
  return Math.max(0, now - lock.lastUserActivityAt);
}

export function lockExpiryReason(lock: LockRecord | null, now: number) {
  if (!lock) return "missing" as const;
  if (inactivityAge(lock, now) >= SEATING_INACTIVITY_MS) return "inactivity" as const;
  if (heartbeatAge(lock, now) >= SEATING_HEARTBEAT_TTL_MS) return "heartbeat" as const;
  return null;
}

export function isLockActive(lock: LockRecord | null, now: number) {
  return Boolean(lock) && lockExpiryReason(lock, now) === null;
}

export function shouldWarnInactivity(lock: LockRecord | null, now: number) {
  if (!lock || !isLockActive(lock, now)) return false;
  return inactivityAge(lock, now) >= SEATING_INACTIVITY_WARNING_MS;
}

export function expireLock(doc: LockDocument, now: number): {
  doc: LockDocument;
  expired: boolean;
  reason: "inactivity" | "heartbeat" | null;
} {
  const next = cloneDoc(doc);
  const reason = lockExpiryReason(next.editLock, now);
  if (reason === "inactivity" || reason === "heartbeat") {
    next.editLock = null;
    return { doc: next, expired: true, reason };
  }
  return { doc: next, expired: false, reason: null };
}

function failure(code: LockFailureCode, message: string): LockFailure {
  return { ok: false, code, message };
}

function credentialsMatch(lock: LockRecord, credentials: WriteCredentials) {
  return (
    lock.lockId === credentials.lockId &&
    lock.generation === credentials.generation &&
    lock.screenInstanceId === credentials.screenInstanceId
  );
}

export function acquireLock(
  doc: LockDocument,
  input: {
    now: number;
    userId: string;
    screenInstanceId: string;
    lockId: string;
    recordActivity?: boolean;
  }
):
  | { ok: true; doc: LockDocument; resumed: boolean }
  | LockFailure & { doc: LockDocument } {
  const expired = expireLock(doc, input.now);
  const current = expired.doc.editLock;

  if (
    current &&
    current.screenInstanceId === input.screenInstanceId &&
    current.userId === input.userId
  ) {
    const resumed: LockDocument = {
      ...expired.doc,
      editLock: {
        ...current,
        lastHeartbeatAt: input.now,
        lastUserActivityAt: input.recordActivity
          ? input.now
          : current.lastUserActivityAt,
      },
    };
    return { ok: true, doc: resumed, resumed: true };
  }

  if (current && isLockActive(current, input.now)) {
    return {
      ...failure(
        "LOCK_HELD_BY_OTHER",
        "העריכה פתוחה במסך אחר. המסך הזה זמין לצפייה בלבד."
      ),
      doc: expired.doc,
    };
  }

  const generation = expired.doc.lockGeneration + 1;
  const lock: LockRecord = {
    lockId: input.lockId,
    generation,
    screenInstanceId: input.screenInstanceId,
    userId: input.userId,
    acquiredAt: input.now,
    lastHeartbeatAt: input.now,
    lastUserActivityAt: input.now,
  };

  return {
    ok: true,
    resumed: false,
    doc: {
      ...expired.doc,
      lockGeneration: generation,
      editLock: lock,
    },
  };
}

export function touchHeartbeat(
  doc: LockDocument,
  credentials: WriteCredentials,
  now: number
): { ok: true; doc: LockDocument } | LockFailure & { doc: LockDocument } {
  const expired = expireLock(doc, now);
  const lock = expired.doc.editLock;
  if (!lock || !credentialsMatch(lock, credentials)) {
    return {
      ...failure(
        expired.expired ? "LOCK_EXPIRED" : "LOCK_NOT_HELD",
        "נעילת העריכה אינה שייכת למסך הזה."
      ),
      doc: expired.doc,
    };
  }

  return {
    ok: true,
    doc: {
      ...expired.doc,
      editLock: {
        ...lock,
        lastHeartbeatAt: now,
      },
    },
  };
}

export function touchActivity(
  doc: LockDocument,
  credentials: WriteCredentials,
  now: number
): { ok: true; doc: LockDocument } | LockFailure & { doc: LockDocument } {
  const heartbeat = touchHeartbeat(doc, credentials, now);
  if (!heartbeat.ok || !heartbeat.doc.editLock) return heartbeat;
  return {
    ok: true,
    doc: {
      ...heartbeat.doc,
      editLock: {
        ...heartbeat.doc.editLock,
        lastUserActivityAt: now,
        lastHeartbeatAt: now,
      },
    },
  };
}

export function releaseLock(
  doc: LockDocument,
  credentials: WriteCredentials,
  now: number
): { ok: true; doc: LockDocument; released: boolean } {
  const current = doc.editLock;
  if (!current || !credentialsMatch(current, credentials)) {
    return { ok: true, doc: expireLock(doc, now).doc, released: false };
  }
  return {
    ok: true,
    released: true,
    doc: {
      ...cloneDoc(doc),
      editLock: null,
    },
  };
}

export function transferLock(
  doc: LockDocument,
  input: {
    now: number;
    userId: string;
    screenInstanceId: string;
    lockId: string;
    confirmed: boolean;
  }
):
  | { ok: true; doc: LockDocument; transferred: boolean }
  | LockFailure & { doc: LockDocument } {
  if (!input.confirmed) {
    return {
      ...failure("TRANSFER_NOT_CONFIRMED", "העברת עריכה דורשת אישור מפורש."),
      doc: cloneDoc(doc),
    };
  }

  const expired = expireLock(doc, input.now);
  if (!expired.doc.editLock) {
    const acquired = acquireLock(expired.doc, input);
    if (!acquired.ok) return acquired;
    return { ok: true, doc: acquired.doc, transferred: false };
  }

  if (expired.doc.editLock.screenInstanceId === input.screenInstanceId) {
    return { ok: true, doc: expired.doc, transferred: false };
  }

  const generation = expired.doc.lockGeneration + 1;
  return {
    ok: true,
    transferred: true,
    doc: {
      ...expired.doc,
      lockGeneration: generation,
      editLock: {
        lockId: input.lockId,
        generation,
        screenInstanceId: input.screenInstanceId,
        userId: input.userId,
        acquiredAt: input.now,
        lastHeartbeatAt: input.now,
        lastUserActivityAt: input.now,
      },
    },
  };
}

export function authorizeWrite(
  doc: LockDocument,
  credentials: WriteCredentials | null | undefined,
  now: number
): { ok: true; doc: LockDocument } | LockFailure & { doc: LockDocument } {
  if (
    !credentials?.lockId ||
    !credentials.screenInstanceId ||
    !Number.isFinite(credentials.generation)
  ) {
    return {
      ...failure("LOCK_REQUIRED", "שמירת הושבה דורשת נעילת עריכה פעילה."),
      doc: cloneDoc(doc),
    };
  }

  const expired = expireLock(doc, now);
  const lock = expired.doc.editLock;

  if (!lock || !credentialsMatch(lock, credentials)) {
    return {
      ...failure(
        expired.expired || !doc.editLock ? "LOCK_EXPIRED" : "LOCK_NOT_HELD",
        "נעילת העריכה אינה בתוקף. המפה לא נשמרה."
      ),
      doc: expired.doc,
    };
  }

  if (normalizeMapVersion(credentials.baseMapVersion) !== expired.doc.mapVersion) {
    return {
      ...failure(
        "STALE_VERSION",
        "המפה השתנתה מאז הטעינה. השמירה נדחתה כדי לא לדרוס שיבוצים."
      ),
      doc: expired.doc,
    };
  }

  return { ok: true, doc: expired.doc };
}

export function guestAssignmentKey(seat: { guestId?: unknown }) {
  return String(seat?.guestId ?? "").trim();
}

export function assignmentMap(tables: Array<{ id?: unknown; seatedGuests?: any[] }> | null | undefined) {
  const map = new Map<string, string>();
  for (const table of tables || []) {
    const tableId = String(table?.id ?? "").trim();
    for (const seat of table?.seatedGuests || []) {
      const guestId = guestAssignmentKey(seat);
      if (!guestId) continue;
      map.set(guestId, tableId);
    }
  }
  return map;
}

function layoutValue(value: unknown) {
  if (typeof value === "number") return Math.round(value * 1000) / 1000;
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? null;
}

export function diffSeatingTables(
  previousTables: any[] | null | undefined,
  nextTables: any[] | null | undefined
): SeatingChange[] {
  const changes: SeatingChange[] = [];
  const previousById = new Map(
    (previousTables || []).map((table) => [String(table?.id ?? ""), table])
  );
  const nextById = new Map(
    (nextTables || []).map((table) => [String(table?.id ?? ""), table])
  );

  for (const [id, next] of nextById) {
    if (!id) continue;
    const previous = previousById.get(id);
    if (!previous) {
      changes.push({
        kind: "table-added",
        tableId: id,
        before: null,
        after: { name: next?.name ?? "", seats: next?.seats ?? null },
      });
      continue;
    }

    for (const field of LAYOUT_TABLE_FIELDS) {
      const before = layoutValue(previous?.[field]);
      const after = layoutValue(next?.[field]);
      if (before !== after) {
        changes.push({
          kind: "table-layout",
          tableId: id,
          field,
          before: previous?.[field] ?? null,
          after: next?.[field] ?? null,
        });
      }
    }
  }

  for (const [id, previous] of previousById) {
    if (!id || nextById.has(id)) continue;
    changes.push({
      kind: "table-removed",
      tableId: id,
      before: { name: previous?.name ?? "", seats: previous?.seats ?? null },
      after: null,
    });
  }

  const previousAssignments = assignmentMap(previousTables);
  const nextAssignments = assignmentMap(nextTables);
  const guestIds = new Set([
    ...previousAssignments.keys(),
    ...nextAssignments.keys(),
  ]);

  for (const guestId of guestIds) {
    const before = previousAssignments.get(guestId) ?? null;
    const after = nextAssignments.get(guestId) ?? null;
    if (before !== after) {
      changes.push({
        kind: "assignment",
        guestId,
        before,
        after,
      });
    }
  }

  return changes;
}

export function hasAssignmentChanges(changes: SeatingChange[]) {
  return changes.some(
    (change) => change.kind === "assignment" || change.kind === "table-removed"
  );
}

export function mergeLayoutPreservingAssignments(
  previousTables: any[] | null | undefined,
  nextTables: any[] | null | undefined
) {
  const previousById = new Map(
    (previousTables || []).map((table) => [String(table?.id ?? ""), table])
  );

  const merged = (nextTables || []).map((table) => {
    const id = String(table?.id ?? "");
    const previous = previousById.get(id);
    if (!previous) {
      return {
        ...table,
        seatedGuests: [],
      };
    }

    const layout: Record<string, unknown> = {};
    for (const field of LAYOUT_TABLE_FIELDS) {
      if (table?.[field] !== undefined) layout[field] = table[field];
    }

    return {
      ...previous,
      ...layout,
      id: previous.id ?? table.id,
      seatedGuests: Array.isArray(previous.seatedGuests)
        ? previous.seatedGuests
        : [],
    };
  });

  const nextIds = new Set(merged.map((table) => String(table?.id ?? "")));
  for (const previous of previousTables || []) {
    const id = String(previous?.id ?? "");
    if (!id || nextIds.has(id)) continue;
    merged.push(previous);
  }

  return merged;
}

/**
 * A layout save never replaces guest assignments.
 * A full save may, but only when the caller explicitly edited assignments
 * and the version check has already passed.
 */
export function resolvePersistedTables(input: {
  previousTables: any[] | null | undefined;
  nextTables: any[] | null | undefined;
  requestedScope: SaveScope | null | undefined;
}) {
  const changes = diffSeatingTables(input.previousTables, input.nextTables);
  const assignmentsChanged = hasAssignmentChanges(changes);
  const scope: SaveScope =
    input.requestedScope === "full" && assignmentsChanged ? "full" : "layout";

  return {
    scope,
    changes,
    tables:
      scope === "layout"
        ? mergeLayoutPreservingAssignments(input.previousTables, input.nextTables)
        : input.nextTables || [],
    syncGuestAssignments: scope === "full",
  };
}

export function applyAuthorizedSave(
  doc: LockDocument,
  input: {
    now: number;
    credentials: WriteCredentials | null | undefined;
    previousTables: any[];
    nextTables: any[];
    requestedScope: SaveScope | null | undefined;
  }
):
  | {
      ok: true;
      doc: LockDocument;
      tables: any[];
      scope: SaveScope;
      changes: SeatingChange[];
      syncGuestAssignments: boolean;
    }
  | LockFailure & { doc: LockDocument } {
  const auth = authorizeWrite(doc, input.credentials, input.now);
  if (!auth.ok) return auth;

  const resolved = resolvePersistedTables({
    previousTables: input.previousTables,
    nextTables: input.nextTables,
    requestedScope: input.requestedScope,
  });

  return {
    ok: true,
    scope: resolved.scope,
    changes: resolved.changes,
    tables: resolved.tables,
    syncGuestAssignments: resolved.syncGuestAssignments,
    doc: {
      ...auth.doc,
      mapVersion: auth.doc.mapVersion + 1,
    },
  };
}

export function decideReconnectSave(input: {
  versionAtAttempt: number;
  versionNow: number;
  lockStillHeld: boolean;
}) {
  if (!input.lockStillHeld) return "block" as const;
  if (normalizeMapVersion(input.versionNow) !== normalizeMapVersion(input.versionAtAttempt)) {
    return "accept-server" as const;
  }
  return "retry-current" as const;
}

export function planIdleExpiry(input: {
  idleMs: number;
  saveInFlight: boolean;
  pendingSave: boolean;
  lockValidOnServer: boolean;
}) {
  const showWarning =
    input.idleMs >= SEATING_INACTIVITY_WARNING_MS &&
    input.idleMs < SEATING_INACTIVITY_MS;
  const shouldClose = input.idleMs >= SEATING_INACTIVITY_MS;
  return {
    showWarning,
    shouldClose,
    waitForInFlight: shouldClose && input.saveInFlight,
    flushPending: shouldClose && input.pendingSave && input.lockValidOnServer && !input.saveInFlight,
    reportUnsaved:
      shouldClose && input.pendingSave && !input.lockValidOnServer && !input.saveInFlight,
  };
}

export function resolveScreenInstance(input: {
  storedId: string | null;
  peerClaimsSameId: boolean;
  nextId: string;
}) {
  const storedId = String(input.storedId || "").trim();
  if (!storedId || input.peerClaimsSameId) {
    return {
      screenInstanceId: input.nextId,
      discardStoredLock: true,
    };
  }
  return {
    screenInstanceId: storedId,
    discardStoredLock: false,
  };
}

export function versionMatchesFilter(storedVersion: unknown, expected: number) {
  return normalizeMapVersion(storedVersion) === normalizeMapVersion(expected);
}

export function markMapVersionBump(doc: {
  mapVersion?: number;
  markModified?: (path: string) => void;
} | null | undefined) {
  if (!doc) return;
  doc.mapVersion = normalizeMapVersion(doc.mapVersion) + 1;
  doc.markModified?.("mapVersion");
}

export function capAuditChanges(changes: SeatingChange[], limit = 300) {
  if (changes.length <= limit) {
    return { changes, truncated: false, total: changes.length };
  }
  return {
    changes: changes.slice(0, limit),
    truncated: true,
    total: changes.length,
  };
}
