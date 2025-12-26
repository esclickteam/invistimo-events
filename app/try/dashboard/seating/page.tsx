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
    console.log("🧪 [DEMO] useLayoutEffect start");

    // 1) DEMO_GUESTS
    console.log("🧪 [DEMO] DEMO_GUESTS raw:", DEMO_GUESTS);
    console.log("🧪 [DEMO] DEMO_GUESTS length:", DEMO_GUESTS?.length);

    // 2) reset + demoMode
    console.log("🧪 [DEMO] calling resetDemo()");
    resetDemo();

    console.log("🧪 [DEMO] calling setDemoMode(true)");
    setDemoMode(true);

    // 3) tables
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

    // 4) guests clone
    const guests: DemoGuest[] = (DEMO_GUESTS || []).map((g: any) => ({
      ...g,
      tableId: null,
      tableName: null,
    }));

    console.log("🧪 [DEMO] tables prepared:", tables);
    console.log("🧪 [DEMO] guests prepared:", guests);

    // 5) seating sample
    if (tables.length && guests.length) {
      const count = guests[0].guestsCount || 1;
      const block = findFreeBlock(tables[0], count);

      console.log("🧪 [DEMO] findFreeBlock result:", block);

      if (block?.length) {
        tables[0].seatedGuests.push(
          ...block.map((seatIndex) => ({
            guestId: guests[0].id,
            seatIndex,
          }))
        );

        guests[0].tableId = tables[0].id;
        guests[0].tableName = tables[0].name;

        console.log("🧪 [DEMO] after seating:", {
          seatedGuests: tables[0].seatedGuests,
          guest0: guests[0],
        });
      } else {
        console.warn("⚠️ [DEMO] No free block found (block empty)");
      }
    } else {
      console.warn("⚠️ [DEMO] tables or guests empty", {
        tablesLen: tables.length,
        guestsLen: guests.length,
      });
    }

    // 6) init store
    console.log("🧪 [DEMO] calling init(tables, guests, null)");
    init(tables, guests, null);

    // 7) verify store updated
    const stateAfter = useDemoSeatingStore.getState();
    console.log("✅ [DEMO] store after init:", {
      demoMode: stateAfter.demoMode,
      tablesLen: stateAfter.tables?.length,
      guestsLen: stateAfter.guests?.length,
      firstTable: stateAfter.tables?.[0],
      firstGuest: stateAfter.guests?.[0],
    });

    console.log("🧪 [DEMO] useLayoutEffect end");
  }, [init, resetDemo, setDemoMode]);

  // ✅ מעביר רק דגל isDemo
  return <SeatingPage isDemo />;
}
