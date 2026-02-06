"use client";

import { useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ================= TYPES ================= */

type Guest = {
  id?: string;
  _id: string;
  rsvp?: "yes" | "no" | "pending";
};

type SeatedGuest = {
  guestId: string;
};

type Table = {
  id: string;
  seatedGuests?: SeatedGuest[];
};

/* ================= HOOK ================= */

export function useSeatingStats() {
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const getPlannedSeatCount = useSeatingStore(
    (s) => s.getPlannedSeatCount
  );

  /* ================= HELPERS ================= */

  const seatGuestId = (g: Guest): string =>
    String(g.id ?? g._id);

  /* ================= TABLE MAP ================= */

  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();

    tables.forEach((t: Table) => {
      t.seatedGuests?.forEach((sg: SeatedGuest) => {
        map.set(String(sg.guestId), t);
      });
    });

    return map;
  }, [tables]);

  /* ================= SEATED CHECK ================= */

  const isGuestSeated = (g: Guest): boolean => {
    const planned = getPlannedSeatCount(g);
    return planned > 0 && guestTableMap.has(seatGuestId(g));
  };

  /* ================= GLOBAL STATS ================= */

  const stats = useMemo(() => {
    let total = 0;
    let seated = 0;

    guests
      .filter((g: Guest) => g.rsvp === "yes")
      .forEach((g: Guest) => {
        const planned = getPlannedSeatCount(g);
        total += planned;
        if (isGuestSeated(g)) seated += planned;
      });

    return {
      total,
      seated,
      remaining: Math.max(total - seated, 0),
    };
  }, [guests, tables]);

  /* ================= GROUP STATS ================= */

  const getGroupStats = (list: Guest[]) => {
    let total = 0;
    let seated = 0;

    list.forEach((g: Guest) => {
      const planned = getPlannedSeatCount(g);
      total += planned;
      if (isGuestSeated(g)) seated += planned;
    });

    return {
      total,
      seated,
      remaining: Math.max(total - seated, 0),
    };
  };

  /* ================= EXPORT ================= */

  return {
    stats,
    isGuestSeated,
    getGroupStats,
  };
}
