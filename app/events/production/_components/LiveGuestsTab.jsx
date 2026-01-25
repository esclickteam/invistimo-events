"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddGuestModal from "@/app/components/AddGuestModal";
import { useSeatingStore } from "@/store/seatingStore";


/* =========================
   Helpers
========================= */
function formatPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9 && digits.startsWith("5")) return "0" + digits;
  return digits;
}

function rsvpLabel(rsvp) {
  const map = { yes: "מגיע", pending: "ממתין", no: "לא מגיע" };
  return map[rsvp] || rsvp || "-";
}

/* אישרו הגעה = מי שסימן מגיע (RSVP YES) — לא נוגעים בזה בלייב */
function confirmedCountForGuest(g) {
  return g?.rsvp === "yes" ? Number(g.guestsCount || 0) : 0;
}

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tables = useSeatingStore((s) => s.tables);

  const guests = useSeatingStore((s) => s.guests);
  const setGuests = useSeatingStore((s) => s.setGuests);

  const updateGuestArrived = useSeatingStore((s) => s.updateGuestArrived);
  const syncArrivedSeats = useSeatingStore((s) => s.syncArrivedSeats);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [editGuest, setEditGuest] = useState(null);

  // 🔴 ADD: חיפוש לייב
  const [search, setSearch] = useState("");

  /* =========================
     Delete guest
  ========================= */
  async function deleteGuest(guest) {
    const ok = window.confirm(`האם למחוק את המוזמן "${guest.name}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data?.success) throw new Error("Delete failed");

      const current = useSeatingStore.getState().guests;
      const next = current.filter((g) => g._id !== guest._id);
      setGuests(next);
    } catch (e) {
      console.error("❌ deleteGuest error:", e);
      alert("❌ שגיאה במחיקת מוזמן");
    }
  }

  /* =========================
     Update guest (PATCH, fallback PUT)
  ========================= */
  async function updateGuestOnServer(guestId, payload) {
    let res = await fetch(`/api/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 405) {
      res = await fetch(`/api/guests/${guestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Update failed");
    }

    return data.guest || payload;
  }

  function applyUpdatedGuest(updated) {
    const current = useSeatingStore.getState().guests;
    const next = current.map((g) =>
      g._id === updated._id ? { ...g, ...updated } : g
    );
    setGuests(next);
  }

  /* =========================
     הגיעו בפועל
  ========================= */
  async function changeArrived(guest, delta) {
    const prevArrived = Number(guest.arrivedCount || 0);
    const nextArrived = Math.max(0, prevArrived + delta);
    if (nextArrived === prevArrived) return;

    applyUpdatedGuest({ _id: guest._id, arrivedCount: nextArrived });
    updateGuestArrived(guest._id, nextArrived);
    syncArrivedSeats(guest._id, nextArrived);

    try {
      await fetch("/api/live-guests/arrived", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationGuestId: guest._id,
          arrivedCount: nextArrived,
        }),
      });
    } catch (e) {
      console.error("❌ arrivedCount update failed:", e);
    }
  }

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    const confirmedTotal = guests.reduce(
      (s, g) => s + confirmedCountForGuest(g),
      0
    );

    const arrivedTotal = guests.reduce(
      (s, g) => s + Number(g.arrivedCount || 0),
      0
    );

    return { confirmedTotal, arrivedTotal };
  }, [guests]);

  const guestTableMap = useMemo(() => {
    const map = new Map();
    (tables || []).forEach((table) => {
      table.seatedGuests?.forEach((sg) => {
        if (sg?.guestId) {
          map.set(String(sg.guestId), table);
        }
      });
    });
    return map;
  }, [tables]);

  if (!guests.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        עדיין אין אורחים לאירוע
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 pb-24" dir="rtl">

      {/* cards */}
      <div className="grid grid-cols-2 gap-4">
        <Stat title="אישרו הגעה" value={stats.confirmedTotal} />
        <Stat title="הגיעו בפועל" value={stats.arrivedTotal} color="green" />
      </div>

      {/* 🔴 ADD: חיפוש */}
      <input
        type="text"
        placeholder="חיפוש לפי שם או טלפון"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-80 border rounded-lg px-3 py-2"
      />

      {/* table */}
      <div className="w-full overflow-x-auto bg-white border rounded-xl">
        <table className="min-w-[1100px] w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-right">שם</th>
              <th className="p-3 text-right">טלפון</th>
              <th className="p-3 text-right">קרבה</th>
              <th className="p-3 text-right">סטטוס</th>
              <th className="p-3 text-right">אישרו הגעה</th>
              <th className="p-3 text-right">הגיעו בפועל</th>
              <th className="p-3 text-right">מס' שולחן</th>
              <th className="p-3 text-right">הערות</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {guests
              // 🔴 ADD: פילטור חיפוש בלבד
              .filter((g) => {
                if (!search.trim()) return true;
                return (
                  g.name?.includes(search) ||
                  g.phone?.includes(search)
                );
              })
              .map((g) => {
                const confirmed = confirmedCountForGuest(g);
                const arrived = Number(g.arrivedCount || 0);
                const tableFromStore =
                  guestTableMap.get(String(g._id)) || null;

                const tableLabel =
                  g.tableName ||
                  tableFromStore?.name ||
                  (tableFromStore?.number != null
                    ? `שולחן ${tableFromStore.number}`
                    : "-");

                return (
                  <tr key={g._id} className="border-t">
                    <td className="p-3">{g.name || "-"}</td>
                    <td className="p-3">{formatPhone(g.phone) || "-"}</td>
                    <td className="p-3">{(g.relation || "").trim() || "-"}</td>
                    <td className="p-3">{rsvpLabel(g.rsvp)}</td>
                    <td className="p-3 font-semibold">{confirmed}</td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeArrived(g, -1)}
                          disabled={arrived <= 0}
                          className="w-8 h-8 rounded-full border"
                        >
                          −
                        </button>
                        <div className="font-bold text-green-700">
                          {arrived}
                        </div>
                        <button
                          onClick={() => changeArrived(g, +1)}
                          className="w-8 h-8 rounded-full bg-green-600 text-white"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="p-3 text-green-700 font-medium">
                      {tableLabel}
                    </td>

                    <td className="p-3">{g.notes || "-"}</td>

                    <td className="p-3 flex gap-3">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/messages?guestId=${g._id}`)
                        }
                      >
                        💬
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/events/production?tab=live-seating&focusGuestId=${g._id}`
                          )
                        }
                      >
                        🪑
                      </button>
                      <button onClick={() => setEditGuest(g)}>✏️</button>
                      <button
                        onClick={() => deleteGuest(g)}
                        className="text-red-600"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* UI helpers unchanged */
function Field({ label, children, full }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Stat({ title, value, color }) {
  const colors = { green: "text-green-600" };
  return (
    <div className="border p-5 rounded-xl bg-white shadow-sm text-center">
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color] || ""}`}>
        {value}
      </div>
    </div>
  );
}
