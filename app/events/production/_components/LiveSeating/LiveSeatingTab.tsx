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
  // ✅ TS יודע שזה או state תקין או null
  const [data, setData] = useState<LiveSeatingState | null>(null);

  // ✅ boolean ברור
  const [loading, setLoading] = useState<boolean>(false);

  // ✅ error יכול להיות string או null
  const [error, setError] = useState<string | null>(null);

  /* =========================
     Logs
  ========================= */
  useEffect(() => {
    console.log("🟡 LiveSeatingTab mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  async function importData() {
    console.log("🔵 importData clicked");
    console.log("🔵 using invitationId:", invitationId);

    if (!invitationId) {
      console.error("🔴 invitationId is missing!");
      setError("אין מזהה הזמנה – לא ניתן לייבא");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🔵 calling API...");
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      console.log("🟢 API response status:", res.status);

      const json: LiveSeatingState = await res.json();
      console.log("🟢 API response JSON:", json);

      if (!res.ok) {
        throw new Error("ייבוא נכשל");
      }

      // ✅ TS יודע שזה LiveSeatingState
      setData({
        guests: json.guests ?? [],
        tables: json.tables ?? [],
      });
    } catch (e) {
      console.error("🔴 import error:", e);
      setError("לא נמצאו נתוני הושבה ללקוח");
    } finally {
      setLoading(false);
      console.log("🟡 import finished");
    }
  }

  useEffect(() => {
    console.log("🟣 data state changed:", data);
  }, [data]);

  /* =========================
     UI
  ========================= */
  if (!data) {
    return (
      <div className="p-6">
        <p className="mb-4">
          עדיין לא יובאה מפת הושבה ליום האירוע
        </p>

        {error && (
          <p className="text-red-600 mb-3">{error}</p>
        )}

        <button
          onClick={importData}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded"
        >
          {loading ? "מייבא..." : "📥 ייבוא מוזמנים + הושבה"}
        </button>
      </div>
    );
  }

  return (
    <LiveSeatingProvider initial={data}>
      <div className="flex h-[70vh]">
        <SeatingMapLive />
        <GuestListLive />
      </div>
    </LiveSeatingProvider>
  );
}
