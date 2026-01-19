"use client";

import { useMemo, useState } from "react";
import GuestsTable from "@/app/components/GuestsTable";
import AddGuestModal from "@/app/dashboard/components/AddGuestModal";

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [openAddModal, setOpenAddModal] = useState(false);

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
      if (!res.ok) throw new Error("Import failed");

      setGuests(json.guests || []);
    } catch (e) {
      console.error("❌ importGuests error:", e);
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

  /* =========================
     BEFORE IMPORT UI
  ========================= */
  if (!guests.length) {
    return (
      <div className="p-6">
        <p className="mb-4">עדיין לא יובאה רשימת אורחים ללייב</p>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={importGuests}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
          >
            {loading ? "מייבא..." : "📥 ייבוא אורחים"}
          </button>

          {/* ✅ כפתור הוספת מוזמן גם לפני ייבוא */}
          <button
            onClick={() => setOpenAddModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            + הוספת מוזמן
          </button>
        </div>

        {openAddModal && (
          <AddGuestModal
            invitationId={invitationId}
            onClose={() => setOpenAddModal(false)}
            onSuccess={(newGuest) => {
              // ✅ כמו לקוח: מוסיפים מיידית בלי רענון
              if (newGuest) {
                setGuests((prev) => {
                  if (prev.some((g) => g._id === newGuest._id)) return prev;
                  return [...prev, newGuest];
                });
              }
              setOpenAddModal(false);
            }}
          />
        )}
      </div>
    );
  }

  /* =========================
     AFTER IMPORT UI
  ========================= */
  return (
    <div className="flex flex-col gap-6">
      {/* Header actions */}
      <div className="flex items-center justify-end gap-3">
        {error && <span className="text-sm text-red-600 ml-auto">{error}</span>}

        <button
          onClick={() => setOpenAddModal(true)}
          className="px-4 py-2 bg-black text-white rounded"
        >
          + הוספת מוזמן
        </button>

        <button
          onClick={importGuests}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 rounded disabled:opacity-60"
          title="ריענון ידני מהשרת"
        >
          {loading ? "מייבא..." : "🔄 רענון אורחים"}
        </button>
      </div>

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

      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={(newGuest) => {
            if (newGuest) {
              setGuests((prev) => {
                if (prev.some((g) => g._id === newGuest._id)) return prev;
                return [...prev, newGuest];
              });
            }
            setOpenAddModal(false);
          }}
        />
      )}
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
