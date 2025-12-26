"use client";

import { useLayoutEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useDemoSeatingStore } from "@/store/store/demoSeatingStore";
import { findFreeBlock } from "@/logic/seatingEngine";
import { DEMO_GUESTS } from "@/demo/demoGuests";

/* =========================
   TYPES
========================= */
interface DemoGuest {
  id: string;
  name: string;
  guestsCount: number;
  status: "yes" | "pending" | "no";
  tableId: string | null;
  tableName: string | null;
}

interface DemoTable {
  id: string;
  name: string;
  type: "round" | "square" | "banquet";
  seats: number;
  x: number;
  y: number;
  rotation: number;
  seatedGuests: { guestId: string; seatIndex: number }[];
}

export default function DemoSeatingPage() {
  const init = useDemoSeatingStore((state) => state.init);
  const resetDemo = useDemoSeatingStore((state) => state.resetDemo);
  const setDemoMode = useDemoSeatingStore((state) => state.setDemoMode);

  useLayoutEffect(() => {
    resetDemo();
    setDemoMode(true);

    const tables: DemoTable[] = [
      {
        id: "round-1",
        name: "שולחן עגול",
        type: "round",
        seats: 12,
        x: 260,
        y: 260,
        rotation: 0,
        seatedGuests: [],
      },
      {
        id: "square-1",
        name: "שולחן מרובע",
        type: "square",
        seats: 8,
        x: 520,
        y: 260,
        rotation: 0,
        seatedGuests: [],
      },
      {
        id: "banquet-1",
        name: "שולחן אבירים",
        type: "banquet",
        seats: 10,
        x: 800,
        y: 260,
        rotation: 0,
        seatedGuests: [],
      },
    ];

    const guests: DemoGuest[] = DEMO_GUESTS.map((g) => ({
      ...g,
      tableId: null,
      tableName: null,
    }));

    if (tables.length && guests.length) {
      const block = findFreeBlock(tables[0], guests[0].guestsCount || 1);
      if (block?.length) {
        tables[0].seatedGuests.push(
          ...block.map((seatIndex) => ({
            guestId: guests[0].id,
            seatIndex,
          }))
        );
        guests[0].tableId = tables[0].id;
        guests[0].tableName = tables[0].name;
      }
    }

    init(tables, guests, null);
  }, [init, resetDemo, setDemoMode]);

  // ✅ מעביר רק דגל isDemo
  return <SeatingPage isDemo />;
}
