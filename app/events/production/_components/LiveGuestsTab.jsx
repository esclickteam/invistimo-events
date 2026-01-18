"use client";

import { useEffect, useState } from "react";
import { LiveGuestsProvider } from "./LiveGuestsProvider";
import GuestListLive from "./GuestListLive";
import GuestStatsLive from "./GuestStatsLive";

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     Logs
  ========================= */
  useEffect(() => {
    console.log("🟡 LiveGuestsTab mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  async function importGuests() {
    console.log("🔵 importGuests clicked");
    console.log("🔵 using invitationId:", invitationId);

    if (!invitationId) {
      console.error("🔴 invitationId is missing!");
      setError("אין מזהה הזמנה – לא ניתן לייבא אורחים");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🔵 calling API...");
      const res = await fetch(
        `/api/live-guests/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      console.log("🟢 API response status:", res.status);

      const json = await res.json();
      console.log("🟢 API response JSON:", json);

      if (!res.ok) {
        throw new Error("ייבוא נכשל");
      }

      setData({
        guests: json.guests ?? [],
        stats: json.stats ?? {
          total: 0,
          arrived: 0,
          notArrived: 0,
          cancelled: 0,
        },
      });
    } catch (e) {
      console.error("🔴 import error:", e);
      setError("לא נמצאו נתוני אורחים להזמנה");
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
          עדיין לא יובאה רשימת אורחים ללייב
        </p>

        {error && (
          <p className="text-red-600 mb-3">{error}</p>
        )}

        <button
          onClick={importGuests}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded"
        >
          {loading ? "מייבא..." : "📥 ייבוא אורחים"}
        </button>
      </div>
    );
  }

  return (
    <LiveGuestsProvider initial={data}>
      <div className="flex flex-col h-[70vh] gap-4">
        <GuestStatsLive />
        <GuestListLive />
      </div>
    </LiveGuestsProvider>
  );
}
