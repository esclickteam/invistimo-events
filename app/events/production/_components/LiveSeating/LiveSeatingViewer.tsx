"use client";

import { useEffect, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import SeatingCanvas from "@/app/dashboard/seating/SeatingCanvas";


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
          `/api/live-seating/import?invitationId=${invitationId}`,
          { method: "POST" }
        );

        const data = await res.json();

        // ✅ snapshot מלא (כולל canvasView)
        init(
  data.tables || [],
  data.guests || [],
  data.background ?? null,
  null // ✅ מבטל zoom/pan אצל המפיק
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
      {/* 🎧 מפיק – משתמש ב־SeatingCanvas */}
      <SeatingCanvas
        mode="viewer"
        background={null}
        showStats
      />
    </div>
  );
}
