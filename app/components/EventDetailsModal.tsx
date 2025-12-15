"use client";

import { useState } from "react";

export default function EventDetailsModal({
  invitation,
  onClose,
  onSaved,
}: {
  invitation: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: invitation.title || "",
    type: invitation.type || "",
    date: invitation.date ? invitation.date.slice(0, 10) : "",
    time: invitation.date
      ? new Date(invitation.date).toISOString().slice(11, 16)
      : "",
    location: invitation.location || "",
  });

  async function save() {
    // ⏰ חיבור date + time לתאריך אחד אמיתי
    let fullDate: string | null = null;

    if (form.date) {
      const time = form.time || "00:00";
      fullDate = new Date(`${form.date}T${time}`).toISOString();
    }

    await fetch(`/api/invitations/${invitation._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        type: form.type,
        location: form.location,
        date: fullDate, // ✅ זה מה שמפעיל את הספירה לאחור
      }),
    });

    onSaved(); // רענון נתונים בדשבורד
    onClose(); // סגירת פופאפ
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">✏️ עריכת פרטי האירוע</h2>

        <div className="grid grid-cols-1 gap-3">
          <input
            placeholder="שם האירוע"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            className="border rounded-full px-4 py-3"
          />

          <input
            placeholder="סוג האירוע"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
            className="border rounded-full px-4 py-3"
          />

          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm({ ...form, date: e.target.value })
            }
            className="border rounded-full px-4 py-3"
          />

          <input
            type="time"
            value={form.time}
            onChange={(e) =>
              setForm({ ...form, time: e.target.value })
            }
            className="border rounded-full px-4 py-3"
          />

          <input
            placeholder="מיקום האירוע"
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
            className="border rounded-full px-4 py-3"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-gray-500">
            ביטול
          </button>
          <button
            onClick={save}
            className="bg-[#c9b48f] text-white px-6 py-2 rounded-full font-semibold"
          >
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
