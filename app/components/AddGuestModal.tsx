"use client";

import { useState } from "react";
import { RSVP_LABELS } from "@/lib/rsvp";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  invitationId: string;
}

export default function AddGuestModal({
  onClose,
  onSuccess,
  invitationId,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [rsvp, setRsvp] = useState<"yes" | "no" | "pending">("pending");
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [tableNumber, setTableNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name || !phone) {
      alert("יש למלא שם מלא וטלפון");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/invitations/${invitationId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          relation: relation || undefined,
          rsvp,
          guestsCount: Number(guestsCount) || 1,
          tableNumber: tableNumber ? Number(tableNumber) : undefined,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!data.success) {
        alert(data.error || "שגיאה בשמירת מוזמן");
        return;
      }

      // ⭐ שמירה והחזרה לדשבורד
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("שגיאה בשמירת הנתונים");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[420px]" dir="rtl">
        <h2 className="text-xl font-semibold mb-4">הוספת מוזמן חדש</h2>

        {/* שם מלא */}
        <label className="text-sm">שם מלא</label>
        <input
          className="border w-full rounded px-3 py-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* טלפון */}
        <label className="text-sm">טלפון</label>
        <input
          className="border w-full rounded px-3 py-2 mb-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* קרבה */}
        <label className="text-sm">קרבה</label>
        <input
          className="border w-full rounded px-3 py-2 mb-3"
          placeholder="משפחה / חברים / עבודה"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />

        {/* סטטוס */}
        <label className="text-sm">סטטוס</label>
        <select
          className="border w-full rounded px-3 py-2 mb-3"
          value={rsvp}
          onChange={(e) =>
            setRsvp(e.target.value as "yes" | "no" | "pending")
          }
        >
          <option value="yes">{RSVP_LABELS.yes}</option>
          <option value="no">{RSVP_LABELS.no}</option>
          <option value="pending">{RSVP_LABELS.pending}</option>
        </select>

        {/* כמות אורחים */}
        <label className="text-sm">כמות אורחים</label>
        <input
          type="number"
          min={1}
          className="border w-full rounded px-3 py-2 mb-3"
          value={guestsCount}
          onChange={(e) => setGuestsCount(Number(e.target.value))}
        />

        {/* מס' שולחן */}
        <label className="text-sm">מס׳ שולחן (אופציונלי)</label>
        <input
          type="number"
          className="border w-full rounded px-3 py-2 mb-4"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />

        {/* פעולות */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            ביטול
          </button>

          <button
            className="px-4 py-2 bg-black text-white rounded"
            onClick={save}
            disabled={loading}
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
