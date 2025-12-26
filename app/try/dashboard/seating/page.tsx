"use client";

import { useEffect } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";

export default function TrySeatingPage() {
  const initDemo = useSeatingStore((s) => s.initDemo);

  useEffect(() => {
    initDemo(); // 🔥 זה קריטי – בלי זה הכל ריק
  }, [initDemo]);

  return (
    <div className="w-full h-[calc(100vh-120px)]">
      <SeatingEditor background={null} />
    </div>
  );
}
