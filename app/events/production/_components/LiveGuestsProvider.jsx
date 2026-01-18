"use client";

import { createContext, useContext, useState } from "react";

const LiveGuestsContext = createContext(null);

export function LiveGuestsProvider({ initial, children }) {
  const [state, setState] = useState(initial);

  function updateGuestStatus(guestId, status) {
    setState((prev) => {
      const guests = prev.guests.map((g) =>
        g._id === guestId ? { ...g, status } : g
      );

      return {
        ...prev,
        guests,
        stats: {
          total: guests.length,
          arrived: guests.filter((g) => g.status === "arrived").length,
          notArrived: guests.filter(
            (g) => g.status === "not-arrived"
          ).length,
          cancelled: guests.filter(
            (g) => g.status === "cancelled"
          ).length,
        },
      };
    });
  }

  return (
    <LiveGuestsContext.Provider
      value={{ state, setState, updateGuestStatus }}
    >
      {children}
    </LiveGuestsContext.Provider>
  );
}

export function useLiveGuests() {
  const ctx = useContext(LiveGuestsContext);
  if (!ctx) {
    throw new Error(
      "useLiveGuests must be used inside LiveGuestsProvider"
    );
  }
  return ctx;
}
