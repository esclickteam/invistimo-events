"use client";

import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";
import { useSeatingStore } from "@/store/seatingStore";

export default function LiveSeatingViewer() {
  // 🔹 שליפת נתונים מה‑Zustand store
  const { tables, guests, background, canvasView } = useSeatingStore((s) => ({
    tables: s.tables,
    guests: s.guests,
    background: s.background,
    canvasView: s.canvasView,
  }));

  return (
    <div className="relative w-full h-full bg-[#faf8f4]">
      <SeatingEditor
        readOnly
        showStats
        tables={tables}
        guests={guests}
        background={background}
        canvasView={canvasView}
      />
    </div>
  );
}
