"use client";

import { useEffect, useState } from "react";

/* Provider + types */
import { LiveSeatingProvider } from "./LiveSeatingProvider";
import { LiveSeatingState } from "./types";

/* UI */
import GuestListLive from "./GuestListLive";

/* 🎧 קנבס זהה ללקוח */
import SeatingCanvas from "@/app/dashboard/seating/SeatingCanvas";

/* 🧠 Zustand – מקור אמת */
import { useSeatingStore } from "@/store/seatingStore";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [data, setData] = useState<LiveSeatingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 🔑 הכנסת snapshot ל־store הראשי */
  const importSnapshot = useSeatingStore((s) => s.importSnapshot);

  /* =========================
     Mount log
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
      console.warn("⚠️ missing invitationId");
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

      console.log("✅ snapshot received", {
        tables: json.tables?.length ?? 0,
        guests: json.guests?.length ?? 0,
        canvasView: json.canvasView ?? null,
      });

      const snapshot: LiveSeatingState = {
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
      };

      /* 🧠 מקור אמת – seatingStore */
      importSnapshot({
        tables: snapshot.tables,
        guests: snapshot.guests,
        canvasView:
  snapshot.canvasView &&
  snapshot.canvasView.scale != null
    ? snapshot.canvasView
    : null,

        background: json.background ?? null,
      });

      /* 🪟 Provider (לא חובה אבל משאיר מבנה קיים) */
      setData(snapshot);
    } catch (e) {
      console.error("❌ import error", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Before import
  ========================= */
  if (!data) {
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
     Render – producer viewer
  ========================= */
  return (
    <LiveSeatingProvider initial={data}>
      <div className="flex flex-row-reverse h-[70vh] border rounded-xl overflow-hidden bg-[#faf8f4]">

        {/* 🗺️ מפת הושבה – Viewer בלבד */}
        <div className="flex-1 relative">
          <SeatingCanvas
            mode="viewer"   // ❗ אין scale, אין edit
            background={null}
            showStats
          />
        </div>

        {/* 👥 רשימת מוזמנים */}
        <div className="w-80 border-l bg-white">
          <GuestListLive />
        </div>

      </div>
    </LiveSeatingProvider>
  );
}
