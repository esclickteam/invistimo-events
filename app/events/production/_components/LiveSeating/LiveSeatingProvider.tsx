"use client";

import { createContext, useContext, useState } from "react";
import {
  LiveSeatingState,
  LiveSeatingContextType,
} from "./types";

const LiveSeatingContext =
  createContext<LiveSeatingContextType | null>(null);

export function LiveSeatingProvider({
  initial,
  children,
}: {
  initial: LiveSeatingState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LiveSeatingState>(initial);

  function markArrived(guestId: string, arrived: number) {
    setState((prev) => ({
      ...prev,
      guests: prev.guests.map((g) =>
        g.id === guestId ? { ...g, arrived } : g
      ),
    }));
  }

  return (
    <LiveSeatingContext.Provider
      value={{ state, markArrived }}
    >
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
