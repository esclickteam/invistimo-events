"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuestsTable from "@/app/components/GuestsTable";
import AddGuestModal from "@/app/components/AddGuestModal";

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const router = useRouter();

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [openAddModal, setOpenAddModal] = useState(false);

  // ✅ מודאל עריכה פנימי (בלי import)
  const [editGuest, setEditGuest] = useState(null);

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
    // נסיון PATCH
    let res = await fetch(`/api/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // אם השרת לא תומך PATCH
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

    // אם השרת מחזיר guest מעודכן – ניקח אותו
    return data.guest || payload;
  }

  function applyUpdatedGuest(updated) {
    setGuests((prev) => {
      const next = prev.map((g) => (g._id === updated._id ? { ...g, ...updated } : g));
      saveCache(next);
      return next;
    });
  }

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    return {
      totalInvited: guests.reduce((s, g) => s + (g.guestsCount || 0), 0),
      arrived: guests.reduce((s, g) => s + (g.arrivedCount || 0), 0),
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
          title="רענון מהשרת"
        >
          🔄 רענון
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title='סה״כ מוזמנים' value={stats.totalInvited} />
        <Stat title="הגיעו" value={stats.arrived} color="green" />
        <Stat title="לא מגיעים" value={stats.no} color="red" />
        <Stat title="ממתינים" value={stats.pending} color="orange" />
      </div>

      <GuestsTable
        guests={guests}
        isDemo={false}
        onEdit={(g) => setEditGuest(g)}          // ✅ עכשיו העריכה תפתח מודאל
        onDelete={(g) => deleteGuest(g)}
        onMessage={(g) => router.push(`/dashboard/messages?guestId=${g._id}`)}
        onSeat={(g) => router.push(`/dashboard/seating?from=personal&guestId=${g._id}`)}
      />

      {/* ✅ Add */}
      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={(newGuest) => {
            if (!newGuest) return;

            setGuests((prev) => {
              if (prev.some((g) => g._id === newGuest._id)) return prev;
              const next = [...prev, newGuest];
              saveCache(next);
              return next;
            });

            setOpenAddModal(false);
          }}
        />
      )}

      {/* ✅ Edit (inline modal) */}
      {editGuest && (
        <InlineEditGuestModal
          guest={editGuest}
          onClose={() => setEditGuest(null)}
          onSave={async (payload) => {
            try {
              const updated = await updateGuestOnServer(editGuest._id, payload);
              applyUpdatedGuest({ ...editGuest, ...updated, _id: editGuest._id });
              setEditGuest(null);
            } catch (e) {
              console.error("❌ updateGuest error:", e);
              alert("❌ שגיאה בעריכת מוזמן");
            }
          }}
        />
      )}
    </div>
  );
}

/* =========================
   Inline Edit Modal (no imports)
========================= */
function InlineEditGuestModal({ guest, onClose, onSave }) {
  const [name, setName] = useState(guest?.name || "");
  const [phone, setPhone] = useState(guest?.phone || "");
  const [relation, setRelation] = useState(guest?.relation || "");
  const [notes, setNotes] = useState(guest?.notes || "");
  const [guestsCount, setGuestsCount] = useState(Number(guest?.guestsCount || 1));
  const [rsvp, setRsvp] = useState(guest?.rsvp || "pending");

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        _id: guest._id,
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim(),
        notes: notes.trim(),
        guestsCount: Math.max(1, Number(guestsCount || 1)),
        rsvp,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold text-lg">✏️ עריכת מוזמן</div>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="שם מלא">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="שם מלא"
            />
          </Field>

          <Field label="טלפון">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="05XXXXXXXX"
            />
          </Field>

          <Field label="קרבה">
            <input
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="משפחה / חברים / עבודה..."
            />
          </Field>

          <Field label="מוזמנים">
            <input
              type="number"
              min={1}
              value={guestsCount}
              onChange={(e) => setGuestsCount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </Field>

          <Field label="סטטוס">
            <select
              value={rsvp}
              onChange={(e) => setRsvp(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="yes">מגיע</option>
              <option value="pending">בהמתנה</option>
              <option value="no">לא מגיע</option>
            </select>
          </Field>

          <Field label="הערות" full>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
              placeholder="הערות..."
            />
          </Field>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border"
            disabled={saving}
          >
            ביטול
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
            disabled={saving || !name.trim()}
          >
            {saving ? "שומר..." : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
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
      <div className={`text-2xl font-bold ${colors[color] || ""}`}>{value}</div>
    </div>
  );
}
