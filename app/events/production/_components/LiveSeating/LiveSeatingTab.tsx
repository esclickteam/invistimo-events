"use client";

import { useEffect, useState } from "react";

/* UI */
import GuestListLive from "./GuestListLive";

/* ⭐ אותו Editor כמו אצל הלקוח */
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";

/* 🧠 Zustand – מקור אמת */
import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importSnapshot = useSeatingStore((s) => s.importSnapshot);
  const setZones = useZoneStore((s) => s.setZones);
  const background = useSeatingStore((s) => s.background);

  useEffect(() => {
    console.log("🟡 [Producer LiveSeatingTab] mounted", invitationId);
  }, [invitationId]);

  async function importData() {
    if (!invitationId) {
      setError("אין מזהה הזמנה");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Import failed");

      const json = await res.json();

      console.log("✅ Producer snapshot", {
        tables: json.tables?.length,
        zones: json.zones?.length,
        canvasView: json.canvasView,
      });

      /* 🔑 Zustand – אותו מקור אמת */
      importSnapshot({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
        background: json.background ?? null,
      });

      setZones(json.zones ?? []);
    } catch (e) {
      console.error("❌ Producer import error", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }

  if (loading || error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="mb-4">עדיין לא יובאה מפת הושבה</p>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <button
          onClick={importData}
          disabled={loading}
          className="px-6 py-2 bg-black text-white rounded-lg"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">
      
      {/* 🗺️ אותו Editor – readOnly */}
      <div className="flex-1 relative">
        <SeatingEditor
          background={background?.url || null}
          readOnly   // ⭐ זה ההבדל היחיד מהלקוח
        />
      </div>

      {/* 👥 אורחים */}
      <div className="w-80 border-l bg-white">
        <GuestListLive />
      </div>
    </div>
  );
}
