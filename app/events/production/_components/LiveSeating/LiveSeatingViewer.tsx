"use client";

import { useEffect, useState } from "react";
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";
import { useSeatingStore } from "@/store/seatingStore";

type TableStatus = "empty" | "partial" | "full";

type TableDTO = {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  usedSeats: number;
  status: TableStatus;
};

type GuestDTO = {
  id: string;
  name: string;
  tableId?: string | null;
  approvedCount: number;
};

export default function LiveSeatingViewer({
  invitationId,
}: {
  invitationId: string;
}) {
  const [loading, setLoading] = useState(true);

  const init = useSeatingStore((s) => s.init);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // 🧹 ניקוי מלא – viewer תמיד נקי
        useSeatingStore.getState().init([], [], null, null);

        const res = await fetch(
          `/api/live-seating/import?invitationId=${invitationId}`
        );

        const data = await res.json();

        init(
          data.tables || [],
          data.guests || [],
          null,
          null
        );
      } catch (err) {
        console.error("❌ LiveSeatingViewer load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (invitationId) load();
  }, [invitationId, init]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        טוען הושבה...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#faf8f4]">
      <SeatingEditor
        readOnly
        showStats
        background={null}
      />
    </div>
  );
}
