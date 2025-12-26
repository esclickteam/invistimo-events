"use client";

import { useEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";

/* =========================
   DEMO DATA
========================= */
const DEMO_GUESTS = [
  {
    id: "demo-1",
    fullName: "דנה לוי",
    guestsCount: 2,
    status: "yes",
  },
  {
    id: "demo-2",
    fullName: "איתי כהן",
    guestsCount: 1,
    status: "pending",
  },
  {
    id: "demo-3",
    fullName: "משפחת ישראלי",
    guestsCount: 4,
    status: "yes",
  },
  {
    id: "demo-4",
    fullName: "נועה בר",
    guestsCount: 1,
    status: "no",
  },
];

export default function DemoSeatingPage() {
  const init = useSeatingStore((state) => state.init);

  useEffect(() => {
    // ⬅️ tables ריק, guests דמו, בלי background
    init([], DEMO_GUESTS, null);
  }, [init]);

  return <SeatingPage />;
}
