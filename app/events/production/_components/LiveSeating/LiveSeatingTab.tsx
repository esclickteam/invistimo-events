"use client";

import { useEffect, useState } from "react";

/* TYPES */
import { LiveSeatingState } from "./types";

/* UI */
import GuestListLive from "./GuestListLive";

/* 🎧 אותו קנבס בדיוק של הלקוח */
import SeatingCanvas from "@/app/components/seating/SeatingCanvas";

/* 🧠 Zustand – מקור אמת */
import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [imported, setImported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importSnapshot = useSeatingStore((s) => s.importSnapshot);
  const setZones = useZoneStore((s) => s.setZones);

  /* =========================
     Import seating snapshot (ONCE)
  ========================= */
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

      if (!res.ok) {
        throw new Error("Import failed");
      }

      const json = await res.json();

      console.log("✅ [LiveSeatingTab] snapshot", {
        tables: json.tables?.length ?? 0,
        guests: json.guests?.length ?? 0,
        canvasView: json.canvasView ?? null,
      });

      /* 🔑 מקור אמת – seatingStore */
      importSnapshot({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        background: json.background ?? null,
        canvasView: json.canvasView ?? null,
      });

      /* 🔑 zones */
      setZones(json.zones ?? []);

      setImported(true);
    } catch (e) {
      console.error("❌ import error", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Empty / before import
  ========================= */
  if (!imported) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="mb-4">עדיין לא יובאה מפת הושבה</p>

        {error && (
          <p className="text-red-600 mb-3">{error}</p>
        )}

        <button
          onClick={importData}
          disabled={loading}
          className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-60"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>
    );
  }

  /* =========================
     Render – producer viewer (READ ONLY)
  ========================= */
  return (
    <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">
      {/* 🗺️ מפת הושבה – Viewer בלבד */}
      <div className="flex-1 relative">
        <SeatingCanvas
          mode="viewer"       // ❗️אין edit, אין שינוי canvasView
          background={null}   // מגיע מה־store
          showStats
        />
      </div>

      {/* 👥 רשימת מוזמנים */}
      <div className="w-80 border-l bg-white">
        <GuestListLive />
      </div>
    </div>
  );
}
