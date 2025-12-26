"use client";

import { useEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";

/* =========================
   DEMO TABLES
========================= */
const DEMO_TABLES = [
  {
    id: "table-1",
    name: "שולחן 1",
    type: "round",
    seats: 12,
    x: 320,
    y: 260,
    rotation: 0,
    seatedGuests: [
      { guestId: "demo-1", seatIndex: 0 },
      { guestId: "demo-1", seatIndex: 1 },
    ],
  },
];

/* =========================
   DEMO GUESTS
========================= */
const DEMO_GUESTS = [
  {
    id: "demo-1",
    name: "דנה לוי",
    guestsCount: 2,
    status: "yes",
    tableId: "table-1",
    tableName: "שולחן 1",
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
  {
    id: "demo-4",
    name: "נועה בר",
    guestsCount: 1,
    status: "no",
    tableId: null,
    tableName: null,
  },
];

export default function DemoSeatingPage() {
  const init = useSeatingStore((state) => state.init);

  useEffect(() => {
    // ⬅️ init מלא: שולחנות + אורחים
    init(DEMO_TABLES, DEMO_GUESTS, null);
  }, [init]);

  return <SeatingPage />;
}
