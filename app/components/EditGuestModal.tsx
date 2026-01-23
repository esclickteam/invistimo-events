"use client";

import { useEffect, useState } from "react";

interface EditGuestModalProps {
  guest: any;
  userRole: "guest" | "admin";
  onClose: () => void;
  onSuccess: (updatedGuest: any) => void;
}

export default function EditGuestModal({
  guest,
  userRole,
  onClose,
  onSuccess,
}: EditGuestModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [rsvp, setRsvp] = useState<"pending" | "yes" | "no">("pending");
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [arrivedCount, setArrivedCount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const tableName = guest?.tableName ?? "-";

  useEffect(() => {
    if (!guest) return;

    setName(guest.name || "");
    setPhone(guest.phone || "");
    setRelation(guest.relation || "");
    setRsvp(guest.rsvp || "pending");
    setGuestsCount(guest.guestsCount || 1);
    setArrivedCount(
      typeof guest.arrivedCount === "number" ? guest.arrivedCount : 0
    );
    setNotes(guest.notes || "");
  }, [guest]);

  async function save() {
    setLoading(true);

    try {
      const normalizedRsvp =
        Number(guestsCount) > 0
          ? "yes"
          : rsvp === "no"
          ? "no"
          : "pending";

      const payload = {
        name,
        phone,
        relation,
        rsvp: normalizedRsvp,
        guestsCount: Number(guestsCount),
        arrivedCount: Number(arrivedCount),
        notes,
      };

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("❌ שגיאה בעדכון אורח");
        return;
      }

      const data = await res.json();
      onSuccess(data.guest ?? data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ שגיאת שרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      dir="rtl"
    >
      <div
        className="
          bg-white
          w-full max-w-[420px]
          max-h-[85vh]
          rounded-2xl
          shadow-xl
          flex flex-col
        "
      >
        {/* ================= CONTENT (SCROLLABLE) ================= */}
        <div className="px-6 py-5 overflow-y-auto">
          <h2 className="text-xl font-bold mb-5">עריכת אורח</h2>

          <Field label="שם מלא">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="טלפון">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label="קרבה">
            <input
              className={inputClass}
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            />
          </Field>

          <Field label="סטטוס">
            <select
              className={inputClass}
              value={rsvp}
              onChange={(e) => setRsvp(e.target.value as any)}
            >
              <option value="pending">לא השיב</option>
              <option value="yes">מגיע</option>
              <option value="no">לא מגיע</option>
            </select>
          </Field>

          <Field label="מוזמנים">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={guestsCount}
              onChange={(e) => setGuestsCount(Number(e.target.value))}
            />
          </Field>

          <Field label="מגיעים">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={arrivedCount}
              onChange={(e) => setArrivedCount(Number(e.target.value))}
            />
          </Field>

          <Field label="מספר שולחן">
            <input
              className={`${inputClass} bg-gray-50 text-gray-600`}
              value={tableName}
              readOnly
            />
          </Field>

          <Field label="הערות">
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 border-t flex justify-between bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            ביטול
          </button>

          <button
            onClick={save}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Helpers
========================= */

const inputClass = `
  w-full
  border border-gray-300
  rounded-lg
  px-3 py-2
  text-sm
  bg-white
  focus:outline-none
  focus:ring-2
  focus:ring-[#c9b48f]
`;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
