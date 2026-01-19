"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  LiveSeatingState,
  LiveSeatingContextType,
} from "./types";

const LiveSeatingContext =
  createContext<LiveSeatingContextType | null>(null);

type ProviderProps = {
  initial: LiveSeatingState;
  children: React.ReactNode;
};

export function LiveSeatingProvider({
  initial,
  children,
}: ProviderProps) {
  /**
   * 🛡️ safeInitial
   * שומר גם background + canvasView
   */
  const safeInitial: LiveSeatingState = useMemo(
    () => ({
      guests: initial?.guests ?? [],
      tables: initial?.tables ?? [],
      background: initial?.background ?? null,
      canvasView: initial?.canvasView ?? null,
    }),
    [initial]
  );

  const [state, setState] =
    useState<LiveSeatingState>(safeInitial);

  /**
   * ✅ סימון הגעה – ללא שינוי לוגיקה
   */
  function markArrived(guestId: string, arrived: number) {
    setState((prev) => ({
      ...prev,
      guests: (prev.guests ?? []).map((g: any) =>
        (g._id ?? g.id) === guestId
          ? { ...g, arrived }
          : g
      ),
    }));
  }

  const value = useMemo(
    () => ({ state, markArrived }),
    [state]
  );

  return (
    <LiveSeatingContext.Provider value={value}>
      {children}
    </LiveSeatingContext.Provider>
  );
}

export function useLiveSeating() {
  const ctx = useContext(LiveSeatingContext);
  if (!ctx) {
    throw new Error(
      "useLiveSeating must be used inside LiveSeatingProvider"
    );
  }
  return ctx;
}
