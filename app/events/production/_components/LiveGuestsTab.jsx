"use client";

import { useEffect, useState } from "react";
import { LiveGuestsProvider } from "./LiveGuestsProvider";
import GuestListLive from "./GuestListLive";
import GuestStatsLive from "./GuestStatsLive";

/* =========================
   Component – Soft Control
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* =========================
     Load guests (always)
  ========================= */
  useEffect(() => {
    if (!invitationId) return;

    let active = true;

    async function loadGuests() {
      try {
        setLoading(true);
        setError(null);

        // 🔁 API שמחזיר את האורחים האמיתיים (InvitationGuest)
        const res = await fetch(
          `/api/guests/by-invitation?invitationId=${invitationId}`
        );

        if (!res.ok) {
          throw new Error("failed to load guests");
        }

        const json = await res.json();

        if (!active) return;

        const guests = json.guests || [];

        setData({
          guests,
          stats: {
            total: guests.length,
            arrived: guests.filter((g) => g.arrivalStatus === "arrived").length,
            notArrived: guests.filter(
              (g) => !g.arrivalStatus || g.arrivalStatus === "not-arrived"
            ).length,
            cancelled: guests.filter(
              (g) => g.arrivalStatus === "cancelled"
            ).length,
          },
        });
      } catch (e) {
        console.error("❌ load guests error:", e);
        if (active) setError("לא ניתן לטעון אורחים");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGuests();

    // ניקוי
    return () => {
      active = false;
    };
  }, [invitationId]);

  /* =========================
     UI
  ========================= */
  if (loading) {
    return <div className="p-6">טוען אורחים…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-gray-500">
        אין נתוני אורחים
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
