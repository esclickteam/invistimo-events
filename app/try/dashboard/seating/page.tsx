"use client";

import { useLayoutEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";
import { findFreeBlock } from "@/logic/seatingEngine";

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
  const init = useSeatingStore((state) => state.init);
  const setDemoMode = useSeatingStore((state) => state.setDemoMode);

  useLayoutEffect(() => {
    // ✅ מנקה persist אם קיים (לא ישבור אם לא קיים)
    try {
      // אם שם המפתח אצלך שונה — תעדכני אותו כאן
      localStorage.removeItem("seating-store");
    } catch {}

    // ✅ מאפס מצב בזיכרון לפני init (שלא ימשוך שאריות)
    useSeatingStore.setState({
      tables: [],
      guests: [],
      background: null,

      draggingGuest: null,
      ghostPosition: { x: 0, y: 0 },

      highlightedTable: null,
      highlightedSeats: [],

      selectedGuestId: null,

      seatingModalTableId: null,
      showSeatingModal: false,

      showAddModal: false,
      addGuestTable: null,
    });

    // ✅ מפעיל מצב דמו
    setDemoMode(true);

    /* =========================
       DEMO TABLES
    ========================= */
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

    /* =========================
       DEMO GUESTS
    ========================= */
    const guests: DemoGuest[] = [
      {
        id: "demo-1",
        name: "דנה לוי",
        guestsCount: 2,
        status: "yes",
        tableId: null,
        tableName: null,
      },
      {
        id: "demo-2",
        name: "איתי כהן",
        guestsCount: 1,
        status: "pending",
        tableId: null,
        tableName: null,
      },
      {
        id: "demo-3",
        name: "משפחת ישראלי",
        guestsCount: 4,
        status: "yes",
        tableId: null,
        tableName: null,
      },
    ];

    /* =========================
       🔥 הושבה אמיתית (engine) - דוגמה
    ========================= */
    const block = findFreeBlock(tables[0], guests[0].guestsCount);
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

    /* =========================
       INIT – דמו מאפס כל פעם
    ========================= */
    init(tables, guests, null);
  }, [init, setDemoMode]);

  return <SeatingPage />;
}
