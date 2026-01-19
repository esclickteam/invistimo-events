"use client";

import { useEffect, useMemo, useState } from "react";
import GuestsTable from "@/app/components/GuestsTable";
import AddGuestModal from "@/app/components/AddGuestModal";

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openAddModal, setOpenAddModal] = useState(false);

  /* =========================
     Load cached guests on tab return
  ========================= */
  useEffect(() => {
    if (!invitationId) return;

    const cached = sessionStorage.getItem(
      `live-guests-${invitationId}`
    );
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) setGuests(parsed);
    } catch {}
  }, [invitationId]);

  /* =========================
     Import guests
  ========================= */
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

      const list = json.guests || [];
      setGuests(list);

      sessionStorage.setItem(
        `live-guests-${invitationId}`,
        JSON.stringify(list)
      );
    } catch (e) {
      console.error("❌ importGuests error:", e);
      setError("לא נמצאו אורחים להזמנה");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    return {
      totalInvited: guests.reduce(
        (s, g) => s + (g.guestsCount || 0),
        0
      ),
      arrived: guests.reduce(
        (s, g) => s + (g.arrivedCount || 0),
        0
      ),
      no: guests.filter((g) => g.rsvp === "no").length,
      pending: guests.filter((g) => g.rsvp === "pending").length,
    };
  }, [guests]);

  /* =========================
     BEFORE IMPORT
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
          className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
        >
          {loading ? "מייבא..." : "📥 ייבוא אורחים"}
        </button>
      </div>
    );
  }

  /* =========================
     AFTER IMPORT
  ========================= */
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setOpenAddModal(true)}
          className="px-4 py-2 bg-black text-white rounded"
        >
          + הוספת מוזמן
        </button>

        <button
          onClick={importGuests}
          disabled={loading}
          className="px-4 py-2 border rounded disabled:opacity-60"
        >
          🔄 רענון
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="סה״כ מוזמנים" value={stats.totalInvited} />
        <Stat title="הגיעו" value={stats.arrived} color="green" />
        <Stat title="לא מגיעים" value={stats.no} color="red" />
        <Stat title="ממתינים" value={stats.pending} color="orange" />
      </div>

      <GuestsTable
        guests={guests}
        isDemo={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onMessage={() => {}}
        onSeat={() => {}}
      />

      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={(newGuest) => {
            if (!newGuest) return;

            setGuests((prev) => {
              if (prev.some((g) => g._id === newGuest._id)) {
                return prev;
              }
              const next = [...prev, newGuest];
              sessionStorage.setItem(
                `live-guests-${invitationId}`,
                JSON.stringify(next)
              );
              return next;
            });

            setOpenAddModal(false);
          }}
        />
      )}
    </div>
  );
}

/* =========================
   UI helper
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
