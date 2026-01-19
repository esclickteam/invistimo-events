"use client";

import { useEffect, useState } from "react";
import { LiveSeatingProvider } from "./LiveSeatingProvider";
import GuestListLive from "./GuestListLive";
import { LiveSeatingState } from "./types";

/* ✅ Viewer – ציור בלבד */
import LiveSeatingViewer from "@/app/events/production/_components/LiveSeating/LiveSeatingViewer";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [data, setData] = useState<LiveSeatingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🟡 LiveSeatingTab mounted", invitationId);
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

      // ✅ snapshot אחד ויחיד
      setData({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
      });
    } catch (e) {
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }

  /* לפני ייבוא */
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="mb-4">עדיין לא יובאה מפת הושבה</p>

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <button
          onClick={importData}
          disabled={loading}
          className="px-5 py-2 bg-black text-white rounded-lg"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>
    );
  }

  /* תצוגה חיה */
  return (
    <LiveSeatingProvider initial={data}>
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
    </LiveSeatingProvider>
  );
}
