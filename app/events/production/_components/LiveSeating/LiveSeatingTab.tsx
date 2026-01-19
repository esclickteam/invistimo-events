"use client";

import { useEffect, useState } from "react";
import { LiveSeatingProvider } from "./LiveSeatingProvider";
import GuestListLive from "./GuestListLive";
import { LiveSeatingState } from "./types";

/* ✅ Viewer */
import LiveSeatingViewer from "@/app/events/production/_components/LiveSeating/LiveSeatingViewer";

/* =========================
   Types
========================= */
type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [data, setData] = useState<LiveSeatingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      console.warn("⚠️ No invitationId – abort import");
      setError("אין מזהה הזמנה – לא ניתן לייבא");
      return;
    }

    console.log("📥 Import started", { invitationId });
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      console.log("📡 Import response status:", res.status);

      if (!res.ok) {
        throw new Error("Import failed");
      }

      const json: LiveSeatingState = await res.json();

      console.log("✅ Import raw payload:", json);
      console.log("📊 tables:", json.tables?.length);
      console.log("👥 guests:", json.guests?.length);
      console.log("🗺️ canvasView:", (json as any).canvasView);

      setData({
        guests: json.guests ?? [],
        tables: json.tables ?? [],
        // ⚠️ intentionally not mutating structure – just logging
        ...(json as any).canvasView && {
          canvasView: (json as any).canvasView,
        },
      });

      console.log("🟢 LiveSeatingTab data set");
    } catch (err) {
      console.error("❌ Live seating import error:", err);
      setError("לא נמצאו נתוני הושבה ללקוח");
    } finally {
      setLoading(false);
      console.log("📥 Import finished");
    }
  }

  /* =========================
     Empty state – before import
  ========================= */
  if (!data) {
    console.log("ℹ️ LiveSeatingTab: no data yet");

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="mb-4 text-gray-700">
          עדיין לא יובאה מפת הושבה ללייב
        </p>

        {error && (
          <p className="text-red-600 mb-3">{error}</p>
        )}

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
     Before provider render
  ========================= */
  console.log("🚀 Rendering LiveSeatingProvider with snapshot:", {
    tables: data.tables?.length,
    guests: data.guests?.length,
    canvasView: (data as any).canvasView,
  });

  /* =========================
     Live view – REAL UX
  ========================= */
  return (
    <LiveSeatingProvider initial={data}>
      <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">

        {/* 🗺️ מפת הושבה */}
        <div className="flex-1 relative">
          <LiveSeatingViewer invitationId={invitationId} />
        </div>

        {/* 👥 רשימת אורחים */}
        <div className="w-80 border-l bg-white">
          <GuestListLive />
        </div>
      </div>
    </LiveSeatingProvider>
  );
}
