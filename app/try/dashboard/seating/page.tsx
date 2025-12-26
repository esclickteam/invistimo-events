"use client";

import { useEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";
import { findFreeBlock } from "@/logic/seatingEngine";

export default function DemoSeatingPage() {
  const init = useSeatingStore((state) => state.init);

  useEffect(() => {
    /* =========================
       DEMO TABLES
    ========================= */
    const tables: any[] = [
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
    const guests: any[] = [
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
       🔥 הושבה דרך engine (כמו פרודקשן)
    ========================= */
    const targetTable: any = tables[0];
    const guest: any = guests[0];

    const block = findFreeBlock(targetTable, guest.guestsCount);

    if (block && block.length) {
      targetTable.seatedGuests.push(
        ...block.map((seatIndex: number) => ({
          guestId: guest.id,
          seatIndex,
        }))
      );

      guest.tableId = targetTable.id;
      guest.tableName = targetTable.name;
    }

    /* =========================
       INIT – ריסט מלא לדמו
    ========================= */
    init(tables, guests, null);
  }, []); // ❗️ תמיד ריסט בדמו

  return <SeatingPage />;
}
