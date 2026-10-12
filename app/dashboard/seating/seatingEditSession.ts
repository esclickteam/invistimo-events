import {
  decideReconnectSave,
  diffSeatingTables,
  hasAssignmentChanges,
  resolveScreenInstance,
  type SaveScope,
} from "@/lib/seating/editLock";

export type SeatingEditMode = "edit" | "view" | "closed";

export type SeatingEditSession = {
  eventId: string;
  screenInstanceId: string;
  editLockId: string;
  lockGeneration: number;
  baseMapVersion: number;
  mode: SeatingEditMode;
  collaborative?: boolean;
};

export type SeatingSnapshot = {
  tables: any[];
  background: unknown;
  zones: unknown;
  canvasView: unknown;
};

const SCREEN_KEY = "invistimo.seating.screenInstanceId";

let session: SeatingEditSession | null = null;
let baselineJson = "";
let saveInFlight: Promise<unknown> | null = null;
let observedMapVersion = 0;

export function getSeatingEditSession() {
  return session;
}

export function setSeatingEditSession(next: SeatingEditSession | null) {
  session = next;
}

export function seatingWriteCredentials() {
  if (!session || session.mode !== "edit") return null;
  if (session.collaborative) {
    return {
      baseMapVersion: session.baseMapVersion,
      collaborative: true as const,
    };
  }
  return {
    editLockId: session.editLockId,
    lockGeneration: session.lockGeneration,
    screenInstanceId: session.screenInstanceId,
    baseMapVersion: session.baseMapVersion,
  };
}

export function adoptSeatingMapVersion(mapVersion: number) {
  const version = Number(mapVersion);
  if (!Number.isFinite(version)) return;
  observedMapVersion = version;
  if (!session) return;
  session = { ...session, baseMapVersion: version };
  if (!session.collaborative && session.editLockId) storeLock(session);
}

export function observeSeatingMapVersion(mapVersion: number) {
  observedMapVersion = Number(mapVersion || 0);
}

export function getObservedMapVersion() {
  return observedMapVersion;
}

export function noteSeatingMapVersion(mapVersion: number) {
  if (!session) return;
  session = { ...session, baseMapVersion: mapVersion };
}

export function setSeatingBaseline(snapshot: SeatingSnapshot) {
  baselineJson = JSON.stringify(snapshot);
}

export function classifySeatingSnapshot(current: SeatingSnapshot): SaveScope | "none" {
  if (!baselineJson) return "full";
  let baseline: SeatingSnapshot;
  try {
    baseline = JSON.parse(baselineJson) as SeatingSnapshot;
  } catch {
    return "full";
  }

  const changes = diffSeatingTables(baseline.tables || [], current.tables || []);
  const metaChanged =
    JSON.stringify({
      background: baseline.background ?? null,
      zones: baseline.zones ?? [],
      canvasView: baseline.canvasView ?? null,
    }) !==
    JSON.stringify({
      background: current.background ?? null,
      zones: current.zones ?? [],
      canvasView: current.canvasView ?? null,
    });

  if (!changes.length && !metaChanged) return "none";
  if (hasAssignmentChanges(changes)) return "full";
  return "layout";
}

export function trackSeatingSave<T>(promise: Promise<T>) {
  const tracked = promise.finally(() => {
    if (saveInFlight === tracked) saveInFlight = null;
  });
  saveInFlight = tracked;
  return tracked;
}

export function getSeatingSaveInFlight() {
  return saveInFlight;
}

function lockStorageKey(screenInstanceId: string) {
  return `invistimo.seating.lock.${screenInstanceId}`;
}

export function readStoredLock(screenInstanceId: string, eventId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(lockStorageKey(screenInstanceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      eventId?: string;
      editLockId?: string;
      lockGeneration?: number;
    };
    if (parsed.eventId !== eventId || !parsed.editLockId) return null;
    return {
      editLockId: String(parsed.editLockId),
      lockGeneration: Number(parsed.lockGeneration),
    };
  } catch {
    return null;
  }
}

export function storeLock(sessionValue: SeatingEditSession | null) {
  if (typeof window === "undefined") return;
  if (!sessionValue || sessionValue.mode !== "edit") {
    if (sessionValue) {
      sessionStorage.removeItem(lockStorageKey(sessionValue.screenInstanceId));
    }
    return;
  }
  sessionStorage.setItem(
    lockStorageKey(sessionValue.screenInstanceId),
    JSON.stringify({
      eventId: sessionValue.eventId,
      editLockId: sessionValue.editLockId,
      lockGeneration: sessionValue.lockGeneration,
    })
  );
}

function installScreenClaimListener() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  const existing = (window as unknown as { __invistimoSeatingChannel?: BroadcastChannel })
    .__invistimoSeatingChannel;
  if (existing) return;
  const channel = new BroadcastChannel("invistimo-seating-screen");
  (window as unknown as { __invistimoSeatingChannel?: BroadcastChannel }).__invistimoSeatingChannel =
    channel;
  channel.onmessage = (event: MessageEvent) => {
    const data = event.data || {};
    const current = sessionStorage.getItem(SCREEN_KEY);
    if (data.type === "ping" && data.id && data.id === current) {
      channel.postMessage({ type: "pong", id: current, token: data.token });
    }
  };
}

export async function ensureScreenInstanceId() {
  if (typeof window === "undefined") return "server";
  const stored = sessionStorage.getItem(SCREEN_KEY);
  const nextId = crypto.randomUUID();
  let peerClaimsSameId = false;

  if (stored && typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("invistimo-seating-screen");
    const token = crypto.randomUUID();
    await new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        const data = event.data || {};
        if (data.type === "pong" && data.id === stored && data.token === token) {
          peerClaimsSameId = true;
        }
      };
      channel.addEventListener("message", onMessage);
      channel.postMessage({ type: "ping", id: stored, token });
      window.setTimeout(() => {
        channel.removeEventListener("message", onMessage);
        channel.close();
        resolve();
      }, 80);
    });
  }

  const resolved = resolveScreenInstance({
    storedId: stored,
    peerClaimsSameId,
    nextId,
  });
  sessionStorage.setItem(SCREEN_KEY, resolved.screenInstanceId);
  if (resolved.discardStoredLock && stored) {
    sessionStorage.removeItem(lockStorageKey(stored));
  }
  installScreenClaimListener();
  return resolved.screenInstanceId;
}

export function reconnectDecision(input: {
  versionAtAttempt: number;
  versionNow: number;
  lockStillHeld: boolean;
}) {
  return decideReconnectSave(input);
}
