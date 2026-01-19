"use client";

import { useEffect, useState } from "react";
import { LiveSeatingProvider } from "./LiveSeatingProvider";
import SeatingMapLive from "./SeatingMapLive";
import GuestListLive from "./GuestListLive";
import { LiveSeatingState } from "./types";

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
     Logs
  ========================= */
  useEffect(() => {
    console.log("🟡 LiveSeatingTab mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  /* =========================
     Import seating from client dashboard
  ========================= */
  async function importData() {
    if (!invitationId) {
      setError("אין מזהה הזמנה – לא ניתן לייבא");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      const json: LiveSeatingState = await res.json();

      if (!res.ok) {
        throw new Error("Import failed");
      }

      setData({
        guests: json.guests ?? [],
        tables: json.tables ?? [],
      });
    } catch (err) {
      console.error("❌ Live seating import error:", err);
      setError("לא נמצאו נתוני הושבה ללקוח");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Empty state – like LiveGuests
  ========================= */
  if (!data) {
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
          className="px-5 py-2 bg-black text-white rounded-lg flex items-center gap-2"
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
    <LiveSeatingProvider initial={data}>
      <div className="flex h-[70vh] border rounded-xl overflow-hidden">
        <div className="flex-1">
          <SeatingMapLive />
        </div>
        <div className="w-80 border-l bg-white">
          <GuestListLive />
        </div>
      </div>
    </LiveSeatingProvider>
  );
}
