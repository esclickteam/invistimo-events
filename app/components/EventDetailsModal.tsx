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
    eventType: invitation.eventType || "",
    date: invitation.eventDate
      ? invitation.eventDate.slice(0, 10)
      : "",
    time: invitation.eventDate
      ? new Date(invitation.eventDate).toISOString().slice(11, 16)
      : "",
    location: {
      address: invitation.location?.address || "",
      lat: invitation.location?.lat ?? null,
      lng: invitation.location?.lng ?? null,
    },
  });

  async function save() {
    /* ⏰ חיבור date + time */
    let fullDate: string | null = null;

    if (form.date) {
      const time = form.time || "00:00";
      fullDate = new Date(`${form.date}T${time}`).toISOString();
    }

    const res = await fetch(`/api/invitations/${invitation._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        eventType: form.eventType,
        eventDate: fullDate,
        location: {
          address: form.location.address,
          lat: form.location.lat,
          lng: form.location.lng,
        },
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert("שגיאה בשמירת פרטי האירוע");
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">
          ✏️ עריכת פרטי האירוע
        </h2>

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
            placeholder="סוג האירוע (חתונה / בר מצווה וכו׳)"
            value={form.eventType}
            onChange={(e) =>
              setForm({ ...form, eventType: e.target.value })
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

          {/* 📍 מיקום האירוע */}
          <input
            placeholder="📍 מיקום האירוע (אולם / כתובת)"
            value={form.location.address}
            onChange={(e) =>
              setForm({
                ...form,
                location: {
                  ...form.location,
                  address: e.target.value,
                },
              })
            }
            className="border rounded-full px-4 py-3"
          />

          <p className="text-xs text-gray-500 px-2">
            האורחים יוכלו לנווט בלחיצה ל־Google Maps או Waze
          </p>
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
