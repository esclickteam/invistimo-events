import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import SeatingEditAudit from "@/models/SeatingEditAudit";
import {
  SEATING_HEARTBEAT_TTL_MS,
  SEATING_INACTIVITY_MS,
  acquireLock,
  applyAuthorizedSave,
  authorizeWrite,
  capAuditChanges,
  emptyLockDocument,
  expireLock,
  normalizeMapVersion,
  releaseLock,
  seatingEditClosedMessage,
  shouldWarnInactivity,
  touchActivity,
  touchHeartbeat,
  transferLock,
  type LockDocument,
  type LockFailure,
  type SaveScope,
  type SeatingChange,
  type WriteCredentials,
} from "@/lib/seating/editLock";
import { eventIdQuery, toObjectId } from "@/lib/seating/seatingAccess";

export type SeatingLockMode = "edit" | "view" | "closed" | "stale";

export type SeatingLockResponse = {
  success: boolean;
  mode: SeatingLockMode;
  code?: string;
  message?: string;
  lockId?: string;
  generation?: number;
  mapVersion: number;
  screenInstanceId?: string;
  idleMs?: number;
  warning?: boolean;
  resumed?: boolean;
  transferred?: boolean;
};

type LoadedSeating = {
  state: LockDocument;
  tables: any[];
  existed: boolean;
};

function dateMs(value: unknown) {
  if (!value) return 0;
  const ms = new Date(value as string | number | Date).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function toLockDocument(doc: any): LockDocument {
  const raw = doc?.editLock;
  const editLock = raw?.lockId
    ? {
        lockId: String(raw.lockId),
        generation: Number(raw.generation || 0),
        screenInstanceId: String(raw.screenInstanceId || ""),
        userId: String(raw.userId || ""),
        acquiredAt: dateMs(raw.acquiredAt),
        lastHeartbeatAt: dateMs(raw.lastHeartbeatAt),
        lastUserActivityAt: dateMs(raw.lastUserActivityAt),
      }
    : null;

  return {
    mapVersion: normalizeMapVersion(doc?.mapVersion),
    lockGeneration: normalizeMapVersion(doc?.lockGeneration),
    editLock,
  };
}

function lockToMongo(lock: NonNullable<LockDocument["editLock"]>) {
  return {
    lockId: lock.lockId,
    generation: lock.generation,
    screenInstanceId: lock.screenInstanceId,
    userId: lock.userId,
    acquiredAt: new Date(lock.acquiredAt),
    lastHeartbeatAt: new Date(lock.lastHeartbeatAt),
    lastUserActivityAt: new Date(lock.lastUserActivityAt),
  };
}

function versionClause(field: string, expected: number) {
  if (normalizeMapVersion(expected) === 0) {
    return {
      $or: [{ [field]: 0 }, { [field]: { $exists: false } }, { [field]: null }],
    };
  }
  return { [field]: expected };
}

function lockPresenceClause(state: LockDocument) {
  if (!state.editLock) {
    return {
      $or: [{ editLock: null }, { editLock: { $exists: false } }],
    };
  }
  return {
    "editLock.lockId": state.editLock.lockId,
    "editLock.generation": state.editLock.generation,
    "editLock.screenInstanceId": state.editLock.screenInstanceId,
  };
}

function transitionFilter(eventId: string, before: LockDocument) {
  return {
    $and: [
      eventIdQuery(eventId),
      versionClause("mapVersion", before.mapVersion),
      versionClause("lockGeneration", before.lockGeneration),
      lockPresenceClause(before),
    ],
  };
}

function livenessFilter(now: number) {
  return {
    "editLock.lastHeartbeatAt": {
      $gt: new Date(now - SEATING_HEARTBEAT_TTL_MS),
    },
    "editLock.lastUserActivityAt": {
      $gt: new Date(now - SEATING_INACTIVITY_MS),
    },
  };
}

async function loadSeating(eventId: string): Promise<LoadedSeating> {
  await dbConnect();
  const doc = await SeatingTable.findOne(eventIdQuery(eventId)).lean();
  if (!doc) {
    return { state: emptyLockDocument(), tables: [], existed: false };
  }
  return {
    state: toLockDocument(doc),
    tables: Array.isArray((doc as any).tables) ? (doc as any).tables : [],
    existed: true,
  };
}

async function writeAudit(entry: {
  eventId: string;
  userId?: string;
  screenInstanceId?: string;
  action: string;
  editOpenedAt?: number | null;
  lastActivityAt?: number | null;
  lockId?: string;
  generation?: number | null;
  mapVersion?: number | null;
  rejectReason?: string;
  changes?: SeatingChange[];
}) {
  try {
    const capped = capAuditChanges(entry.changes || []);
    await SeatingEditAudit.create({
      eventId: entry.eventId,
      userId: entry.userId || "",
      screenInstanceId: entry.screenInstanceId || "",
      action: entry.action,
      editOpenedAt: entry.editOpenedAt ? new Date(entry.editOpenedAt) : null,
      lastActivityAt: entry.lastActivityAt ? new Date(entry.lastActivityAt) : null,
      lockId: entry.lockId || "",
      generation: entry.generation ?? null,
      mapVersion: entry.mapVersion ?? null,
      rejectReason: entry.rejectReason || "",
      changes: capped.changes,
      changesTruncated: capped.truncated,
      changeCount: capped.total,
    });
  } catch (error) {
    console.error("seating edit audit failed", error);
  }
}

async function persistLock(
  eventId: string,
  before: LockDocument,
  after: LockDocument
) {
  return SeatingTable.findOneAndUpdate(
    transitionFilter(eventId, before),
    {
      $set: {
        lockGeneration: after.lockGeneration,
        editLock: after.editLock ? lockToMongo(after.editLock) : null,
      },
    },
    { new: true }
  ).lean();
}

function publicLock(state: LockDocument, mode: SeatingLockMode, extra: Partial<SeatingLockResponse> = {}): SeatingLockResponse {
  const lock = mode === "edit" ? state.editLock : null;
  const now = Date.now();
  const idleMs = state.editLock ? Math.max(0, now - state.editLock.lastUserActivityAt) : undefined;
  return {
    success: mode === "edit" || mode === "view" || mode === "stale",
    mode,
    mapVersion: state.mapVersion,
    lockId: lock?.lockId,
    generation: lock?.generation,
    screenInstanceId: lock?.screenInstanceId,
    idleMs,
    warning: shouldWarnInactivity(state.editLock, now),
    ...extra,
  };
}

function failureResponse(failure: LockFailure, state: LockDocument): SeatingLockResponse {
  const mode: SeatingLockMode =
    failure.code === "LOCK_HELD_BY_OTHER"
      ? "view"
      : failure.code === "STALE_VERSION"
        ? "stale"
        : "closed";
  return {
    ...publicLock(state, mode, {
      success: mode === "view" || mode === "stale",
      code: failure.code,
      message:
        mode === "closed" ? seatingEditClosedMessage() : failure.message,
    }),
    mapVersion: state.mapVersion,
  };
}

async function ensureDocument(eventId: string) {
  const loaded = await loadSeating(eventId);
  if (loaded.existed) return loaded;
  const eventObjectId = toObjectId(eventId) || eventId;
  try {
    await SeatingTable.create({
      eventId: eventObjectId,
      tables: [],
      zones: [],
      mapVersion: 0,
      lockGeneration: 0,
      editLock: null,
    });
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
  }
  return loadSeating(eventId);
}

export function readSeatingWriteCredentials(body: any): WriteCredentials | null {
  const lockId = String(body?.editLockId || body?.lockId || "").trim();
  const screenInstanceId = String(body?.screenInstanceId || "").trim();
  const generation = Number(body?.lockGeneration ?? body?.generation);
  const baseMapVersion = Number(body?.baseMapVersion ?? body?.mapVersion);
  if (!lockId || !screenInstanceId || !Number.isFinite(generation)) return null;
  return {
    lockId,
    generation,
    screenInstanceId,
    baseMapVersion: Number.isFinite(baseMapVersion) ? baseMapVersion : -1,
  };
}

export async function runSeatingLockAction(input: {
  eventId: string;
  userId: string;
  action: "acquire" | "heartbeat" | "activity" | "release" | "transfer" | "revalidate";
  screenInstanceId: string;
  lockId?: string;
  generation?: number;
  baseMapVersion?: number;
  confirmed?: boolean;
  recordActivity?: boolean;
}): Promise<SeatingLockResponse> {
  const now = Date.now();
  const screenInstanceId = String(input.screenInstanceId || "").trim();
  if (!screenInstanceId) {
    return {
      success: false,
      mode: "closed",
      code: "LOCK_REQUIRED",
      message: "חסר מזהה מסך",
      mapVersion: 0,
    };
  }

  let loaded = await loadSeating(input.eventId);
  if (!loaded.existed && (input.action === "acquire" || input.action === "transfer")) {
    loaded = await ensureDocument(input.eventId);
  }

  const credentials: WriteCredentials | null =
    input.lockId && Number.isFinite(Number(input.generation))
      ? {
          lockId: String(input.lockId),
          generation: Number(input.generation),
          screenInstanceId,
          baseMapVersion: Number(input.baseMapVersion ?? loaded.state.mapVersion),
        }
      : null;

  const apply = async (
    before: LockDocument,
    after: LockDocument,
    auditAction: string
  ) => {
    const saved = await persistLock(input.eventId, before, after);
    if (!saved) {
      const latest = await loadSeating(input.eventId);
      return publicLock(latest.state, latest.state.editLock ? "view" : "closed", {
        success: false,
        code: "LOCK_NOT_HELD",
        message: "נעילת העריכה השתנתה. יש לטעון מחדש.",
        mapVersion: latest.state.mapVersion,
      });
    }
    const state = toLockDocument(saved);
    await writeAudit({
      eventId: input.eventId,
      userId: input.userId,
      screenInstanceId,
      action: auditAction,
      editOpenedAt: state.editLock?.acquiredAt,
      lastActivityAt: state.editLock?.lastUserActivityAt,
      lockId: state.editLock?.lockId || input.lockId,
      generation: state.editLock?.generation ?? null,
      mapVersion: state.mapVersion,
    });
    return publicLock(state, state.editLock?.screenInstanceId === screenInstanceId ? "edit" : "view");
  };

  if (input.action === "acquire" || input.action === "transfer") {
    let current = loaded;
    let lastResponse: SeatingLockResponse | null = null;
    const freshLockId = input.lockId || new mongoose.Types.ObjectId().toString();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result =
        input.action === "acquire"
          ? acquireLock(current.state, {
              now,
              userId: input.userId,
              screenInstanceId,
              lockId: freshLockId,
              recordActivity: input.recordActivity !== false,
            })
          : transferLock(current.state, {
              now,
              userId: input.userId,
              screenInstanceId,
              lockId: freshLockId,
              confirmed: input.confirmed === true,
            });

      if (!result.ok) {
        await writeAudit({
          eventId: input.eventId,
          userId: input.userId,
          screenInstanceId,
          action: input.action === "transfer" ? "transfer_rejected" : "lock_rejected",
          rejectReason: result.code,
          mapVersion: result.doc.mapVersion,
          lockId: result.doc.editLock?.lockId,
          generation: result.doc.editLock?.generation,
        });
        return failureResponse(result, result.doc);
      }

      const resumed = "resumed" in result ? result.resumed : false;
      const transferred = "transferred" in result ? result.transferred : false;
      const response = await apply(
        current.state,
        result.doc,
        transferred
          ? "lock_transferred"
          : resumed
            ? "lock_resumed"
            : "lock_acquired"
      );
      lastResponse = {
        ...response,
        resumed,
        transferred,
      };
      if (response.code !== "LOCK_NOT_HELD") return lastResponse;
      current = await loadSeating(input.eventId);
    }

    return (
      lastResponse || {
        success: false,
        mode: "view",
        code: "LOCK_HELD_BY_OTHER",
        message: "העריכה פתוחה במסך אחר.",
        mapVersion: current.state.mapVersion,
      }
    );
  }

  if (!credentials) {
    return failureResponse(
      {
        ok: false,
        code: "LOCK_REQUIRED",
        message: "חסרים פרטי נעילה",
      },
      loaded.state
    );
  }

  if (input.action === "heartbeat" || input.action === "activity" || input.action === "revalidate") {
    const touched =
      input.action === "activity"
        ? touchActivity(loaded.state, credentials, now)
        : touchHeartbeat(loaded.state, credentials, now);
    if (!touched.ok) {
      if (expireLock(loaded.state, now).expired) {
        await persistLock(input.eventId, loaded.state, touched.doc);
        await writeAudit({
          eventId: input.eventId,
          userId: input.userId,
          screenInstanceId,
          action: "lock_expired",
          editOpenedAt: loaded.state.editLock?.acquiredAt,
          lastActivityAt: loaded.state.editLock?.lastUserActivityAt,
          lockId: credentials.lockId,
          generation: credentials.generation,
          mapVersion: loaded.state.mapVersion,
          rejectReason: touched.code,
        });
      }
      return failureResponse(touched, touched.doc);
    }

    if (input.action === "revalidate") {
      const versionOk =
        normalizeMapVersion(credentials.baseMapVersion) === touched.doc.mapVersion;
      if (!versionOk) {
        await persistLock(input.eventId, loaded.state, touched.doc);
        return publicLock(touched.doc, "stale", {
          success: false,
          code: "STALE_VERSION",
          message: "המפה השתנתה. יש לטעון מחדש לפני שמירה.",
          lockId: touched.doc.editLock?.lockId,
          generation: touched.doc.editLock?.generation,
          screenInstanceId,
        });
      }
    }

    const saved = await persistLock(input.eventId, loaded.state, touched.doc);
    const state = saved ? toLockDocument(saved) : touched.doc;
    return publicLock(state, "edit", {
      lockId: state.editLock?.lockId,
      generation: state.editLock?.generation,
      screenInstanceId,
    });
  }

  const released = releaseLock(loaded.state, credentials, now);
  const response = await apply(loaded.state, released.doc, "lock_released");
  return { ...response, mode: "closed", success: true, message: seatingEditClosedMessage() };
}

export async function guardSeatingEditWrite(input: {
  eventId: string;
  credentials: WriteCredentials | null;
  now?: number;
}): Promise<
  | { ok: true; state: LockDocument; tables: any[] }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const now = input.now ?? Date.now();
  const loaded = await loadSeating(input.eventId);
  const auth = authorizeWrite(loaded.state, input.credentials, now);
  if (!auth.ok) {
    await writeAudit({
      eventId: input.eventId,
      userId: input.credentials?.screenInstanceId ? loaded.state.editLock?.userId : "",
      screenInstanceId: input.credentials?.screenInstanceId,
      action: "save_rejected",
      lockId: input.credentials?.lockId,
      generation: input.credentials?.generation ?? null,
      mapVersion: loaded.state.mapVersion,
      lastActivityAt: loaded.state.editLock?.lastUserActivityAt,
      editOpenedAt: loaded.state.editLock?.acquiredAt,
      rejectReason: auth.code,
    });
    const response = failureResponse(auth, auth.doc);
    return {
      ok: false,
      status: 409,
      body: {
        success: false,
        error: auth.code,
        message: response.message,
        mode: response.mode,
        mapVersion: loaded.state.mapVersion,
      },
    };
  }
  return { ok: true, state: auth.doc, tables: loaded.tables };
}

export async function commitGuardedSeatingUpdate(input: {
  eventId: string;
  userId: string;
  credentials: WriteCredentials | null;
  set: Record<string, unknown>;
  changes?: SeatingChange[];
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const gate = await guardSeatingEditWrite({
    eventId: input.eventId,
    credentials: input.credentials,
    now,
  });
  if (!gate.ok) return gate;
  if (!input.credentials) {
    return gate;
  }

  const updated = await SeatingTable.findOneAndUpdate(
    {
      $and: [
        eventIdQuery(input.eventId),
        versionClause("mapVersion", gate.state.mapVersion),
        {
          "editLock.lockId": input.credentials.lockId,
          "editLock.generation": input.credentials.generation,
          "editLock.screenInstanceId": input.credentials.screenInstanceId,
        },
        livenessFilter(now),
      ],
    },
    {
      $set: {
        ...input.set,
        updatedAt: new Date(),
      },
      $inc: { mapVersion: 1 },
    },
    { new: true }
  ).lean();

  if (!updated) {
    await writeAudit({
      eventId: input.eventId,
      userId: input.userId,
      screenInstanceId: input.credentials.screenInstanceId,
      action: "save_rejected",
      lockId: input.credentials.lockId,
      generation: input.credentials.generation,
      mapVersion: gate.state.mapVersion,
      rejectReason: "LOCK_EXPIRED",
    });
    return {
      ok: false as const,
      status: 409,
      body: {
        success: false,
        error: "LOCK_EXPIRED",
        message: seatingEditClosedMessage(),
        mapVersion: gate.state.mapVersion,
      },
    };
  }

  const state = toLockDocument(updated);
  await writeAudit({
    eventId: input.eventId,
    userId: input.userId,
    screenInstanceId: input.credentials.screenInstanceId,
    action: "save",
    editOpenedAt: state.editLock?.acquiredAt,
    lastActivityAt: state.editLock?.lastUserActivityAt,
    lockId: input.credentials.lockId,
    generation: input.credentials.generation,
    mapVersion: state.mapVersion,
    changes: input.changes,
  });

  return { ok: true as const, mapVersion: state.mapVersion, tables: (updated as any).tables || [] };
}

export async function commitSeatingSnapshot(input: {
  eventId: string;
  userId: string;
  credentials: WriteCredentials | null;
  requestedScope: SaveScope | null;
  nextTables: any[];
  zones: any[];
  background: unknown;
  canvasView: unknown;
  layoutChanged: boolean;
}) {
  const now = Date.now();
  const loaded = await loadSeating(input.eventId);
  const decided = applyAuthorizedSave(loaded.state, {
    now,
    credentials: input.credentials,
    previousTables: loaded.tables,
    nextTables: input.nextTables,
    requestedScope: input.requestedScope,
  });

  if (!decided.ok || !input.credentials) {
    const failure = decided.ok
      ? {
          ok: false as const,
          code: "LOCK_REQUIRED" as const,
          message: "שמירת הושבה דורשת נעילת עריכה פעילה.",
          doc: loaded.state,
        }
      : decided;
    await writeAudit({
      eventId: input.eventId,
      userId: input.userId,
      screenInstanceId: input.credentials?.screenInstanceId,
      action: "save_rejected",
      lockId: input.credentials?.lockId,
      generation: input.credentials?.generation ?? null,
      mapVersion: loaded.state.mapVersion,
      editOpenedAt: loaded.state.editLock?.acquiredAt,
      lastActivityAt: loaded.state.editLock?.lastUserActivityAt,
      rejectReason: failure.code,
      changes: decided.ok ? [] : [],
    });
    return {
      ok: false as const,
      status: 409,
      body: {
        success: false,
        error: failure.code,
        message: failure.message,
        mapVersion: loaded.state.mapVersion,
      },
    };
  }

  const updated = await SeatingTable.findOneAndUpdate(
    {
      $and: [
        eventIdQuery(input.eventId),
        versionClause("mapVersion", loaded.state.mapVersion),
        {
          "editLock.lockId": input.credentials.lockId,
          "editLock.generation": input.credentials.generation,
          "editLock.screenInstanceId": input.credentials.screenInstanceId,
        },
        livenessFilter(now),
      ],
    },
    {
      $set: {
        userId: input.userId,
        tables: decided.tables,
        zones: input.zones,
        background: input.background,
        canvasView: input.canvasView,
        ...(input.layoutChanged ? { layoutCustomizedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
      $inc: { mapVersion: 1 },
    },
    { new: true }
  ).lean();

  if (!updated) {
    await writeAudit({
      eventId: input.eventId,
      userId: input.userId,
      screenInstanceId: input.credentials.screenInstanceId,
      action: "save_rejected",
      lockId: input.credentials.lockId,
      generation: input.credentials.generation,
      mapVersion: loaded.state.mapVersion,
      rejectReason: "STALE_VERSION",
      changes: decided.changes,
    });
    return {
      ok: false as const,
      status: 409,
      body: {
        success: false,
        error: "STALE_VERSION",
        message: "המפה השתנתה או שהנעילה פגה. השמירה נדחתה בלי לשנות נתונים.",
        mapVersion: loaded.state.mapVersion,
      },
    };
  }

  const state = toLockDocument(updated);
  await writeAudit({
    eventId: input.eventId,
    userId: input.userId,
    screenInstanceId: input.credentials.screenInstanceId,
    action: "save",
    editOpenedAt: state.editLock?.acquiredAt,
    lastActivityAt: state.editLock?.lastUserActivityAt,
    lockId: input.credentials.lockId,
    generation: input.credentials.generation,
    mapVersion: state.mapVersion,
    changes: decided.changes,
  });

  return {
    ok: true as const,
    mapVersion: state.mapVersion,
    tables: decided.tables,
    syncGuestAssignments: decided.syncGuestAssignments,
    scope: decided.scope,
    changes: decided.changes,
    seatingId: String((updated as any)._id),
  };
}
