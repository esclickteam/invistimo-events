"use client";

import { useEffect, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ⭐ אותו קנבס כמו בדשבורד */
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";

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
        useSeatingStore.getState().init(
          [], // tables
          [], // guests
          [], // groups
          null,
          null
        );

        // ✅ מקור אמת אחיד
        const res = await fetch(
          `/api/live-snapshot?invitationId=${invitationId}`
        );

        const data = await res.json();

        // ✅ init עם snapshot מלא (כולל groups)
        init(
          data.tables || [],
          data.guests || [],
          data.groups || [],        // 🔥 סנכרון קבוצות
          data.background ?? null,
          null                      // מבטל zoom/pan אצל מפיק
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
      {/* 🎧 מפיק – תצוגת צפייה בלבד */}
      <SeatingEditor
        background={null}
        readOnly
        showStats
      />
    </div>
  );
}
