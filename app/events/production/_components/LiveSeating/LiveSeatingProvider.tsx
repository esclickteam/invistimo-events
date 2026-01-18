"use client";
import { createContext, useContext, useState } from "react";
import type { LiveState, Guest } from "./types";

type LiveContextType = {
  state: LiveState;
  markArrival: (id: string, arrived: number) => void;
  cancelReservation: (id: string) => void;
};

const LiveCtx = createContext<LiveContextType | null>(null);

export function LiveSeatingProvider({
  initial,
  children,
}: {
  initial: LiveState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LiveState>(initial);

  function markArrival(id: string, arrived: number) {
    setState(s => ({
      ...s,
      guests: s.guests.map((g: Guest) =>
        g.id === id ? { ...g, arrived } : g
      ),
    }));
  }

  function cancelReservation(id: string) {
    setState(s => ({
      ...s,
      guests: s.guests.map((g: Guest) =>
        g.id === id ? { ...g, approved: 0, arrived: 0 } : g
      ),
    }));
  }

  return (
    <LiveCtx.Provider value={{ state, markArrival, cancelReservation }}>
      {children}
    </LiveCtx.Provider>
  );
}

export function useLiveSeating() {
  const ctx = useContext(LiveCtx);
  if (!ctx) {
    throw new Error("useLiveSeating must be used inside LiveSeatingProvider");
  }
  return ctx;
}
