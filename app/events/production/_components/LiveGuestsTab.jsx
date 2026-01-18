"use client";

import { useEffect, useState } from "react";
import GuestsTable from "@/app/components/GuestsTable";
import GuestStatsLive from "./GuestStatsLive";

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     Logs
  ========================= */
  useEffect(() => {
    console.log("🟡 LiveGuestsTab mounted");
    console.log("🟡 invitationId:", invitationId);
  }, [invitationId]);

  /* =========================
     Import guests
  ========================= */
  async function importGuests() {
    if (!invitationId) {
      setError("אין מזהה הזמנה – לא ניתן לייבא אורחים");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-guests/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error("ייבוא נכשל");
      }

      setGuests(json.guests || []);
    } catch (e) {
      console.error("🔴 import error:", e);
      setError("לא נמצאו נתוני אורחים להזמנה");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     UI – before import
  ========================= */
  if (!guests.length) {
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

  /* =========================
     UI – after import
  ========================= */
  return (
    <div className="flex flex-col h-[70vh] gap-4">
      <GuestStatsLive />

      <GuestsTable
        guests={guests}
        isDemo={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onMessage={() => {}}
        onSeat={() => {}}
      />
    </div>
  );
}
