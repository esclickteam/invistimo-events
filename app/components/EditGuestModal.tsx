"use client";

import { useEffect, useMemo, useState } from "react";

interface EditGuestModalProps {
  guest: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditGuestModal({
  guest,
  onClose,
  onSuccess,
}: EditGuestModalProps) {
  const [name, setName] = useState(guest?.name || "");
  const [phone, setPhone] = useState(guest?.phone || "");
  const [relation, setRelation] = useState(guest?.relation || "");
  const [rsvp, setRsvp] = useState<"pending" | "yes" | "no">(guest?.rsvp || "pending");
  const [guestsCount, setGuestsCount] = useState<number>(guest?.guestsCount || 1);
  const [notes, setNotes] = useState(guest?.notes || "");
  const [loading, setLoading] = useState(false);

  // אם עוברים לערוך אורח אחר בלי לסגור מודאל
  useEffect(() => {
    setName(guest?.name || "");
    setPhone(guest?.phone || "");
    setRelation(guest?.relation || "");
    setRsvp(guest?.rsvp || "pending");
    setGuestsCount(guest?.guestsCount || 1);
    setNotes(guest?.notes || "");
  }, [guest]);

  // "מגיעים" לפי הטבלה (תואם לוגיקה בדשבורד)
  const comingCount = useMemo(() => {
    return rsvp === "yes" ? Number(guestsCount || 0) : 0;
  }, [rsvp, guestsCount]);

  // מס' שולחן להצגה (בד"כ מתעדכן דרך הושבה)
  const tableName = guest?.tableName ?? "-";

  async function save() {
    setLoading(true);

    try {
      const payload: any = {
        name,
        phone,
        relation,
        rsvp,
        guestsCount: rsvp === "yes" ? Number(guestsCount || 1) : Number(guestsCount || 1),
        notes,
      };

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setLoading(false);

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("שגיאה בעדכון אורח");
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      alert("שגיאה בעדכון אורח");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white p-6 rounded-xl w-[420px] shadow-xl">
        <h2 className="text-xl font-bold mb-4">עריכת אורח</h2>

        {/* שם מלא */}
        <label className="text-sm">שם מלא</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* טלפון */}
        <label className="text-sm">טלפון</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* קרבה */}
        <label className="text-sm">קרבה</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          placeholder="משפחה / חברים / עבודה..."
        />

        {/* סטטוס */}
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

        {/* מוזמנים */}
        <label className="text-sm">מוזמנים</label>
        <input
          type="number"
          min={1}
          className="w-full border rounded px-3 py-2 mb-4"
          value={guestsCount}
          onChange={(e) => setGuestsCount(Number(e.target.value))}
        />

        {/* מגיעים (תואם טבלה) */}
        <label className="text-sm">מגיעים</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4 bg-gray-50 text-gray-700"
          value={comingCount}
          readOnly
        />

        {/* מס' שולחן (תצוגה בלבד) */}
        <label className="text-sm">מס' שולחן</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4 bg-gray-50 text-gray-700"
          value={tableName}
          readOnly
        />

        {/* הערות */}
        <label className="text-sm">הערות</label>
        <textarea
          className="w-full border rounded px-3 py-2 mb-4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
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
