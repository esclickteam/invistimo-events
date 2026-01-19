"use client";

import { useEffect, useState } from "react";
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";
import { useSeatingStore } from "@/store/seatingStore";

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

        // 🧹 ניקוי מלא – viewer תמיד נטען מ־0
        useSeatingStore.getState().init([], [], null, null);

        const res = await fetch(
          `/api/live-seating/import?invitationId=${invitationId}`,
          { method: "POST" }
        );

        if (!res.ok) {
          throw new Error("Failed to import live seating");
        }

        const data = await res.json();

        /**
         * 🔑 החיבור הקריטי:
         * טוענים גם background וגם canvasView
         * בדיוק כמו במסך העריכה
         */
        init(
          data.tables || [],
          data.guests || [],
          data.background ?? null,
          data.canvasView ?? null
        );
      } catch (err) {
        console.error("❌ LiveSeatingViewer load error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (invitationId) {
      load();
    }
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
        /* background נלקח בפועל מה־store (דרך init) */
      />
    </div>
  );
}
