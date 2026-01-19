"use client";

import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";
import { useSeatingStore } from "@/store/seatingStore";

export default function LiveSeatingViewer() {
  // 🎯 רקע אם קיים (לא חובה)
  const background = useSeatingStore(
    (s) => s.background?.url ?? null
  );

  return (
    <div className="relative w-full h-full bg-[#faf8f4]">
      <SeatingEditor
        readOnly
        showStats
        background={background}
      />
    </div>
  );
}
