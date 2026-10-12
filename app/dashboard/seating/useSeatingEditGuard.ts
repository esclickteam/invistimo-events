"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";
import {
  SEATING_INACTIVITY_MS,
  SEATING_INACTIVITY_WARNING_MS,
  planIdleExpiry,
} from "@/lib/seating/editLock";
import {
  ensureScreenInstanceId,
  getObservedMapVersion,
  getSeatingEditSession,
  getSeatingSaveInFlight,
  noteSeatingMapVersion,
  readStoredLock,
  reconnectDecision,
  classifySeatingSnapshot,
  setSeatingBaseline,
  setSeatingEditSession,
  storeLock,
  type SeatingEditMode,
  type SeatingSnapshot,
} from "./seatingEditSession";

type LockPayload = {
  success?: boolean;
  mode?: "edit" | "view" | "closed" | "stale";
  collaborative?: boolean;
  code?: string;
  message?: string;
  lockId?: string;
  generation?: number;
  mapVersion?: number;
  idleMs?: number;
  warning?: boolean;
};

type Options = {
  enabled: boolean;
  eventId: string | null;
  invitationId: string | null;
  reloadFromServer: () => Promise<boolean>;
  flushPendingSave: () => Promise<boolean>;
};

async function postLock(
  eventId: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; data: LockPayload }> {
  const response = await fetch(`/api/seating/edit-lock/${eventId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as LockPayload;
  return { ok: response.ok, data };
}

function currentSnapshot(): SeatingSnapshot {
  const seating = useSeatingStore.getState();
  return {
    tables: seating.tables || [],
    background: seating.background ?? null,
    zones: useZoneStore.getState().zones || [],
    canvasView: seating.canvasView ?? null,
  };
}

export function useSeatingEditGuard({
  enabled,
  eventId,
  invitationId,
  reloadFromServer,
  flushPendingSave,
}: Options) {
  const [phase, setPhase] = useState<SeatingEditMode | "hidden">(
    enabled ? "hidden" : "hidden"
  );
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unsavedNote, setUnsavedNote] = useState<string | null>(null);
  const [viewMessage, setViewMessage] = useState(
    "המפה נערכת כרגע במסך אחר. כאן אפשר רק לצפות."
  );
  const [transferBusy, setTransferBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [collaborative, setCollaborative] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lastActivitySentRef = useRef(0);
  const suppressSaveRef = useRef(false);
  const allowFlushRef = useRef(false);
  const phaseRef = useRef(phase);
  const closingRef = useRef(false);
  const reloadRef = useRef(reloadFromServer);
  const flushRef = useRef(flushPendingSave);
  reloadRef.current = reloadFromServer;
  flushRef.current = flushPendingSave;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const applyMode = useCallback((mode: SeatingEditMode) => {
    setPhase(mode);
    useSeatingStore.getState().setInteractionMode(mode === "edit" ? "edit" : "view");
    if (mode !== "edit") {
      setShowIdleWarning(false);
    }
  }, []);

  const rememberEdit = useCallback(
    (screenInstanceId: string, data: LockPayload) => {
      if (!eventId || !data.lockId || !Number.isFinite(Number(data.generation))) {
        return false;
      }
      const next = {
        eventId,
        screenInstanceId,
        editLockId: String(data.lockId),
        lockGeneration: Number(data.generation),
        baseMapVersion: Number(data.mapVersion || 0),
        mode: "edit" as const,
      };
      setSeatingEditSession(next);
      storeLock(next);
      noteSeatingMapVersion(next.baseMapVersion);
      applyMode("edit");
      return true;
    },
    [applyMode, eventId]
  );

  const reloadFresh = useCallback(async () => {
    suppressSaveRef.current = true;
    useSeatingStore.getState().init([], [], null, null);
    useZoneStore.getState().setZones([]);
    const loaded = await reloadRef.current();
    if (!loaded) return false;
    setSeatingBaseline(currentSnapshot());
    suppressSaveRef.current = phaseRef.current !== "edit";
    return true;
  }, []);

  const closeEditing = useCallback(
    async (note?: string | null) => {
      if (closingRef.current || !eventId) return;
      closingRef.current = true;
      suppressSaveRef.current = true;
      const current = getSeatingEditSession();
      const inFlight = getSeatingSaveInFlight();
      if (inFlight) await inFlight.catch(() => undefined);

      let lockValid = false;
      if (current?.mode === "edit") {
        try {
          const checked = await postLock(eventId, {
            action: "revalidate",
            invitationId,
            screenInstanceId: current.screenInstanceId,
            editLockId: current.editLockId,
            lockGeneration: current.lockGeneration,
            baseMapVersion: current.baseMapVersion,
          });
          lockValid = checked.data.mode === "edit";
          if (lockValid && typeof checked.data.mapVersion === "number") {
            noteSeatingMapVersion(checked.data.mapVersion);
          }
        } catch {
          lockValid = false;
        }
      }

      const plan = planIdleExpiry({
        idleMs: SEATING_INACTIVITY_MS,
        saveInFlight: false,
        pendingSave: true,
        lockValidOnServer: lockValid,
      });

      if (plan.flushPending) {
        allowFlushRef.current = true;
        const saved = await flushRef.current().catch(() => false);
        allowFlushRef.current = false;
        if (!saved) {
          note = note || "השמירה האחרונה לא הושלמה. השינויים לא נשמרו בשרת.";
        }
      } else if (!lockValid && classifySeatingSnapshot(currentSnapshot()) !== "none") {
        note = note || "הנעילה הסתיימה לפני שהשמירה האחרונה אושרה. השינויים לא נשמרו.";
      }

      if (current?.mode === "edit") {
        await postLock(eventId, {
          action: "release",
          invitationId,
          screenInstanceId: current.screenInstanceId,
          editLockId: current.editLockId,
          lockGeneration: current.lockGeneration,
          baseMapVersion: current.baseMapVersion,
        }).catch(() => undefined);
        storeLock(null);
        setSeatingEditSession({ ...current, mode: "closed" });
      }

      setUnsavedNote(note || null);
      applyMode("closed");
      closingRef.current = false;
    },
    [applyMode, eventId, invitationId]
  );

  const sendActivity = useCallback(async () => {
    const current = getSeatingEditSession();
    if (!eventId || !current || current.mode !== "edit" || phaseRef.current !== "edit") return;
    const now = Date.now();
    if (now - lastActivitySentRef.current < 10_000) return;
    lastActivitySentRef.current = now;
    const result = await postLock(eventId, {
      action: "activity",
      invitationId,
      screenInstanceId: current.screenInstanceId,
      editLockId: current.editLockId,
      lockGeneration: current.lockGeneration,
      baseMapVersion: current.baseMapVersion,
    }).catch(() => null);
    if (!result) return;
    if (result.data.mode === "closed" || result.data.code === "LOCK_EXPIRED") {
      await closeEditing();
    }
  }, [closeEditing, eventId, invitationId]);

  const noteActivity = useCallback(() => {
    if (phaseRef.current !== "edit") return;
    lastActivityRef.current = Date.now();
    setShowIdleWarning(false);
    void sendActivity();
  }, [sendActivity]);

  useEffect(() => {
    if (!enabled || !eventId) {
      applyMode("edit");
      setPhase("hidden");
      useSeatingStore.getState().setInteractionMode("edit");
      return;
    }

    let cancelled = false;
    const screenRef = { id: "" };

    async function start() {
      const screenInstanceId = await ensureScreenInstanceId();
      screenRef.id = screenInstanceId;
      if (cancelled) return;
      const stored = readStoredLock(screenInstanceId, eventId!);
      const result = await postLock(eventId!, {
        action: "acquire",
        invitationId,
        screenInstanceId,
        editLockId: stored?.editLockId,
        lockGeneration: stored?.lockGeneration,
        recordActivity: true,
      });
      if (cancelled) return;

      if (result.data.collaborative) {
        setCollaborative(true);
        setSeatingEditSession({
          eventId: eventId!,
          screenInstanceId,
          editLockId: "",
          lockGeneration: 0,
          baseMapVersion: Number(result.data.mapVersion || 0),
          mode: "edit",
          collaborative: true,
        });
        storeLock(null);
        if (Number(result.data.mapVersion || 0) !== getObservedMapVersion()) {
          const loaded = await reloadFresh();
          if (!loaded) {
            setSaveError("לא הצלחנו לטעון את המפה העדכנית. השמירה חסומה עד לטעינה מחדש.");
            suppressSaveRef.current = true;
            return;
          }
        } else {
          setSeatingBaseline(currentSnapshot());
        }
        noteSeatingMapVersion(Number(result.data.mapVersion || 0));
        applyMode("edit");
        lastActivityRef.current = Date.now();
        suppressSaveRef.current = false;
        return;
      }

      if (result.data.mode === "edit" && result.data.lockId) {
        const serverVersion = Number(result.data.mapVersion || 0);
        const loadedVersion = getObservedMapVersion();
        if (serverVersion !== loadedVersion) {
          const loaded = await reloadFresh();
          if (!loaded) {
            await postLock(eventId!, {
              action: "release",
              invitationId,
              screenInstanceId,
              editLockId: result.data.lockId,
              lockGeneration: result.data.generation,
              baseMapVersion: serverVersion,
            }).catch(() => undefined);
            setUnsavedNote("לא הצלחנו לטעון את המפה מהשרת. נסו שוב.");
            applyMode("closed");
            return;
          }
        } else {
          setSeatingBaseline(currentSnapshot());
        }
        rememberEdit(screenInstanceId, result.data);
        lastActivityRef.current = Date.now();
        suppressSaveRef.current = false;
        return;
      }

      setSeatingEditSession({
        eventId: eventId!,
        screenInstanceId,
        editLockId: "",
        lockGeneration: 0,
        baseMapVersion: Number(result.data.mapVersion || 0),
        mode: "view",
      });
      setViewMessage(
        result.data.message || "המפה נערכת כרגע במסך אחר. כאן אפשר רק לצפות."
      );
      applyMode("view");
      suppressSaveRef.current = true;
      await reloadFresh();
    }

    void start();
    return () => {
      cancelled = true;
    };
    // Acquire once per event. Reload and session updates are read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, eventId, invitationId]);

  useEffect(() => {
    if (!enabled || !eventId || phase !== "edit" || collaborative) return;
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const current = getSeatingEditSession();
      if (!current || current.mode !== "edit") return;
      void postLock(eventId, {
        action: "heartbeat",
        invitationId,
        screenInstanceId: current.screenInstanceId,
        editLockId: current.editLockId,
        lockGeneration: current.lockGeneration,
        baseMapVersion: current.baseMapVersion,
      }).then((result) => {
        if (result.data.mode === "closed" || result.data.code === "LOCK_EXPIRED") {
          void closeEditing();
          return;
        }
        if (result.data.mode === "view" || result.data.code === "LOCK_NOT_HELD") {
          setViewMessage("העריכה הועברה למסך אחר. המסך הזה עבר לצפייה בלבד.");
          setSeatingEditSession({ ...current, mode: "view" });
          storeLock(null);
          applyMode("view");
          suppressSaveRef.current = true;
          void reloadFresh();
          return;
        }
        if (result.data.warning) setShowIdleWarning(true);
        if (typeof result.data.mapVersion === "number" && result.data.mode === "stale") {
          suppressSaveRef.current = true;
          void reloadFresh().then((loaded) => {
            if (!loaded) {
              setSaveError("לא הצלחנו לטעון את המפה העדכנית. השינויים לא נשלחו.");
              return;
            }
            noteSeatingMapVersion(Number(result.data.mapVersion));
            if (getSeatingEditSession()?.mode === "edit") {
              setSeatingBaseline(currentSnapshot());
              suppressSaveRef.current = false;
              setSaveError("המפה עודכנה מהשרת. שינויים שלא נשמרו לא נשלחו מחדש.");
            }
          });
        }
      }).catch(() => {
        setSaveError("החיבור נקטע. השינויים לא סומנו כשמורים.");
      });
    }, 20_000);
    return () => window.clearInterval(tick);
  }, [applyMode, closeEditing, collaborative, enabled, eventId, invitationId, phase, reloadFresh]);

  useEffect(() => {
    if (!enabled || phase !== "edit" || collaborative) return;
    const tick = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const plan = planIdleExpiry({
        idleMs,
        saveInFlight: Boolean(getSeatingSaveInFlight()),
        pendingSave: false,
        lockValidOnServer: true,
      });
      setShowIdleWarning(plan.showWarning);
      if (plan.shouldClose && !plan.waitForInFlight) {
        void closeEditing();
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [closeEditing, collaborative, enabled, phase]);

  useEffect(() => {
    if (!enabled) return;
    const onActivity = () => noteActivity();
    window.addEventListener("pointerdown", onActivity, true);
    window.addEventListener("keydown", onActivity, true);
    window.addEventListener("touchstart", onActivity, true);
    return () => {
      window.removeEventListener("pointerdown", onActivity, true);
      window.removeEventListener("keydown", onActivity, true);
      window.removeEventListener("touchstart", onActivity, true);
    };
  }, [enabled, noteActivity]);

  useEffect(() => {
    if (!enabled || !eventId) return;

    const revalidate = async () => {
      const current = getSeatingEditSession();
      if (!current || current.mode !== "edit") return;
      suppressSaveRef.current = true;
      try {
        const result = await postLock(eventId, {
          action: "revalidate",
          invitationId,
          screenInstanceId: current.screenInstanceId,
          editLockId: current.editLockId,
          lockGeneration: current.lockGeneration,
          baseMapVersion: current.baseMapVersion,
        });
        const decision = reconnectDecision({
          versionAtAttempt: current.baseMapVersion,
          versionNow: Number(result.data.mapVersion ?? current.baseMapVersion),
          lockStillHeld: result.data.mode === "edit" || result.data.mode === "stale",
        });
        if (decision === "block") {
          await closeEditing();
          return;
        }
        if (decision === "accept-server") {
          const loaded = await reloadFresh();
          if (!loaded) {
            setSaveError("לא הצלחנו לטעון את המפה העדכנית. השינויים לא נשלחו מחדש.");
            return;
          }
          if (result.data.lockId) {
            rememberEdit(current.screenInstanceId, result.data);
            setSeatingBaseline(currentSnapshot());
            suppressSaveRef.current = false;
            setSaveError("המפה עודכנה מהשרת. שינויים שלא נשמרו לא נשלחו מחדש.");
          }
          return;
        }
        suppressSaveRef.current = false;
      } catch {
        setSaveError("החיבור נקטע. השינויים לא סומנו כשמורים עד לאישור מהשרת.");
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", revalidate);
    };
  }, [closeEditing, enabled, eventId, invitationId, reloadFresh, rememberEdit]);

  const transferEdit = useCallback(async () => {
    if (!eventId) return;
    const confirmed = window.confirm(
      "העברת העריכה תסגור את העריכה במסך האחר ותטען לכאן את המפה העדכנית מהשרת. להמשיך?"
    );
    if (!confirmed) return;
    setTransferBusy(true);
    try {
      const screenInstanceId =
        getSeatingEditSession()?.screenInstanceId || (await ensureScreenInstanceId());
      const result = await postLock(eventId, {
        action: "transfer",
        invitationId,
        screenInstanceId,
        confirmed: true,
      });
      if (result.data.mode !== "edit" || !result.data.lockId) {
        setViewMessage(result.data.message || "אי אפשר להעביר את העריכה כרגע.");
        return;
      }
      suppressSaveRef.current = true;
      const loaded = await reloadFresh();
      if (!loaded) {
        setViewMessage("העריכה הועברה, אבל לא הצלחנו לטעון את המפה. נסו שוב בלי לשמור.");
        return;
      }
      rememberEdit(screenInstanceId, result.data);
      setSeatingBaseline(currentSnapshot());
      lastActivityRef.current = Date.now();
      suppressSaveRef.current = false;
      setSaveError(null);
    } finally {
      setTransferBusy(false);
    }
  }, [eventId, invitationId, reloadFresh, rememberEdit]);

  const resumeEditing = useCallback(async () => {
    if (!eventId) return;
    setResumeBusy(true);
    setUnsavedNote(null);
    try {
      const screenInstanceId =
        getSeatingEditSession()?.screenInstanceId || (await ensureScreenInstanceId());
      storeLock(null);
      setSeatingEditSession(null);
      suppressSaveRef.current = true;
      const loaded = await reloadFresh();
      if (!loaded) {
        setUnsavedNote("לא הצלחנו לטעון את המפה מהשרת. נסו שוב.");
        return;
      }
      const result = await postLock(eventId, {
        action: "acquire",
        invitationId,
        screenInstanceId,
        recordActivity: true,
      });
      if (result.data.mode === "edit" && result.data.lockId) {
        rememberEdit(screenInstanceId, result.data);
        setSeatingBaseline(currentSnapshot());
        lastActivityRef.current = Date.now();
        suppressSaveRef.current = false;
        setSaveError(null);
        return;
      }
      setViewMessage(
        result.data.message || "העריכה תפוסה במסך אחר. כאן אפשר רק לצפות."
      );
      setSeatingEditSession({
        eventId,
        screenInstanceId,
        editLockId: "",
        lockGeneration: 0,
        baseMapVersion: Number(result.data.mapVersion || 0),
        mode: "view",
      });
      applyMode("view");
      suppressSaveRef.current = true;
    } finally {
      setResumeBusy(false);
    }
  }, [applyMode, eventId, invitationId, reloadFresh, rememberEdit]);

  const allowsSave = useCallback(() => {
    if (!enabled) return false;
    const current = getSeatingEditSession();
    if (current?.collaborative && phaseRef.current === "edit") {
      return !suppressSaveRef.current || allowFlushRef.current;
    }
    if (phaseRef.current !== "edit") return false;
    if (current?.mode !== "edit") return false;
    if (suppressSaveRef.current && !allowFlushRef.current) return false;
    return true;
  }, [enabled]);

  const reportSaveFailure = useCallback((message: string) => {
    setSaveError(message);
  }, []);

  const reportSaveSuccess = useCallback((mapVersion: number) => {
    setSaveError(null);
    noteSeatingMapVersion(mapVersion);
    const current = getSeatingEditSession();
    if (current) {
      setSeatingEditSession({ ...current, baseMapVersion: mapVersion });
      storeLock({ ...current, baseMapVersion: mapVersion });
    }
    setSeatingBaseline(currentSnapshot());
  }, []);

  return {
    phase: enabled ? phase : "hidden",
    showIdleWarning: showIdleWarning && phase === "edit",
    saveError,
    unsavedNote,
    viewMessage,
    transferBusy,
    resumeBusy,
    allowsSave,
    noteActivity,
    transferEdit,
    resumeEditing,
    reportSaveFailure,
    reportSaveSuccess,
    suppressesSave: () => suppressSaveRef.current || phaseRef.current !== "edit",
  };
}

export { SEATING_INACTIVITY_WARNING_MS };
