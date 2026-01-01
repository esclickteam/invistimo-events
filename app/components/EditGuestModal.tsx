"use client";

import { useEffect, useMemo, useState } from "react";

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
  const isAdmin = userRole === "admin";

  const [name, setName] = useState(guest?.name || "");
  const [phone, setPhone] = useState(guest?.phone || "");
  const [relation, setRelation] = useState(guest?.relation || "");
  const [rsvp, setRsvp] = useState<"pending" | "yes" | "no">(
    guest?.rsvp || "pending"
  );
  const [guestsCount, setGuestsCount] = useState<number>(
    guest?.guestsCount || 1
  );

  // 🔥 מגיעים בפועל – עריך לכולם
  const [actualArrived, setActualArrived] = useState<number>(
    guest?.actualArrived ?? 0
  );

  // 🔐 מספר שולחן – עריך רק לאדמין
  const [tableName, setTableName] = useState(guest?.tableName || "");

  const [notes, setNotes] = useState(guest?.notes || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(guest?.name || "");
    setPhone(guest?.phone || "");
    setRelation(guest?.relation || "");
    setRsvp(guest?.rsvp || "pending");
    setGuestsCount(guest?.guestsCount || 1);
    setActualArrived(guest?.actualArrived ?? 0);
    setTableName(guest?.tableName || "");
    setNotes(guest?.notes || "");
  }, [guest]);

  // מגיעים מחושבים (לוגיקה קיימת)
  const comingCount = useMemo(() => {
    return rsvp === "yes" ? Number(guestsCount || 0) : 0;
  }, [rsvp, guestsCount]);

  async function save() {
    setLoading(true);

    try {
      const payload: any = {
        name,
        phone,
        relation,
        rsvp,
        guestsCount: Number(guestsCount || 1),
        actualArrived: Number(actualArrived || 0),
        notes,
      };

      // ⛔ רק אדמין יכול לשלוח מספר שולחן
      if (isAdmin) {
        payload.tableName = tableName;
      }

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

        <label className="text-sm">מגיעים (מחושב)</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4 bg-gray-50 text-gray-700"
          value={comingCount}
          readOnly
        />

        {/* ✅ מגיעים בפועל */}
        <label className="text-sm">מגיעים בפועל</label>
        <input
          type="number"
          min={0}
          className="w-full border rounded px-3 py-2 mb-4"
          value={actualArrived}
          onChange={(e) => setActualArrived(Number(e.target.value))}
        />

        {/* 🔐 מספר שולחן */}
        <label className="text-sm flex items-center gap-1">
          מספר שולחן {!isAdmin && <span className="text-xs text-gray-500">🔒</span>}
        </label>
        <input
          className={`w-full border rounded px-3 py-2 mb-4 ${
            isAdmin ? "" : "bg-gray-50 text-gray-600"
          }`}
          value={tableName || "-"}
          onChange={(e) => setTableName(e.target.value)}
          readOnly={!isAdmin}
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
