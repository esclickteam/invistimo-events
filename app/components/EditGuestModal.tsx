"use client";

import { useEffect, useState } from "react";

interface EditGuestModalProps {
  guest: any;
  isAdmin?: boolean; // 👑 חדש
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditGuestModal({
  guest,
  isAdmin = false,
  onClose,
  onSuccess,
}: EditGuestModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [rsvp, setRsvp] = useState<"pending" | "yes" | "no">("pending");
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [comingCount, setComingCount] = useState<number>(0);
  const [tableName, setTableName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     INIT / UPDATE
  ========================= */
  useEffect(() => {
    if (!guest) return;

    setName(guest.name || "");
    setPhone(guest.phone || "");
    setRelation(guest.relation || "");
    setRsvp(guest.rsvp || "pending");
    setGuestsCount(guest.guestsCount ?? 1);
    setComingCount(guest.comingCount ?? 0);
    setTableName(guest.tableName || "");
    setNotes(guest.notes || "");
  }, [guest]);

  /* =========================
     SAVE
  ========================= */
  async function save() {
    setLoading(true);

    try {
      const payload = {
        name,
        phone,
        relation,
        rsvp,
        guestsCount: Number(guestsCount),
        comingCount: isAdmin
          ? Number(comingCount)
          : rsvp === "yes"
          ? Number(comingCount)
          : 0,
        tableName,
        notes,
      };

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setLoading(false);

      if (!res.ok) {
        alert("שגיאה בעדכון אורח");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
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

        {/* שם */}
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

        {/* מגיעים בפועל */}
        <label className="text-sm">
          מגיעים בפועל
          {isAdmin && (
            <span className="text-xs text-blue-600 mr-2">(עריכת אדמין)</span>
          )}
        </label>
        <input
          type="number"
          min={0}
          max={guestsCount}
          disabled={!isAdmin && rsvp !== "yes"}
          className={`w-full border rounded px-3 py-2 mb-4 ${
            !isAdmin && rsvp !== "yes"
              ? "bg-gray-100 text-gray-400"
              : ""
          }`}
          value={comingCount}
          onChange={(e) => setComingCount(Number(e.target.value))}
        />

        {/* מספר שולחן */}
        <label className="text-sm">
          מספר שולחן
          {isAdmin && (
            <span className="text-xs text-blue-600 mr-2">(עריכת אדמין)</span>
          )}
        </label>
        <input
          disabled={!isAdmin && rsvp !== "yes"}
          className={`w-full border rounded px-3 py-2 mb-4 ${
            !isAdmin && rsvp !== "yes"
              ? "bg-gray-100 text-gray-400"
              : ""
          }`}
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="לדוגמה: 12"
        />

        {/* הערות */}
        <label className="text-sm">הערות</label>
        <textarea
          className="w-full border rounded px-3 py-2 mb-4"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
