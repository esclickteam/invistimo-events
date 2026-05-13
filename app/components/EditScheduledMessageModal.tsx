"use client";

import { useMemo, useState } from "react";

/* ================= TYPES ================= */

type ScheduledMessage = {
  _id: string;
  scheduledAt: string; // ISO string
  messageContent: string; // מקור אמת
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

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
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

        const msg = data?.error || data?.message || `עדכון נכשל (${res.status})`;

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
    <div
      dir="rtl"
      className="
        mt-4
        rounded-[26px]
        border
        border-[#E6D6BC]
        bg-[#FFF9F1]
        p-5
        shadow-[0_18px_50px_rgba(78,49,27,0.10)]
      "
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#3A2417]">
            ✏️ עריכת הודעה מתוזמנת
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-[#F0E3D1]
              text-base
              font-black
              text-[#3A2417]
              transition
              hover:bg-[#E6D6BC]
              disabled:opacity-50
            "
          >
            ✕
          </button>
        </div>

        {/* MESSAGE CONTENT */}
        <div>
          <label className="mb-1 block text-sm font-bold text-[#3A2417]">
            תוכן ההודעה (יישלח כפי שהוא)
          </label>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            disabled={loading}
            className="
              w-full
              rounded-xl
              border
              border-[#E6D6BC]
              bg-white
              p-3
              text-sm
              whitespace-pre-wrap
              outline-none
              transition
              focus:border-[#B9894D]
              focus:ring-4
              focus:ring-[#E9D4AC]
              disabled:opacity-60
            "
          />

          <p className="mt-1 text-xs text-[#7A5A3A]">
            ✉️ הטקסט יישלח בדיוק כפי שמופיע כאן
          </p>
        </div>

        {/* DATE */}
        <div>
          <label className="mb-1 block text-sm font-bold text-[#3A2417]">
            תאריך שליחה
          </label>

          <input
            type="date"
            value={date}
            min={minDate}
            disabled={loading}
            onChange={(e) => setDate(e.target.value)}
            className="
              w-full
              rounded-xl
              border
              border-[#E6D6BC]
              bg-white
              p-3
              outline-none
              transition
              focus:border-[#B9894D]
              focus:ring-4
              focus:ring-[#E9D4AC]
              disabled:opacity-60
            "
          />
        </div>

        {/* TIME */}
        <div>
          <label className="mb-1 block text-sm font-bold text-[#3A2417]">
            שעת שליחה
          </label>

          <input
            type="time"
            value={time}
            disabled={loading}
            onChange={(e) => setTime(e.target.value)}
            className="
              w-full
              rounded-xl
              border
              border-[#E6D6BC]
              bg-white
              p-3
              outline-none
              transition
              focus:border-[#B9894D]
              focus:ring-4
              focus:ring-[#E9D4AC]
              disabled:opacity-60
            "
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              rounded-xl
              border
              border-[#E6D6BC]
              bg-white
              px-4
              py-2
              text-sm
              font-bold
              text-[#3A2417]
              transition
              hover:bg-[#FFF3DD]
              disabled:opacity-50
            "
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={save}
            disabled={loading}
            className="
              rounded-xl
              bg-blue-600
              px-4
              py-2
              text-sm
              font-bold
              text-white
              transition
              hover:bg-blue-700
              disabled:opacity-50
            "
          >
            {loading ? "שומר…" : "💾 שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}