"use client";

import { useEffect, useMemo, useState } from "react";
import GuestsTable from "@/app/components/GuestsTable";

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function importGuests() {
    if (!invitationId) {
      setError("אין מזהה הזמנה");
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
      if (!res.ok) throw new Error();

      setGuests(json.guests || []);
    } catch {
      setError("לא נמצאו אורחים להזמנה");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Stats – בדיוק כמו בדשבורד
  ========================= */
  const stats = useMemo(() => {
    const totalInvited = guests.reduce(
      (s, g) => s + (g.guestsCount || 0),
      0
    );
    const arrived = guests.reduce(
      (s, g) => s + (g.arrivedCount || 0),
      0
    );

    return {
      totalInvited,
      arrived,
      no: guests.filter((g) => g.rsvp === "no").length,
      pending: guests.filter((g) => g.rsvp === "pending").length,
    };
  }, [guests]);

  if (!guests.length) {
    return (
      <div className="p-6">
        <p className="mb-4">עדיין לא יובאה רשימת אורחים ללייב</p>

        {error && <p className="text-red-600 mb-3">{error}</p>}

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
    <div className="flex flex-col gap-6">
      {/* סטטיסטיקות */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="סה״כ מוזמנים" value={stats.totalInvited} />
        <Stat title="הגיעו" value={stats.arrived} color="green" />
        <Stat title="לא מגיעים" value={stats.no} color="red" />
        <Stat title="ממתינים" value={stats.pending} color="orange" />
      </div>

      {/* טבלה זהה לדשבורד */}
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

/* =========================
   UI helpers
========================= */
function Stat({ title, value, color }) {
  const colors = {
    green: "text-green-600",
    red: "text-red-600",
    orange: "text-orange-500",
  };

  return (
    <div className="border p-4 rounded-xl bg-white text-center">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className={`text-2xl font-bold ${colors[color] || ""}`}>
        {value}
      </div>
    </div>
  );
}
