"use client";

import { useEffect, useState } from "react";
import GuestListLive from "./GuestListLive";

/* ✅ Viewer */
import LiveSeatingViewer from "@/app/events/production/_components/LiveSeating/LiveSeatingViewer";

/* Zustand */
import { useSeatingStore } from "@/store/seatingStore";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables); // ✅ קריטי

  /* =========================
     Mount logs
  ========================= */
  useEffect(() => {
    console.log("🟡 LiveSeatingTab mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  /* =========================
     Import seating snapshot
  ========================= */
  async function importData() {
    if (!invitationId) {
      setError("אין מזהה הזמנה – לא ניתן לייבא");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🟠 Importing live seating...");

      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      if (!res.ok) {
        throw new Error("Import failed");
      }

      const json = await res.json();

      console.log("🟢 Live seating snapshot:", json);

      // 🔥 מקור אמת יחיד
      init(
        json.tables ?? [],
        json.guests ?? [],
        json.background ?? null,
        json.canvasView ?? null
      );
    } catch (err) {
      console.error("❌ Live seating import error:", err);
      setError("לא נמצאו נתוני הושבה ללקוח");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Empty state
  ========================= */
  if (!tables.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="mb-4 text-gray-700">
          עדיין לא יובאה מפת הושבה ללייב
        </p>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <button
          onClick={importData}
          disabled={loading}
          className="px-5 py-2 bg-black text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>
    );
  }

  /* =========================
     Live view
  ========================= */
  return (
    <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">
      {/* 🗺️ מפת הושבה */}
      <div className="flex-1 relative">
        <LiveSeatingViewer />
      </div>

      {/* 👥 אורחים */}
      <div className="w-80 border-l bg-white">
        <GuestListLive />
      </div>
    </div>
  );
}
