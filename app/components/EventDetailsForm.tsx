"use client";

import { useEffect, useState } from "react";
import LocationAutocomplete from "@/app/components/LocationAutocomplete";

/* ============================================================
   Props
============================================================ */
type Props = {
  event: any;
  onSaved: () => void;
  onClose?: () => void;
};

/* ============================================================
   Component
============================================================ */
export default function EventDetailsForm({
  event,
  onSaved,
  onClose,
}: Props) {
  const [form, setForm] = useState({
    title: "",
    eventType: "",
    date: "",
    time: "",
    location: {
      address: "",
      lat: null as number | null,
      lng: null as number | null,
    },
  });

  /* ============================================================
     🔄 Sync event → local state
  ============================================================ */
  useEffect(() => {
    if (!event) return;

    setForm({
      title: event.title ?? "",
      eventType: event.eventType ?? "",
      date: event.eventDate
        ? new Date(event.eventDate).toISOString().slice(0, 10)
        : "",
      time: event.eventTime ?? "",
      location: {
        address: event.location?.address ?? "",
        lat: event.location?.lat ?? null,
        lng: event.location?.lng ?? null,
      },
    });
  }, [event]);

  /* ============================================================
     💾 Save event (UPSERT)
  ============================================================ */
  async function save() {
    const payload = {
      title: form.title.trim(),
      eventType: form.eventType.trim(),
      eventDate: form.date ? new Date(form.date).toISOString() : null,
      eventTime: form.time || "",
      location: {
        address: form.location.address || "",
        lat: form.location.lat,
        lng: form.location.lng,
      },
    };

    try {
      const res = await fetch("/api/event", {
        method: "POST", // ✅ upsert
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ⭐️ חובה
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data?.success) {
        alert("❌ שגיאה בשמירת פרטי האירוע");
        return;
      }

      onSaved();
      onClose?.();
    } catch (err) {
      console.error("Save event error:", err);
      alert("❌ שגיאת שרת");
    }
  }

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-auto shadow-xl">
      <h2 className="text-xl font-semibold mb-5">
        ✏️ עריכת פרטי האירוע
      </h2>

      <div className="grid gap-4">
        <input
          placeholder="שם האירוע"
          value={form.title}
          onChange={(e) =>
            setForm((f) => ({ ...f, title: e.target.value }))
          }
          className="border rounded-full px-4 py-3 text-base min-h-[48px]"
        />

        <input
          placeholder="סוג האירוע (חתונה / בר מצווה וכו׳)"
          value={form.eventType}
          onChange={(e) =>
            setForm((f) => ({ ...f, eventType: e.target.value }))
          }
          className="border rounded-full px-4 py-3 text-base min-h-[48px]"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600 px-2">
            תאריך האירוע
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((f) => ({ ...f, date: e.target.value }))
            }
            className="border rounded-full px-4 py-3 text-base min-h-[48px] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600 px-2">
            שעת האירוע
          </label>
          <input
            type="time"
            value={form.time}
            onChange={(e) =>
              setForm((f) => ({ ...f, time: e.target.value }))
            }
            className="border rounded-full px-4 py-3 text-base min-h-[48px] bg-white"
          />
        </div>

        <LocationAutocomplete
          value={form.location.address}
          onSelect={({ address, lat, lng }) =>
            setForm((f) => ({
              ...f,
              location: { address, lat, lng },
            }))
          }
        />

        <p className="text-xs text-gray-500 px-2">
          האורחים יוכלו לנווט בלחיצה ל־Google Maps או Waze
        </p>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:underline"
          >
            ביטול
          </button>
        )}

        <button
          onClick={save}
          className="bg-[#c9b48f] text-white px-6 py-2 rounded-full font-semibold hover:opacity-90"
        >
          שמירה
        </button>
      </div>
    </div>
  );
}
