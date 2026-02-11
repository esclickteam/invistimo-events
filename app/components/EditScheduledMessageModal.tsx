"use client";

import { useMemo, useState } from "react";

/* ================= TYPES ================= */

type ScheduledMessage = {
  _id: string;
  scheduledAt: string;     // ISO string
  messageContent: string;  // מקור אמת
};

/* ================= HELPERS ================= */

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`; // HH:mm
}

function buildLocalDate(date: string, time: string) {
  // date: YYYY-MM-DD, time: HH:mm
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !year || !month || !day ||
    Number.isNaN(hour) || Number.isNaN(minute)
  ) {
    return null;
  }

  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  const [date, setDate] = useState(() => toDateInputValue(message.scheduledAt));
  const [time, setTime] = useState(() => toTimeInputValue(message.scheduledAt));
  const [content, setContent] = useState(message.messageContent ?? "");
  const [loading, setLoading] = useState(false);

  const minDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  /* ================= SAVE ================= */

  async function save() {
    const trimmed = content.trim();

    if (!trimmed) {
      alert("תוכן ההודעה לא יכול להיות ריק");
      return;
    }

    if (!date || !time) {
      alert("יש לבחור תאריך ושעה");
      return;
    }

    const localDate = buildLocalDate(date, time);
    if (!localDate) {
      alert("תאריך/שעה לא תקינים");
      return;
    }

    if (localDate.getTime() <= Date.now()) {
      alert("לא ניתן לקבוע זמן עבר");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/scheduled-messages/${message._id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    scheduledAt: localDate.toISOString(),
    text: trimmed, // ✅ במקום messageContent
  }),
});

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // אם השרת החזיר גוף לא JSON
      }

      if (!res.ok || !data?.success) {
        console.error("PATCH /scheduled-messages failed:", {
          status: res.status,
          data,
        });

        const msg =
          data?.error ||
          data?.message ||
          `עדכון נכשל (${res.status})`;

        alert(`❌ ${msg}`);
        return;
      }

      onSaved();
    } catch (err) {
      console.error("Edit scheduled message error:", err);
      alert("❌ שגיאה בעדכון");
    } finally {
      setLoading(false);
    }
  }

  /* ================= RENDER ================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-[95%] max-w-lg p-6" dir="rtl">
        <h2 className="text-xl font-semibold mb-4">✏️ עריכת הודעה מתוזמנת</h2>

        {/* MESSAGE CONTENT */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">
            תוכן ההודעה (יישלח כפי שהוא)
          </label>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full border rounded-xl p-3 text-sm whitespace-pre-wrap"
          />

          <p className="text-xs text-gray-500 mt-1">
            ✉️ הטקסט יישלח בדיוק כפי שמופיע כאן
          </p>
        </div>

        {/* DATE */}
        <label className="block text-sm font-medium mb-1">תאריך שליחה</label>
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-xl p-3 mb-4"
        />

        {/* TIME */}
        <label className="block text-sm font-medium mb-1">שעת שליחה</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full border rounded-xl p-3 mb-6"
        />

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border">
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
