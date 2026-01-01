"use client";

import { useEffect, useState } from "react";

interface EditGuestModalProps {
  guest: any;
  userRole: "guest" | "admin";
  onClose: () => void;
  onSuccess: () => void;
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

  // ✅ מגיעים – שדה יחיד
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
      const payload = {
        name,
        phone,
        relation,
        rsvp,
        guestsCount: Number(guestsCount),
        arrivedCount: Number(arrivedCount),
        notes,
      };

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setLoading(false);

      if (!res.ok) {
        alert("❌ שגיאה בעדכון אורח");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("❌ שגיאת שרת");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      dir="rtl"
    >
      <div className="bg-white p-6 rounded-xl w-[420px] shadow-xl">
        <h2 className="text-xl font-bold mb-4">עריכת אורח</h2>

        <label className="text-sm">שם מלא</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="text-sm">טלפון</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <label className="text-sm">קרבה</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />

        <label className="text-sm">סטטוס</label>
        <select
          className="w-full border rounded px-3 py-2 mb-4"
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value as any)}
        >
          <option value="pending">לא השיב</option>
          <option value="yes">מגיע</option>
          <option value="no">לא מגיע</option>
        </select>

        <label className="text-sm">מוזמנים</label>
        <input
          type="number"
          min={1}
          className="w-full border rounded px-3 py-2 mb-4"
          value={guestsCount}
          onChange={(e) => setGuestsCount(Number(e.target.value))}
        />

        {/* ✅ מגיעים – השדה היחיד */}
        <label className="text-sm">מגיעים</label>
        <input
          type="number"
          min={0}
          className="w-full border rounded px-3 py-2 mb-4"
          value={arrivedCount}
          onChange={(e) => setArrivedCount(Number(e.target.value))}
        />

        <label className="text-sm">מספר שולחן</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4 bg-gray-50 text-gray-700"
          value={tableName}
          readOnly
        />

        <label className="text-sm">הערות</label>
        <textarea
          className="w-full border rounded px-3 py-2 mb-4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            ביטול
          </button>

          <button
            onClick={save}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
