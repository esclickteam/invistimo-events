"use client";

import { useState } from "react";

/* ================= TYPES ================= */

type ScheduledMessage = {
  _id: string;
  text: string;
  scheduledAt: string;
};

export default function EditScheduledMessageModal({
  message,
  onClose,
  onSaved,
}: {
  message: ScheduledMessage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(message.text);
  const [date, setDate] = useState(
    new Date(message.scheduledAt).toISOString().split("T")[0]
  );
  const [time, setTime] = useState(
    new Date(message.scheduledAt).toISOString().slice(11, 16)
  );
  const [loading, setLoading] = useState(false);

  /* ================= SAVE ================= */

  async function save() {
    if (!text.trim()) {
      alert("תוכן ההודעה חובה");
      return;
    }

    if (!date || !time) {
      alert("יש לבחור תאריך ושעה");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);

    if (scheduledAt.getTime() < Date.now()) {
      alert("לא ניתן לקבוע זמן עבר");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/scheduled-messages/${message._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          scheduledAt,
        }),
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

        {/* TEXT */}
        <label className="block text-sm font-medium mb-1">
          תוכן ההודעה
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full border rounded-xl p-3 mb-4"
        />

        {/* DATE */}
        <label className="block text-sm font-medium mb-1">
          תאריך שליחה
        </label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split("T")[0]}
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
