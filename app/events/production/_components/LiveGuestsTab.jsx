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



  const [loading, setLoading] = useState(true);




  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  


  const guests = useSeatingStore((s) => s.guests);
const setGuests = useSeatingStore((s) => s.setGuests);

const tables = useSeatingStore((s) => s.tables);

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


  useEffect(() => {
  if (!invitationId) return;

  async function loadGuestsForLive() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/guests?invitation=${invitationId}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (Array.isArray(data.guests)) {
  const liveGuests = data.guests.map(g => ({
    ...g,
    arrivedCount: 0, // 🔥 לייב מתחיל תמיד מ־0
  }));

  setGuests(liveGuests);
}



    } catch (e) {
      console.error("❌ Live guests load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  loadGuestsForLive();
}, [invitationId, setGuests]);



const updateGuestArrived = useSeatingStore((s) => s.updateGuestArrived);
const syncArrivedSeats = useSeatingStore((s) => s.syncArrivedSeats);




  const [openAddModal, setOpenAddModal] = useState(false);

  // ✅ עריכה חוזרת (מודאל פנימי)
  const [editGuest, setEditGuest] = useState(null);



  

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

  const next = current.map(g =>
    g._id === updated._id ? { ...g, ...updated } : g
  );

  setGuests(next);
}

  /* =========================
     ✅ הגיעו בפועל ליד כל אורח
     +1 / -1 על arrivedCount
     ✅ לא מוגבל לאישרו הגעה (כי גם מי שסימן לא מגיע יכול להגיע)
     ✅ מינימום 0
     ✅ אין rollback בלייב
  ========================= */
  async function changeArrived(guest, delta) {
  const prevArrived = Number(guest.arrivedCount || 0);
  const nextArrived = Math.max(0, prevArrived + delta);
  if (nextArrived === prevArrived) return;

  // ✅ UI מקומי
  applyUpdatedGuest({ _id: guest._id, arrivedCount: nextArrived });

  // ✅ עדכון אורח
  updateGuestArrived(guest._id, nextArrived);

  // 🔥🔥🔥 זה מה שצובע את הכיסאות
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
   ✅ Stats (לייב – קריאה בלבד)
   1) סה״כ מוזמנים        = guestsCount (כולם)
   2) אישרו הגעה          = RSVP YES × guestsCount
   3) הגיעו בפועל         = arrivedCount (מתחיל תמיד מ־0)
   ❗ arrivedCount לא תלוי ב-RSVP
========================= */
const stats = useMemo(() => {
  // 🟦 סה״כ מוזמנים
  const totalInvited = guests.reduce(
    (sum, g) => sum + Number(g.guestsCount || 0),
    0
  );

  // 🟨 אישרו הגעה (לפני האירוע)
  const confirmedTotal = guests.reduce(
    (sum, g) =>
      g.rsvp === "yes"
        ? sum + Number(g.guestsCount || 0)
        : sum,
    0
  );

  // 🟩 הגיעו בפועל (בלייב – תמיד מ־arrivedCount)
  const arrivedTotal = guests.reduce(
    (sum, g) => sum + Number(g.arrivedCount || 0),
    0
  );

  return {
    totalInvited,
    confirmedTotal,
    arrivedTotal,
  };
}, [guests]);




const filteredGuests = useMemo(() => {
  if (!search.trim()) return guests;

  const q = search.trim().toLowerCase();

  return guests.filter(
    (g) =>
      g.name?.toLowerCase().includes(q) ||
      g.phone?.includes(q)
  );
}, [guests, search]);

if (loading) {
  return (
    <div className="p-6 text-center text-gray-500">
      טוען אורחים…
    </div>
  );
}




  /* =========================
     AFTER IMPORT
  ========================= */
  return (
  <div className="relative flex flex-col gap-6 pb-24" dir="rtl">

    {/* 🔍 חיפוש – לייב אורחים */}
    <div className="max-w-md">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חיפוש לפי שם או טלפון"
        className="w-full border rounded-lg px-4 py-2"
      />
    </div>

    {/* ✅ Only two cards */}
    <div className="grid grid-cols-3 gap-4">
  <Stat title="סה״כ מוזמנים" value={stats.totalInvited} />
  <Stat title="אישרו הגעה" value={stats.confirmedTotal} />
  <Stat title="הגיעו בפועל" value={stats.arrivedTotal} color="green" />
</div>



      {/* ✅ Live table */}
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
            {filteredGuests.map((g) => {

              const confirmed = confirmedCountForGuest(g);
              const arrived = Number(g.arrivedCount || 0);

              const tableFromStore = guestTableMap.get(String(g._id)) || null;

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

                  {/* ✅ פלוס/מינוס חופשי (מינימום 0) */}
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
                        </div>
                      </div>

                      <button
                        onClick={() => changeArrived(g, +1)}
                        className="w-8 h-8 rounded-full bg-green-600 text-white text-lg hover:bg-green-700 transition"
                        title="הוסף אחד שהגיע"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* ⭐ מס' שולחן */}
<td className="p-3 font-medium text-green-700">
  {tableLabel}
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
  onClick={() => {
    router.push(
      `/events/production?tab=live-seating&focusGuestId=${g._id}`
    );
  }}
  title="הושבה"
>
  🪑
</button>





                      {/* ✅ החזרת העריכה */}
                      <button onClick={() => setEditGuest(g)} title="עריכה">
                        ✏️
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

            const current = useSeatingStore.getState().guests;

if (!current.some((x) => x._id === newGuest._id)) {
  setGuests([...current, newGuest]);
}

setOpenAddModal(false);


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
              applyUpdatedGuest({
                ...editGuest,
                ...updated,
                _id: editGuest._id,
              });
              setEditGuest(null);
            } catch (e) {
              console.error("❌ updateGuest error:", e);
              alert("❌ שגיאה בעריכת מוזמן");
            }
          }}
        />
      )}

      {/* 🔒 Sticky bottom action – כפתור תמיד נראה */}
      <div className="sticky bottom-0 z-20 bg-white border-t p-4 flex justify-end">
        <button
          onClick={() => setOpenAddModal(true)}
          className="px-6 py-3 bg-black text-white rounded-lg shadow-md"
        >
          + הוספת מוזמן
        </button>
      </div>

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
        guestsCount: Math.max(0, Number(guestsCount || 0)),
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

          <Field label="מספר (לפני האירוע)">
            <input
              type="number"
              min={0}
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
              <option value="pending">ממתין</option>
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
          <button onClick={onClose} className="px-4 py-2 rounded-lg border" disabled={saving}>
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
  const colors = { green: "text-green-600" };

  return (
    <div className="border p-5 rounded-xl bg-white shadow-sm text-center">
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color] || ""}`}>{value}</div>
    </div>
  );
}