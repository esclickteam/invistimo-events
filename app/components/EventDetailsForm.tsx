"use client";

import { useEffect, useState } from "react";
import LocationAutocomplete from "@/app/components/LocationAutocomplete";

/* =========================
   Event types (UX ↔ DB)
========================= */
const EVENT_TYPES = [
  { label: "חתונה", value: "wedding" },
  { label: "בר מצווה", value: "bar-mitzvah" },
  { label: "בת מצווה", value: "bat-mitzvah" },
  { label: "ברית", value: "brit" },
  { label: "בריתה", value: "brita" },
  { label: "חינה", value: "henna" },
  { label: "אחר…", value: "other" },
];

type Props = {
  event?: any | null;
  onSaved: () => void;
  onClose?: () => void;
};

export default function EventDetailsForm({
  event,
  onSaved,
  onClose,
}: Props) {
  const [form, setForm] = useState({
    title: "",
    eventType: "wedding",
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
      eventType: event.eventType ?? "wedding",
      date: event.date ?? "",
      time: event.time ?? "",
      location: {
        address: event.location?.address ?? "",
        lat: event.location?.lat ?? null,
        lng: event.location?.lng ?? null,
      },
    });
  }, [event]);

  /* ============================================================
     💾 Save (UPSERT)
  ============================================================ */
  async function save() {
    const payload = {
      title: form.title.trim(),
      eventType: form.eventType,
      date: form.date,
      time: form.time,
      location: {
        address: form.location.address,
        lat: form.location.lat,
        lng: form.location.lng,
      },
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data?.success) {
      alert("❌ שגיאה בשמירת פרטי האירוע");
      return;
    }

    onSaved();
    onClose?.();
  }

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-auto shadow-xl">
      <h2 className="text-xl font-semibold mb-5">🛠️ פרטי האירוע</h2>

      <div className="grid gap-4">
        {/* שם האירוע */}
        <input
          placeholder="שם האירוע"
          value={form.title}
          onChange={(e) =>
            setForm((f) => ({ ...f, title: e.target.value }))
          }
          className="border rounded-full px-4 py-3 text-base min-h-[48px]"
        />

        {/* סוג האירוע */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600 px-2">
            סוג האירוע
          </label>
          <select
            value={form.eventType}
            onChange={(e) =>
              setForm((f) => ({ ...f, eventType: e.target.value }))
            }
            className="border rounded-full px-4 py-3 bg-white"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* תאריך */}
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
            className="border rounded-full px-4 py-3 bg-white"
          />
        </div>

        {/* שעה */}
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
            className="border rounded-full px-4 py-3 bg-white"
          />
        </div>

        {/* מיקום */}
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
          ניתן לבחור מיקום מהרשימה או להקליד ידנית
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
