"use client";

import { useEffect, useState } from "react";
import LocationAutocomplete from "@/app/components/LocationAutocomplete";

/* =========================
   Event types
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

/* =========================
   Labels for menu options
========================= */
const MENU_LABELS: Record<string, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
};

type CustomOption = {
  key: string;
  label: string;
  type: "checkbox" | "text";
};

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
    giftCreditUrl: "",
    location: {
      address: "",
      lat: null as number | null,
      lng: null as number | null,
    },
    invitationSettings: {
      menuOptions: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        childrenMeal: false,
        kosher: false,
      },
      allowGuestNote: false,
      customOptions: [] as CustomOption[],
    },
  });

  /* =========================
     Sync event → state
  ========================= */
  useEffect(() => {
    if (!event) return;

    setForm((prev) => ({
      ...prev,
      title: event.title ?? "",
      eventType: event.eventType ?? "wedding",
      date: event.date
        ? new Date(event.date).toISOString().slice(0, 10)
        : "",
      time: event.time ?? "",
      giftCreditUrl: event.giftCreditUrl ?? "",
      location: {
        address: event.location?.address ?? "",
        lat: event.location?.lat ?? null,
        lng: event.location?.lng ?? null,
      },
      invitationSettings: {
        menuOptions: {
          vegetarian:
            event.invitationSettings?.menuOptions?.vegetarian ?? false,
          vegan:
            event.invitationSettings?.menuOptions?.vegan ?? false,
          glutenFree:
            event.invitationSettings?.menuOptions?.glutenFree ?? false,
          childrenMeal:
            event.invitationSettings?.menuOptions?.childrenMeal ?? false,
          kosher:
            event.invitationSettings?.menuOptions?.kosher ?? false,
        },
        allowGuestNote:
          event.invitationSettings?.allowGuestNote ?? false,
        customOptions:
          event.invitationSettings?.customOptions ?? [],
      },
    }));
  }, [event]);

  /* =========================
     Custom Options
  ========================= */
  function addCustomOption() {
    setForm((f) => ({
      ...f,
      invitationSettings: {
        ...f.invitationSettings,
        customOptions: [
          ...f.invitationSettings.customOptions,
          {
            key: `custom_${Date.now()}`,
            label: "",
            type: "checkbox",
          },
        ],
      },
    }));
  }

  function updateCustomOption(
    index: number,
    field: keyof CustomOption,
    value: any
  ) {
    setForm((f) => {
      const updated = [...f.invitationSettings.customOptions];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...f,
        invitationSettings: {
          ...f.invitationSettings,
          customOptions: updated,
        },
      };
    });
  }

  /* =========================
     Save
  ========================= */
  async function save() {
    const payload = {
      title: form.title.trim(),
      eventType: form.eventType,
      date: form.date,
      time: form.time,
      giftCreditUrl: form.giftCreditUrl.trim(),
      location: form.location,
      invitationSettings: form.invitationSettings,
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data?.success) {
      alert("❌ שגיאה בשמירה");
      return;
    }

    onSaved();
    onClose?.();
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="bg-white rounded-2xl p-8 w-full max-w-6xl mx-auto shadow-xl">
      <h2 className="text-2xl font-semibold mb-8 text-center">
        פרטי האירוע
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">

        {/* ================= LEFT – Event Details ================= */}
        <div className="grid gap-5">

          <input
            placeholder="שם האירוע"
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            className="border rounded-full px-5 py-3"
          />

          <select
            value={form.eventType}
            onChange={(e) =>
              setForm((f) => ({ ...f, eventType: e.target.value }))
            }
            className="border rounded-full px-5 py-3 bg-white"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((f) => ({ ...f, date: e.target.value }))
            }
            className="border rounded-full px-5 py-3"
          />

          <input
            type="time"
            value={form.time}
            onChange={(e) =>
              setForm((f) => ({ ...f, time: e.target.value }))
            }
            className="border rounded-full px-5 py-3"
          />

          <LocationAutocomplete
            value={form.location.address}
            onSelect={({ address, lat, lng }) =>
              setForm((f) => ({
                ...f,
                location: { address, lat, lng },
              }))
            }
          />
        </div>

        {/* ================= RIGHT – RSVP Settings ================= */}
        <div className="border rounded-2xl p-6 bg-gray-50 shadow-sm sticky top-6 h-fit">

          <h3 className="font-semibold text-lg mb-5 text-center">
            ⚙️ הגדרות הזמנה
          </h3>

          <div className="grid gap-4">

            {Object.entries(form.invitationSettings.menuOptions).map(
              ([key, value]) => (
                <label
                  key={key}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border"
                >
                  <span>{MENU_LABELS[key]}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        invitationSettings: {
                          ...f.invitationSettings,
                          menuOptions: {
                            ...f.invitationSettings.menuOptions,
                            [key]: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                </label>
              )
            )}

            <label className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border">
              <span>אפשר לאורח להוסיף הערה</span>
              <input
                type="checkbox"
                checked={form.invitationSettings.allowGuestNote}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    invitationSettings: {
                      ...f.invitationSettings,
                      allowGuestNote: e.target.checked,
                    },
                  }))
                }
              />
            </label>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={addCustomOption}
                className="text-sm text-[#c9b48f] font-semibold hover:underline"
              >
                + הוסף אופציה מותאמת
              </button>
            </div>

            {form.invitationSettings.customOptions.map(
              (opt, i) => (
                <div
                  key={opt.key}
                  className="bg-white border rounded-xl p-4"
                >
                  <input
                    placeholder="שם האופציה"
                    value={opt.label}
                    onChange={(e) =>
                      updateCustomOption(
                        i,
                        "label",
                        e.target.value
                      )
                    }
                    className="border rounded px-3 py-2 w-full mb-3"
                  />

                  <select
                    value={opt.type}
                    onChange={(e) =>
                      updateCustomOption(
                        i,
                        "type",
                        e.target.value
                      )
                    }
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="checkbox">
                      צ'קבוקס
                    </option>
                    <option value="text">
                      שדה טקסט
                    </option>
                  </select>
                </div>
              )
            )}

          </div>
        </div>

      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-4 mt-10">
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
          className="bg-[#c9b48f] text-white px-10 py-3 rounded-full font-semibold hover:opacity-90"
        >
          שמירה
        </button>
      </div>
    </div>
  );
}
