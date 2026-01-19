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
  const [hasImported, setHasImported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importSnapshot = useSeatingStore((s) => s.importSnapshot);
  const background = useSeatingStore((s) => s.background);
  const setZones = useZoneStore((s) => s.setZones);

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

      console.log("✅ Producer snapshot imported", {
        tables: json.tables?.length ?? 0,
        guests: json.guests?.length ?? 0,
        zones: json.zones?.length ?? 0,
        canvasView: json.canvasView ?? null,
      });

      /* 🔑 מקור אמת – seatingStore */
      importSnapshot({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
        background: json.background ?? null,
      });

      /* 🧭 zones */
      setZones(json.zones ?? []);

      setHasImported(true);
    } catch (e) {
      console.error("❌ Producer import error", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border rounded-xl overflow-hidden bg-[#faf8f4]">


      {/* 🔘 HEADER – כפתור ייבוא תמידי */}
      <div className="flex items-center justify-end gap-3 p-3 border-b bg-white">
        {error && (
          <span className="text-sm text-red-600 ml-auto">
            {error}
          </span>
        )}

        <button
          onClick={importData}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>

      {/* 🗺️ CONTENT */}
      <div className="flex flex-row-reverse flex-1 overflow-hidden">

        {/* 🗺️ מפת הושבה – Viewer */}
        <div className="flex-1 relative">
          {!hasImported ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              טרם יובאה מפת הושבה
            </div>
          ) : (
            <SeatingEditor
              background={background?.url || null}
              readOnly   // ⭐ ההבדל היחיד מהלקוח
              showStats  // אם את רוצה לראות 1/12 וכו'
            />
          )}
        </div>

        {/* 👥 אורחים */}
        <div className="w-80 border-l bg-white">
          <GuestListLive />
        </div>
      </div>
    </div>
  );
}
