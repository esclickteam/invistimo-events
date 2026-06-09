"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  ImagePlus,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
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

type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

export default function EventDetailsForm({
  event,
  onSaved,
  onClose,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [uploadingCoupleImage, setUploadingCoupleImage] = useState(false);

  const [form, setForm] = useState({
    title: "",
    eventType: "wedding",
    date: "",
    time: "",
    location: {
      name: "",
      address: "",
      lat: null as number | null,
      lng: null as number | null,
    },
    publicEventPage: {
      enabled: true,
      gifts: {
        creditUrl: "",
        payboxUrl: "",
        bitPhone: "",
      },
      parking: {
        enabled: false,
        name: "",
        address: "",
        lat: null as number | null,
        lng: null as number | null,
        instructions: "",
      },
      schedule: {
        enabled: false,
        items: [] as ScheduleItem[],
      },
      coupleImage: {
        enabled: false,
        url: "",
        publicId: "",
      },
      note: {
        enabled: true,
        text: "האירוע מתקיים בהתאם להנחיות פיקוד העורף, יש מרחב מוגן במקום.",
      },
    },
  });

  /* ============================================================
     🔄 Sync Invitation → Local State
  ============================================================ */
  useEffect(() => {
    if (!event) return;

    const scheduleItems = Array.isArray(event.publicEventPage?.schedule?.items)
      ? event.publicEventPage.schedule.items.map((item: any) => ({
          time: item?.time ?? "",
          title: item?.title ?? "",
          description: item?.description ?? "",
        }))
      : [];

    setForm({
      title: event.title ?? "",
      eventType: event.eventType ?? "wedding",
      date: event.eventDate
        ? new Date(event.eventDate).toISOString().slice(0, 10)
        : "",
      time: event.eventTime ?? "",
      location: {
        name: event.location?.name ?? "",
        address: event.location?.address ?? "",
        lat: event.location?.lat ?? null,
        lng: event.location?.lng ?? null,
      },
      publicEventPage: {
        enabled: event.publicEventPage?.enabled !== false,
        gifts: {
          creditUrl: event.publicEventPage?.gifts?.creditUrl ?? "",
          payboxUrl: event.publicEventPage?.gifts?.payboxUrl ?? "",
          bitPhone: event.publicEventPage?.gifts?.bitPhone ?? "",
        },
        parking: {
          enabled: event.publicEventPage?.parking?.enabled === true,
          name: event.publicEventPage?.parking?.name ?? "",
          address: event.publicEventPage?.parking?.address ?? "",
          lat: event.publicEventPage?.parking?.lat ?? null,
          lng: event.publicEventPage?.parking?.lng ?? null,
          instructions: event.publicEventPage?.parking?.instructions ?? "",
        },
        schedule: {
          enabled: event.publicEventPage?.schedule?.enabled === true,
          items: scheduleItems,
        },
        coupleImage: {
          enabled: event.publicEventPage?.coupleImage?.enabled === true,
          url: event.publicEventPage?.coupleImage?.url ?? "",
          publicId: event.publicEventPage?.coupleImage?.publicId ?? "",
        },
        note: {
          enabled: event.publicEventPage?.note?.enabled !== false,
          text:
            event.publicEventPage?.note?.text ??
            "האירוע מתקיים בהתאם להנחיות פיקוד העורף, יש מרחב מוגן במקום.",
        },
      },
    });
  }, [event]);

  /* ============================================================
     🖼 Upload couple/event image
  ============================================================ */
  async function uploadCoupleImage(file: File) {
    if (!event?._id) return;

    if (!file.type.startsWith("image/")) {
      alert("אפשר להעלות קובץ תמונה בלבד");
      return;
    }

    try {
      setUploadingCoupleImage(true);

      const imageBase64 = await readFileAsBase64(file);

      const res = await fetch(
        `/api/invitations/${event._id}/public-page-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageBase64 }),
        }
      );

      const data = await res.json();

      if (!data?.success || !data?.url) {
        alert("❌ שגיאה בהעלאת התמונה");
        return;
      }

      setForm((f) => ({
        ...f,
        publicEventPage: {
          ...f.publicEventPage,
          coupleImage: {
            enabled: true,
            url: data.url,
            publicId: data.publicId || "",
          },
        },
      }));
    } catch (err) {
      console.error("Couple image upload failed:", err);
      alert("❌ שגיאה בהעלאת התמונה");
    } finally {
      setUploadingCoupleImage(false);
    }
  }

  function addScheduleItem() {
    setForm((f) => ({
      ...f,
      publicEventPage: {
        ...f.publicEventPage,
        schedule: {
          ...f.publicEventPage.schedule,
          enabled: true,
          items: [
            ...f.publicEventPage.schedule.items,
            {
              time: "",
              title: "",
              description: "",
            },
          ],
        },
      },
    }));
  }

  function updateScheduleItem(
    index: number,
    field: keyof ScheduleItem,
    value: string
  ) {
    setForm((f) => {
      const items = [...f.publicEventPage.schedule.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...f,
        publicEventPage: {
          ...f.publicEventPage,
          schedule: {
            ...f.publicEventPage.schedule,
            items,
          },
        },
      };
    });
  }

  function removeScheduleItem(index: number) {
    setForm((f) => {
      const items = f.publicEventPage.schedule.items.filter(
        (_, i) => i !== index
      );

      return {
        ...f,
        publicEventPage: {
          ...f.publicEventPage,
          schedule: {
            ...f.publicEventPage.schedule,
            items,
          },
        },
      };
    });
  }

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
          name: form.location.name,
          address: form.location.address,
          lat: form.location.lat,
          lng: form.location.lng,
        },
        publicEventPage: {
          enabled: form.publicEventPage.enabled,
          gifts: {
            creditUrl: form.publicEventPage.gifts.creditUrl.trim(),
            payboxUrl: form.publicEventPage.gifts.payboxUrl.trim(),
            bitPhone: form.publicEventPage.gifts.bitPhone.trim(),
            bitUrl: "",
          },
          parking: {
            enabled: form.publicEventPage.parking.enabled,
            name: form.publicEventPage.parking.name.trim(),
            address: form.publicEventPage.parking.address.trim(),
            lat: form.publicEventPage.parking.lat,
            lng: form.publicEventPage.parking.lng,
            instructions: form.publicEventPage.parking.instructions.trim(),
          },
          schedule: {
            enabled: form.publicEventPage.schedule.enabled,
            items: form.publicEventPage.schedule.items
              .map((item) => ({
                time: item.time.trim(),
                title: item.title.trim(),
                description: item.description.trim(),
              }))
              .filter(
                (item) => item.time || item.title || item.description
              ),
          },
          coupleImage: {
            enabled: form.publicEventPage.coupleImage.enabled,
            url: form.publicEventPage.coupleImage.url.trim(),
            publicId: form.publicEventPage.coupleImage.publicId.trim(),
          },
          note: {
            enabled: form.publicEventPage.note.enabled,
            text: form.publicEventPage.note.text.trim(),
          },
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
          עדכנו את שם האירוע, סוג האירוע, תאריך, שעה ומיקום — כל הפרטים יוצגו
          בדשבורד, בהזמנה ובעמוד המידע הציבורי לאורחים.
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
                value={
                  form.location.name && form.location.address
                    ? `${form.location.name}, ${form.location.address}`
                    : form.location.name || form.location.address
                }
                onSelect={({ name, address, lat, lng }) =>
                  setForm((f) => ({
                    ...f,
                    location: {
                      name: name || address,
                      address,
                      lat,
                      lng,
                    },
                  }))
                }
              />
            </div>

            <p className="mt-3 px-1 text-xs font-semibold text-[#9B8D7D]">
              ניתן לבחור מיקום מהרשימה או להקליד ידנית
            </p>
          </div>

          {/* עמוד מידע ציבורי */}
          <div className="rounded-[28px] border border-[#E8D7C2] bg-[#FFF9F1] p-5 shadow-[0_14px_38px_rgba(91,63,31,0.07)]">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div
                  className="
                    mb-2
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#D9B46F]/45
                    bg-white/80
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-[#8B5E34]
                  "
                >
                  🔗 עמוד מידע לאורחים
                </div>

                <h3 className="text-lg font-black text-[#241A14]">
                  קישור ציבורי לניווט, לו״ז ומתנות
                </h3>

                <p className="mt-1 text-xs font-semibold leading-6 text-[#8A7B69]">
                  בעמוד הזה יוצגו פרטי האירוע, ניווט, חניה, לו״ז, מתנות ותמונה —
                  רק אם הוגדרו. הקישור לא אישי ולא קשור לאישור ההגעה.
                </p>

                {event?.shareId && (
                  <a
                    href={`/e/${event.shareId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      mt-3
                      inline-flex
                      h-[44px]
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-[#D9B46F]/60
                      bg-white
                      px-5
                      text-sm
                      font-black
                      text-[#8B5E34]
                      shadow-sm
                      transition
                      hover:bg-[#FFF7EA]
                    "
                  >
                    צפייה בעמוד פרטי אירוע
                  </a>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E3D6C3] bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.publicEventPage.enabled}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      publicEventPage: {
                        ...f.publicEventPage,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 accent-[#B8844F]"
                />

                <span className="text-sm font-black text-[#6B5B4A]">
                  העמוד פעיל
                </span>
              </label>
            </div>

            <div className="grid gap-4">
              {/* Gifts */}
              <div className="rounded-[22px] border border-[#EFE4D6] bg-white/80 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-lg">🎁</span>
                  <h4 className="text-sm font-black text-[#6B5B4A]">
                    מתנות לאורחים
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="px-1 text-sm font-black text-[#6B5B4A]">
                      קישור מתנה באשראי
                    </label>

                    <input
                      placeholder="https://..."
                      value={form.publicEventPage.gifts.creditUrl}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          publicEventPage: {
                            ...f.publicEventPage,
                            gifts: {
                              ...f.publicEventPage.gifts,
                              creditUrl: e.target.value,
                            },
                          },
                        }))
                      }
                      className="
                        h-[52px]
                        w-full
                        rounded-[18px]
                        border
                        border-[#E3D6C3]
                        bg-[#FCFAF6]
                        px-4
                        text-sm
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

                  <div className="flex flex-col gap-2">
                    <label className="px-1 text-sm font-black text-[#6B5B4A]">
                      קישור PayBox
                    </label>

                    <input
                      placeholder="https://..."
                      value={form.publicEventPage.gifts.payboxUrl}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          publicEventPage: {
                            ...f.publicEventPage,
                            gifts: {
                              ...f.publicEventPage.gifts,
                              payboxUrl: e.target.value,
                            },
                          },
                        }))
                      }
                      className="
                        h-[52px]
                        w-full
                        rounded-[18px]
                        border
                        border-[#E3D6C3]
                        bg-[#FCFAF6]
                        px-4
                        text-sm
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
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <label className="px-1 text-sm font-black text-[#6B5B4A]">
                    מספר Bit
                  </label>

                  <input
                    placeholder="לדוגמה: 0501234567"
                    value={form.publicEventPage.gifts.bitPhone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        publicEventPage: {
                          ...f.publicEventPage,
                          gifts: {
                            ...f.publicEventPage.gifts,
                            bitPhone: e.target.value,
                          },
                        },
                      }))
                    }
                    className="
                      h-[52px]
                      w-full
                      rounded-[18px]
                      border
                      border-[#E3D6C3]
                      bg-[#FCFAF6]
                      px-4
                      text-sm
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

                  <p className="px-1 text-xs font-semibold leading-6 text-[#9B8D7D]">
                    בעמוד הציבורי יוצג מספר הביט עם כפתור העתקה בלבד.
                  </p>
                </div>
              </div>

              {/* Parking */}
              <div className="rounded-[22px] border border-[#EFE4D6] bg-white/80 p-4">
                <label className="mb-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.publicEventPage.parking.enabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        publicEventPage: {
                          ...f.publicEventPage,
                          parking: {
                            ...f.publicEventPage.parking,
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="h-4 w-4 accent-[#B8844F]"
                  />

                  <span className="text-sm font-black text-[#6B5B4A]">
                    הצגת מיקום חניה נוסף
                  </span>
                </label>

                {form.publicEventPage.parking.enabled && (
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="px-1 text-sm font-black text-[#6B5B4A]">
                        מיקום החניה
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
                          value={
                            form.publicEventPage.parking.name &&
                            form.publicEventPage.parking.address
                              ? `${form.publicEventPage.parking.name}, ${form.publicEventPage.parking.address}`
                              : form.publicEventPage.parking.name ||
                                form.publicEventPage.parking.address
                          }
                          onSelect={({ name, address, lat, lng }) =>
                            setForm((f) => ({
                              ...f,
                              publicEventPage: {
                                ...f.publicEventPage,
                                parking: {
                                  ...f.publicEventPage.parking,
                                  name: name || address,
                                  address,
                                  lat,
                                  lng,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="px-1 text-sm font-black text-[#6B5B4A]">
                        הוראות לחניה
                      </label>

                      <textarea
                        rows={3}
                        placeholder="לדוגמה: החניה נמצאת מאחורי האולם, כניסה מרחוב..."
                        value={form.publicEventPage.parking.instructions}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            publicEventPage: {
                              ...f.publicEventPage,
                              parking: {
                                ...f.publicEventPage.parking,
                                instructions: e.target.value,
                              },
                            },
                          }))
                        }
                        className="
                          w-full
                          resize-none
                          rounded-[18px]
                          border
                          border-[#E3D6C3]
                          bg-[#FCFAF6]
                          px-4
                          py-3
                          text-sm
                          font-bold
                          leading-7
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
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="rounded-[22px] border border-[#EFE4D6] bg-white/80 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.publicEventPage.schedule.enabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          publicEventPage: {
                            ...f.publicEventPage,
                            schedule: {
                              ...f.publicEventPage.schedule,
                              enabled: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="h-4 w-4 accent-[#B8844F]"
                    />

                    <span className="flex items-center gap-2 text-sm font-black text-[#6B5B4A]">
                      <CalendarClock className="h-4 w-4 text-[#B8844F]" />
                      הצגת לו״ז אירוע
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={addScheduleItem}
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      bg-[#2F2924]
                      px-4
                      text-xs
                      font-black
                      text-white
                      shadow-sm
                      transition
                      hover:-translate-y-0.5
                    "
                  >
                    <Plus className="h-4 w-4" />
                    הוספת שורה
                  </button>
                </div>

                {form.publicEventPage.schedule.enabled && (
                  <div className="grid gap-3">
                    {form.publicEventPage.schedule.items.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-[#D8C8B6] bg-[#FCFAF6] px-4 py-5 text-center">
                        <p className="text-sm font-black text-[#6B5B4A]">
                          עדיין לא נוספו שלבים ללו״ז
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#9B8D7D]">
                          לחצו על “הוספת שורה” כדי להוסיף קבלת פנים, חופה, ארוחה,
                          ריקודים ועוד.
                        </p>
                      </div>
                    )}

                    {form.publicEventPage.schedule.items.map((item, index) => (
                      <div
                        key={index}
                        className="
                          rounded-[22px]
                          border
                          border-[#E8D7C2]
                          bg-[#FFFDF9]
                          p-4
                          shadow-[0_10px_26px_rgba(91,63,31,0.05)]
                        "
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-[#F8EBD7] px-3 py-1 text-xs font-black text-[#8B5E34]">
                            שלב {index + 1}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeScheduleItem(index)}
                            className="
                              inline-flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-xl
                              bg-[#FFF1F1]
                              text-[#B94D63]
                              transition
                              hover:bg-[#FFE2E2]
                            "
                            aria-label="מחיקת שורה"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
                          <div className="flex flex-col gap-2">
                            <label className="px-1 text-xs font-black text-[#6B5B4A]">
                              שעה
                            </label>

                            <input
                              type="time"
                              value={item.time}
                              onChange={(e) =>
                                updateScheduleItem(index, "time", e.target.value)
                              }
                              className="
                                h-[48px]
                                rounded-[16px]
                                border
                                border-[#E3D6C3]
                                bg-[#FCFAF6]
                                px-3
                                text-sm
                                font-black
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
                            <label className="px-1 text-xs font-black text-[#6B5B4A]">
                              כותרת
                            </label>

                            <input
                              placeholder="לדוגמה: קבלת פנים / חופה / ריקודים"
                              value={item.title}
                              onChange={(e) =>
                                updateScheduleItem(index, "title", e.target.value)
                              }
                              className="
                                h-[48px]
                                rounded-[16px]
                                border
                                border-[#E3D6C3]
                                bg-[#FCFAF6]
                                px-4
                                text-sm
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
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                          <label className="px-1 text-xs font-black text-[#6B5B4A]">
                            תיאור קצר
                          </label>

                          <input
                            placeholder="לדוגמה: קבלת אורחים וצילומים"
                            value={item.description}
                            onChange={(e) =>
                              updateScheduleItem(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="
                              h-[48px]
                              rounded-[16px]
                              border
                              border-[#E3D6C3]
                              bg-[#FCFAF6]
                              px-4
                              text-sm
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Couple image */}
              <div className="rounded-[22px] border border-[#EFE4D6] bg-white/80 p-4">
                <label className="mb-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.publicEventPage.coupleImage.enabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        publicEventPage: {
                          ...f.publicEventPage,
                          coupleImage: {
                            ...f.publicEventPage.coupleImage,
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="h-4 w-4 accent-[#B8844F]"
                  />

                  <span className="flex items-center gap-2 text-sm font-black text-[#6B5B4A]">
                    <ImagePlus className="h-4 w-4 text-[#B8844F]" />
                    הצגת תמונת זוג / תמונת אירוע בסוף העמוד
                  </span>
                </label>

                <div className="grid gap-4 md:grid-cols-[170px_1fr]">
                  <div className="overflow-hidden rounded-[22px] border border-[#E3D6C3] bg-[#FCFAF6]">
                    {form.publicEventPage.coupleImage.url ? (
                      <img
                        src={form.publicEventPage.coupleImage.url}
                        alt="תמונת זוג / אירוע"
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 text-[#9B8D7D]">
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-xs font-black">
                          אין תמונה
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center gap-3">
                    <label
                      className="
                        inline-flex
                        h-12
                        cursor-pointer
                        items-center
                        justify-center
                        gap-2
                        rounded-2xl
                        border
                        border-[#D9B46F]/60
                        bg-white
                        px-5
                        text-sm
                        font-black
                        text-[#8B5E34]
                        shadow-sm
                        transition
                        hover:bg-[#FFF7EA]
                      "
                    >
                      <UploadCloud className="h-4 w-4" />
                      {uploadingCoupleImage ? "מעלה תמונה..." : "העלאת תמונה"}

                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingCoupleImage}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];

                          if (file) {
                            uploadCoupleImage(file);
                          }

                          e.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {form.publicEventPage.coupleImage.url && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            publicEventPage: {
                              ...f.publicEventPage,
                              coupleImage: {
                                enabled: false,
                                url: "",
                                publicId: "",
                              },
                            },
                          }))
                        }
                        className="
                          inline-flex
                          h-11
                          items-center
                          justify-center
                          rounded-2xl
                          bg-[#FFF1F1]
                          px-5
                          text-sm
                          font-black
                          text-[#B94D63]
                          transition
                          hover:bg-[#FFE2E2]
                        "
                      >
                        הסרת תמונה
                      </button>
                    )}

                    <p className="text-xs font-semibold leading-6 text-[#9B8D7D]">
                      התמונה תוצג בסוף עמוד פרטי האירוע, רק אם האפשרות מסומנת.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="rounded-[22px] border border-[#EFE4D6] bg-white/80 p-4">
                <label className="mb-3 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.publicEventPage.note.enabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        publicEventPage: {
                          ...f.publicEventPage,
                          note: {
                            ...f.publicEventPage.note,
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="h-4 w-4 accent-[#B8844F]"
                  />

                  <span className="text-sm font-black text-[#6B5B4A]">
                    הצגת הודעת פיקוד העורף / הערה לאורחים
                  </span>
                </label>

                <textarea
                  rows={3}
                  value={form.publicEventPage.note.text}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      publicEventPage: {
                        ...f.publicEventPage,
                        note: {
                          ...f.publicEventPage.note,
                          text: e.target.value,
                        },
                      },
                    }))
                  }
                  className="
                    w-full
                    resize-none
                    rounded-[18px]
                    border
                    border-[#E3D6C3]
                    bg-[#FCFAF6]
                    px-4
                    py-3
                    text-sm
                    font-bold
                    leading-7
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

              <p className="px-1 text-xs font-semibold leading-6 text-[#9B8D7D]">
                אם לא יוזן קישור מתנה, PayBox או מספר Bit — אזור המתנות לא יופיע
                בעמוד הציבורי.
              </p>
            </div>
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
          disabled={saving || uploadingCoupleImage}
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