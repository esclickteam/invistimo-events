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
  const tables = useSeatingStore((s) => s.tables);

  /* =========================
     Mount logs
  ========================= */
  useEffect(() => {
    console.log("🟡 LiveSeatingTab mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  /* =========================
     Auto import on first load
  ========================= */
  useEffect(() => {
    if (!invitationId) return;
    if (tables.length > 0) return; // כבר נטען

    importData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // 🔥 מקור אמת יחיד – ה־store
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
     UI
  ========================= */
  return (
    <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">
      {/* 🗺️ מפת הושבה */}
      <div className="flex-1 relative">
        <LiveSeatingViewer />

        {/* Empty overlay */}
        {!tables.length && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="mb-4 text-gray-700">
              עדיין לא יובאה מפת הושבה ללייב
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span>מייבא הושבה…</span>
          </div>
        )}
      </div>

      {/* 👥 אורחים */}
      <div className="w-80 border-l bg-white">
        <GuestListLive />
      </div>
    </div>
  );
}
