"use client";

import { useState } from "react";

/* ================= TYPES ================= */

type ScheduledMessage = {
  _id: string;
  scheduledAt: string; // ISO string (UTC מה-DB)
};

/* ================= COMPONENT ================= */

export default function EditScheduledMessageModal({
  message,
  onClose,
  onSaved,
}: {
  message: ScheduledMessage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialDate = new Date(message.scheduledAt);

  // YYYY-MM-DD (local)
  const [date, setDate] = useState(
    initialDate.toLocaleDateString("en-CA")
  );

  // HH:mm (local)
  const [time, setTime] = useState(
    initialDate.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );

  const [loading, setLoading] = useState(false);

  /* ================= SAVE ================= */

  async function save() {
    if (!date || !time) {
      alert("יש לבחור תאריך ושעה");
      return;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const scheduledAt = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0
    );

    if (scheduledAt.getTime() < Date.now()) {
      alert("לא ניתן לקבוע זמן עבר");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/scheduled-messages/${message._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert("❌ עדכון נכשל");
        return;
      }

      onSaved();
    } catch (err) {
      console.error(err);
      alert("❌ שגיאה בעדכון");
    } finally {
      setLoading(false);
    }
  }

  /* ================= RENDER ================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-[90%] max-w-md p-6" dir="rtl">
        <h2 className="text-xl font-semibold mb-4">
          ✏️ עריכת הודעה מתוזמנת
        </h2>

        {/* PREVIEW */}
        <div className="mb-4">
          <div className="text-sm font-medium mb-1">תצוגה מקדימה</div>
          <div className="whitespace-pre-wrap text-sm bg-gray-50 border rounded-xl p-3 text-gray-700">
            תוכן ההודעה נבנה אוטומטית לפי התבנית, ההזמנה והאורחים
          </div>
        </div>

        {/* DATE */}
        <label className="block text-sm font-medium mb-1">
          תאריך שליחה
        </label>
        <input
          type="date"
          value={date}
          min={new Date().toLocaleDateString("en-CA")}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-xl p-3 mb-4"
        />

        {/* TIME */}
        <label className="block text-sm font-medium mb-1">
          שעת שליחה
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full border rounded-xl p-3 mb-6"
        />

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border"
          >
            ביטול
          </button>

          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? "שומר…" : "💾 שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
