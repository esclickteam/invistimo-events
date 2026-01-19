"use client";

import { useEffect, useState } from "react";
import { LiveSeatingProvider } from "./LiveSeatingProvider";
import GuestListLive from "./GuestListLive";
import { LiveSeatingState } from "./types";

/* 🎧 מפיק – ציור אחיד */
import SeatingCanvas from "@/app/dashboard/seating/SeatingCanvas";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [data, setData] = useState<LiveSeatingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =========================
     Mount
  ========================= */
  useEffect(() => {
    console.log("🟡 [LiveSeatingTab] mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  /* =========================
     Import seating snapshot
  ========================= */
  async function importData() {
    if (!invitationId) {
      console.warn("⚠️ [LiveSeatingTab] missing invitationId");
      setError("אין מזהה הזמנה");
      return;
    }

    console.log("📥 [LiveSeatingTab] import started");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      console.log("📡 [LiveSeatingTab] response status:", res.status);

      if (!res.ok) {
        throw new Error("Import failed");
      }

      const json = await res.json();

      console.log("✅ [LiveSeatingTab] raw snapshot:", json);
      console.log("🪑 tables:", json.tables?.length ?? 0);
      console.log("👥 guests:", json.guests?.length ?? 0);
      console.log("🗺️ canvasView:", json.canvasView ?? null);

      // ✅ snapshot אחד ויחיד
      setData({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
      });

      console.log("🟢 [LiveSeatingTab] snapshot stored in state");
    } catch (e) {
      console.error("❌ [LiveSeatingTab] import error:", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
      console.log("📥 [LiveSeatingTab] import finished");
    }
  }

  /* =========================
     Before import
  ========================= */
  if (!data) {
    console.log("ℹ️ [LiveSeatingTab] no data yet");

    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="mb-4">עדיין לא יובאה מפת הושבה</p>

        {error && (
          <p className="text-red-600 mb-2">
            {error}
          </p>
        )}

        <button
          onClick={importData}
          disabled={loading}
          className="px-5 py-2 bg-black text-white rounded-lg disabled:opacity-60"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>
    );
  }

  /* =========================
     Render – producer live view
  ========================= */
  console.log("🚀 [LiveSeatingTab] rendering live view", {
    tables: data.tables.length,
    guests: data.guests.length,
    canvasView: data.canvasView,
  });

  return (
    <LiveSeatingProvider initial={data}>
      <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">

        {/* 🗺️ מפת הושבה – viewer */}
        <div className="flex-1 relative">
          <SeatingCanvas
            mode="viewer"
            background={null}
            showStats
          />
        </div>

        {/* 👥 אורחים */}
        <div className="w-80 border-l bg-white">
          <GuestListLive />
        </div>
      </div>
    </LiveSeatingProvider>
  );
}
