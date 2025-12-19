"use client";

import { useState } from "react";
import LocationAutocomplete from "@/app/components/LocationAutocomplete";

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
    time: invitation.eventTime || "", // ✅ קריטי
    location: {
      address: invitation.location?.address || "",
      lat: invitation.location?.lat ?? null,
      lng: invitation.location?.lng ?? null,
    },
  });

  async function save() {
    const res = await fetch(`/api/invitations/${invitation._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        eventType: form.eventType,

        // ✅ תאריך בלבד (בלי שעה)
        eventDate: form.date
          ? new Date(form.date).toISOString()
          : null,

        // ✅ שעה נשמרת בנפרד
        eventTime: form.time || "",

        // ✅ מיקום מלא
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg overflow-visible">
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

          {/* 📍 Google Places Autocomplete */}
          <LocationAutocomplete
            value={form.location.address}
            onSelect={({ address, lat, lng }) =>
              setForm({
                ...form,
                location: { address, lat, lng },
              })
            }
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
