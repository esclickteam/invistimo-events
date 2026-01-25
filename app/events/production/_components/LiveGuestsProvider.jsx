"use client";

import { createContext, useContext, useState, useMemo } from "react";

const LiveGuestsContext = createContext(null);

export function LiveGuestsProvider({ initial, children }) {
  const [guests, setGuests] = useState(initial?.guests ?? []);

  /**
   * 🔴 פעולה יחידה בלייב:
   * עדכון כמה הגיעו בפועל
   * 0 ≤ arrived ≤ approved
   */
  function markArrived(guestId, arrived) {
    setGuests((prev) =>
      prev.map((g) =>
        g._id === guestId
          ? {
              ...g,
              arrived: Math.max(
                0,
                Math.min(arrived, g.approved)
              ),
            }
          : g
      )
    );
  }

  /**
   * 🧮 סיכומים – נגזרים מהאורחים
   * (לא state נפרד!)
   */
  const stats = useMemo(() => {
    const approvedTotal = guests.reduce(
      (sum, g) => sum + (g.approved ?? 0),
      0
    );

    const arrivedTotal = guests.reduce(
      (sum, g) => sum + (g.arrived ?? 0),
      0
    );

    return {
      approvedTotal,
      arrivedTotal,
    };
  }, [guests]);

  return (
    <LiveGuestsContext.Provider
      value={{
        guests,
        setGuests,
        markArrived,
        stats,
      }}
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
