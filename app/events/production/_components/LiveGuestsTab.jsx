"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddGuestModal from "@/app/components/AddGuestModal";

/* =========================
   Helpers
========================= */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

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

/* אישרו הגעה = רק מי ש-rsvp שלו yes */
function confirmedCountForGuest(g) {
  return g?.rsvp === "yes" ? Number(g.guestsCount || 0) : 0;
}

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const router = useRouter();

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [openAddModal, setOpenAddModal] = useState(false);

  const cacheKey = invitationId ? `live-guests-${invitationId}` : null;

  function saveCache(list) {
    if (!cacheKey) return;
    sessionStorage.setItem(cacheKey, JSON.stringify(list || []));
  }

  /* =========================
     Load cached guests on tab return
  ========================= */
  useEffect(() => {
    if (!cacheKey) return;

    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) setGuests(parsed);
    } catch {}
  }, [cacheKey]);

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
      saveCache(list);
    } catch (e) {
      console.error("❌ importGuests error:", e);
      setError("לא נמצאו אורחים להזמנה");
    } finally {
      setLoading(false);
    }
  }

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

      setGuests((prev) => {
        const next = prev.filter((g) => g._id !== guest._id);
        saveCache(next);
        return next;
      });
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
    setGuests((prev) => {
      const next = prev.map((g) =>
        g._id === updated._id ? { ...g, ...updated } : g
      );
      saveCache(next);
      return next;
    });
  }

  /* =========================
     ✅ הגיעו בפועל ליד כל אורח
     +1 / -1 על arrivedCount (מוגבל ל"אישרו")
     ✅ אין rollback אוטומטי (כדי שיעבוד בזמן אמת בלייב)
  ========================= */
  async function changeArrived(guest, delta) {
    const prevArrived = Number(guest.arrivedCount || 0);

    // ✅ אישרו הגעה בפועל (רק אם rsvp=yes)
    const confirmed = confirmedCountForGuest(guest);

    const nextArrived = clamp(prevArrived + delta, 0, Math.max(0, confirmed));
    if (nextArrived === prevArrived) return;

    // ✅ Optimistic UI (מתעדכן מייד)
    applyUpdatedGuest({ _id: guest._id, arrivedCount: nextArrived });

    try {
      await updateGuestOnServer(guest._id, { arrivedCount: nextArrived });
    } catch (e) {
      console.error("❌ arrivedCount update failed:", e);
      // ❗ אין rollback בלייב
    }
  }

  /* =========================
     ✅ Stats only (כרטיסיות יחידות)
     1) אישרו הגעה (לפי RSVP YES לפני הייבוא)
     2) הגיעו בפועל (מתעדכן בזמן אמת לפי arrivedCount)
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

  /* =========================
     BEFORE IMPORT
  ========================= */
  if (!guests.length) {
    return (
      <div className="p-6" dir="rtl">
        <p className="mb-4">עדיין לא יובאה רשימת אורחים ללייב</p>

        {error && <p className="text-red-600 mb-3">{error}</p>}

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
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Header actions */}
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
          title="רענון מהשרת"
        >
          🔄 רענון
        </button>
      </div>

      {/* ✅ Only two cards */}
      <div className="grid grid-cols-2 gap-4">
        <Stat title="אישרו הגעה" value={stats.confirmedTotal} />
        <Stat title="הגיעו בפועל" value={stats.arrivedTotal} color="green" />
      </div>

      {/* ✅ Live table with guest + confirmed + arrived realtime */}
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

              <th className="p-3 text-right">הערות</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {guests.map((g) => {
              const confirmed = confirmedCountForGuest(g);
              const arrived = Number(g.arrivedCount || 0);

              return (
                <tr key={g._id} className="border-t">
                  <td className="p-3">{g.name || "-"}</td>
                  <td className="p-3">{formatPhone(g.phone) || "-"}</td>
                  <td className="p-3">{(g.relation || "").trim() || "-"}</td>
                  <td className="p-3">{rsvpLabel(g.rsvp)}</td>

                  {/* ✅ כמה אישרו הגעה (מתוך RSVP לפני הייבוא) */}
                  <td className="p-3 font-semibold">{confirmed}</td>

                  {/* ✅ כמה הגיעו בפועל (מתעדכן בזמן אמת עם + / -) */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeArrived(g, -1)}
                        disabled={arrived <= 0}
                        className="w-8 h-8 rounded-full border border-gray-300 text-lg hover:bg-gray-50 transition disabled:opacity-30"
                        title="הפחת אחד שהגיע"
                      >
                        −
                      </button>

                      <div className="min-w-[90px] text-center leading-tight">
                        <div className="text-xs text-gray-500">הגיעו</div>
                        <div className="text-lg font-bold text-green-700">
                          {arrived}
                          <span className="text-gray-400 text-sm"> / {confirmed}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => changeArrived(g, +1)}
                        disabled={arrived >= confirmed}
                        className="w-8 h-8 rounded-full bg-green-600 text-white text-lg hover:bg-green-700 transition disabled:opacity-30"
                        title="הוסף אחד שהגיע"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  <td className="p-3 text-sm text-gray-700">
                    {(g.notes || "").trim() || "-"}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/messages?guestId=${g._id}`)
                        }
                        title="הודעות"
                      >
                        💬
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/seating?from=personal&guestId=${g._id}`
                          )
                        }
                        title="הושבה"
                      >
                        🪑
                      </button>

                      <button
                        onClick={() => deleteGuest(g)}
                        className="text-red-600"
                        title="מחיקה"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {guests.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  אין אורחים להצגה
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Add */}
      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={(newGuest) => {
            if (!newGuest) return;

            setGuests((prev) => {
              if (prev.some((x) => x._id === newGuest._id)) return prev;
              const next = [...prev, newGuest];
              saveCache(next);
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
  };

  return (
    <div className="border p-5 rounded-xl bg-white shadow-sm text-center">
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color] || ""}`}>{value}</div>
    </div>
  );
}
