"use client";

import { useState } from "react";
import { LiveSeatingProvider } from "./LiveSeatingProvider";
import SeatingMapLive from "./SeatingMapLive";
import GuestListLive from "./GuestListLive";
import { LiveSeatingState } from "./types";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [data, setData] = useState<LiveSeatingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      if (!res.ok) {
        throw new Error("ייבוא נכשל");
      }

      const json = await res.json();

      setData({
        guests: json.guests ?? [],
        tables: json.tables ?? [],
      });
    } catch (e) {
      setError("לא נמצאו נתוני הושבה ללקוח");
    } finally {
      setLoading(false);
    }
  }

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
