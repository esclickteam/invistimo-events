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
  event?: any | null; // בפועל זה Invitation
  onSaved: () => void;
  onClose?: () => void;
};

export default function EventDetailsForm({
  event,
  onSaved,
  onClose,
}: Props) {
  const [saving, setSaving] = useState(false);

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
     🔄 Sync Invitation → Local State
  ============================================================ */
  useEffect(() => {
    if (!event) return;

    setForm({
      title: event.title ?? "",
      eventType: event.eventType ?? "wedding",
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
     💾 Save → UPDATE Invitation
  ============================================================ */
  async function save() {
    if (!event?._id) return;

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        eventType: form.eventType,
        eventDate: form.date,
        eventTime: form.time,
        location: {
          address: form.location.address,
          lat: form.location.lat,
          lng: form.location.lng,
        },
      };

      const res = await fetch(`/api/invitations/${event._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      console.error("Save failed:", err);
      alert("❌ שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div
      dir="rtl"
      className="
        relative
        w-full
        max-w-[760px]
        mx-auto
        overflow-hidden
        rounded-[34px]
        border
        border-[#E3D0B8]
        bg-[#FFFDF9]
        shadow-[0_24px_75px_rgba(92,65,35,0.16)]
      "
    >
      {/* רקע עדין */}
      <div
        className="
          pointer-events-none
          absolute
          -left-24
          -top-24
          h-64
          w-64
          rounded-full
          bg-[#D9B46F]/24
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-28
          -bottom-28
          h-72
          w-72
          rounded-full
          bg-[#B8844F]/14
          blur-3xl
        "
      />

      {/* Header */}
      <div
        className="
          relative
          z-10
          border-b
          border-[#EFE4D6]
          bg-gradient-to-l
          from-[#F8EBD7]
          via-[#FFF8EE]
          to-[#FFFFFF]
          px-7
          py-6
        "
      >
        <div
          className="
            mb-3
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[#D9B46F]/45
            bg-white/75
            px-4
            py-1.5
            text-xs
            font-black
            text-[#8B5E34]
            shadow-sm
          "
        >
          ✨ פרטי אירוע
        </div>

        <h2 className="text-2xl font-black tracking-tight text-[#241A14]">
          עריכת פרטי האירוע
        </h2>

        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#8A7B69]">
          עדכני את שם האירוע, סוג האירוע, תאריך, שעה ומיקום — כל הפרטים יוצגו
          בדשבורד ובהזמנה.
        </p>
      </div>

      {/* Body */}
      <div className="relative z-10 px-7 py-6">
        <div className="grid gap-5">
          {/* שם האירוע */}
          <div className="flex flex-col gap-2">
            <label className="px-1 text-sm font-black text-[#6B5B4A]">
              שם האירוע
            </label>

            <input
              placeholder="לדוגמה: גל ואורנית"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="
                h-[56px]
                w-full
                rounded-[20px]
                border
                border-[#E3D6C3]
                bg-[#FCFAF6]
                px-5
                text-base
                font-bold
                text-[#241A14]
                outline-none
                transition
                placeholder:text-[#B0A79D]
                focus:border-[#B8844F]
                focus:bg-white
                focus:ring-4
                focus:ring-[#D9B46F]/15
              "
            />
          </div>

          {/* סוג האירוע */}
          <div className="flex flex-col gap-2">
            <label className="px-1 text-sm font-black text-[#6B5B4A]">
              סוג האירוע
            </label>

            <select
              value={form.eventType}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventType: e.target.value }))
              }
              className="
                h-[56px]
                w-full
                rounded-[20px]
                border
                border-[#E3D6C3]
                bg-[#FCFAF6]
                px-5
                text-base
                font-bold
                text-[#241A14]
                outline-none
                transition
                focus:border-[#B8844F]
                focus:bg-white
                focus:ring-4
                focus:ring-[#D9B46F]/15
              "
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* תאריך + שעה */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="px-1 text-sm font-black text-[#6B5B4A]">
                תאריך האירוע
              </label>

              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="
                  h-[56px]
                  w-full
                  rounded-[20px]
                  border
                  border-[#E3D6C3]
                  bg-[#FCFAF6]
                  px-5
                  text-base
                  font-bold
                  text-[#241A14]
                  outline-none
                  transition
                  focus:border-[#B8844F]
                  focus:bg-white
                  focus:ring-4
                  focus:ring-[#D9B46F]/15
                "
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="px-1 text-sm font-black text-[#6B5B4A]">
                שעת האירוע
              </label>

              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, time: e.target.value }))
                }
                className="
                  h-[56px]
                  w-full
                  rounded-[20px]
                  border
                  border-[#E3D6C3]
                  bg-[#FCFAF6]
                  px-5
                  text-base
                  font-bold
                  text-[#241A14]
                  outline-none
                  transition
                  focus:border-[#B8844F]
                  focus:bg-white
                  focus:ring-4
                  focus:ring-[#D9B46F]/15
                "
              />
            </div>
          </div>

          {/* מיקום */}
          <div className="rounded-[24px] border border-[#EFE4D6] bg-white/75 p-4 shadow-[0_10px_30px_rgba(91,63,31,0.06)]">
            <label className="mb-2 block px-1 text-sm font-black text-[#6B5B4A]">
              מיקום האירוע
            </label>

            <div
              className="
                rounded-[20px]
                border
                border-[#E3D6C3]
                bg-[#FCFAF6]
                px-1
                py-1
                transition
                focus-within:border-[#B8844F]
                focus-within:bg-white
                focus-within:ring-4
                focus-within:ring-[#D9B46F]/15
              "
            >
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

            <p className="mt-3 px-1 text-xs font-semibold text-[#9B8D7D]">
              ניתן לבחור מיקום מהרשימה או להקליד ידנית
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="
          relative
          z-10
          flex
          flex-col-reverse
          gap-3
          border-t
          border-[#EFE4D6]
          bg-[#FCFAF6]
          px-7
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-end
        "
      >
        {onClose && (
          <button
            onClick={onClose}
            disabled={saving}
            className="
              h-[48px]
              rounded-2xl
              bg-white
              px-7
              text-sm
              font-black
              text-[#6B5B4A]
              shadow-sm
              transition
              hover:bg-[#F3EEE7]
              disabled:opacity-60
            "
          >
            ביטול
          </button>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="
            h-[48px]
            rounded-2xl
            bg-gradient-to-l
            from-[#B8844F]
            via-[#D4A762]
            to-[#E7C98D]
            px-9
            text-sm
            font-black
            text-white
            shadow-[0_14px_30px_rgba(184,132,79,0.30)]
            transition
            hover:-translate-y-0.5
            hover:shadow-[0_18px_38px_rgba(184,132,79,0.38)]
            disabled:cursor-not-allowed
            disabled:opacity-55
          "
        >
          {saving ? "שומר..." : "שמירה"}
        </button>
      </div>
    </div>
  );
}