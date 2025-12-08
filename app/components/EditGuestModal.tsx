"use client";
import { useState, useEffect } from "react";

interface EditGuestModalProps {
  guest: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditGuestModal({ guest, onClose, onSuccess }: EditGuestModalProps) {

  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  const [rsvp, setRsvp] = useState(guest.rsvp);
  const [guestsCount, setGuestsCount] = useState(guest.guestsCount || 1);
  const [notes, setNotes] = useState(guest.notes || "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);

    const res = await fetch(`/api/guests/${guest._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, rsvp, guestsCount, notes }),
    });

    setLoading(false);

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      alert("שגיאה בעדכון אורח");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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

        <label className="text-sm">סטטוס</label>
        <select
          className="w-full border rounded px-3 py-2 mb-4"
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value)}
        >
          <option value="pending">לא השיב</option>
          <option value="yes">מגיע</option>
          <option value="no">לא מגיע</option>
        </select>

        {rsvp === "yes" && (
          <>
            <label className="text-sm">מספר משתתפים</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-3 py-2 mb-4"
              value={guestsCount}
              onChange={(e) => setGuestsCount(Number(e.target.value))}
            />
          </>
        )}

        <label className="text-sm">הערות</label>
        <textarea
          className="w-full border rounded px-3 py-2 mb-4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
