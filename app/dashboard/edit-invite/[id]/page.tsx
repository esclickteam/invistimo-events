"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

/* =========================================================
   Types
========================================================= */

type InviteImageMode = "portrait" | "square";

type EventType =
  | "wedding"
  | "bar-mitzvah"
  | "bat-mitzvah"
  | "brit"
  | "brita"
  | "henna"
  | "other";

type ImageInfo = {
  width: number;
  height: number;
  aspectRatio: number;
};

type UploadedImageState = {
  file: File;
  base64: string;
  info: ImageInfo | null;
};

type PublicVenueHall = {
  venueOwnerId: string;
  venueHallId: string;
  venueHallName: string;
  name: string;
  subtitle: string;
  capacity: number;
  status: string;
  image: string;
  ownerName: string;
};

type EventForm = {
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventDate: string;
  eventTime: string;
  estimatedGuests: string;
  locationAddress: string;

  venueOwnerId: string;
  venueHallId: string;
  venueHallName: string;
};

/* =========================================================
   Helpers
========================================================= */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("FILE_READ_FAILED"));
    };

    reader.readAsDataURL(file);
  });
}

function getImageInfo(src: string): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      resolve({
        width,
        height,
        aspectRatio: width && height ? width / height : 0,
      });
    };

    img.onerror = () => {
      reject(new Error("IMAGE_LOAD_FAILED"));
    };

    img.src = src;
  });
}

function getRecommendedText(mode: InviteImageMode) {
  if (mode === "square") {
    return "מומלץ להעלות תמונה מרובעת באיכות 1080×1080 לפחות";
  }

  return "מומלץ להעלות תמונה לאורך באיכות 1080×1920 לפחות";
}

function getImageQualityStatus(info: ImageInfo | null, mode: InviteImageMode) {
  if (!info) return null;

  if (mode === "square") {
    if (info.width >= 1080 && info.height >= 1080) {
      return {
        level: "good",
        text: "איכות מצוינת לתצוגה בנייד",
      };
    }

    return {
      level: "warning",
      text: "מומלץ להעלות קובץ מרובע גדול וברור יותר",
    };
  }

  if (info.width >= 1080 && info.height >= 1920) {
    return {
      level: "good",
      text: "איכות מצוינת להזמנה לאורך",
    };
  }

  if (info.width >= 720 && info.height >= 1280) {
    return {
      level: "medium",
      text: "איכות טובה, אבל 1080×1920 תיראה חדה יותר",
    };
  }

  return {
    level: "warning",
    text: "התמונה קטנה יחסית. מומלץ להעלות קובץ איכותי יותר",
  };
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEventType(value: unknown): EventType {
  const raw = String(value || "").trim();

  if (
    raw === "wedding" ||
    raw === "bar-mitzvah" ||
    raw === "bat-mitzvah" ||
    raw === "brit" ||
    raw === "brita" ||
    raw === "henna" ||
    raw === "other"
  ) {
    return raw;
  }

  return "wedding";
}

function getEventTypeLabel(type: EventType) {
  if (type === "wedding") return "חתונה";
  if (type === "bar-mitzvah") return "בר מצווה";
  if (type === "bat-mitzvah") return "בת מצווה";
  if (type === "brit") return "ברית";
  if (type === "brita") return "בריתה";
  if (type === "henna") return "חינה";
  return "אחר";
}

function getStringValue(...values: unknown[]) {
  for (const value of values) {
    const str = String(value || "").trim();
    if (str) return str;
  }

  return "";
}

/* =========================================================
   Component
========================================================= */

export default function EditInvitePage() {
  const params = useParams();
  const inviteId = params?.id as string | undefined;

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const phonePreviewRef = useRef<HTMLIFrameElement | null>(null);

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [venueHalls, setVenueHalls] = useState<PublicVenueHall[]>([]);
  const [loadingVenueHalls, setLoadingVenueHalls] = useState(false);
  const [venueHallsError, setVenueHallsError] = useState("");

  const [imageMode, setImageMode] = useState<InviteImageMode>("portrait");
  const [uploadedImage, setUploadedImage] = useState<UploadedImageState | null>(
    null
  );

  const [eventForm, setEventForm] = useState<EventForm>({
    eventId: "",
    eventTitle: "",
    eventType: "wedding",
    eventDate: "",
    eventTime: "",
    estimatedGuests: "",
    locationAddress: "",
    venueOwnerId: "",
    venueHallId: "",
    venueHallName: "",
  });

  const [dragActive, setDragActive] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  /* =========================================================
     Existing / current image
  ========================================================= */

  const existingImageUrl = useMemo(() => {
    return (
      invite?.previewImageUrl ||
      invite?.headerImageUrl ||
      invite?.imageUrl ||
      invite?.canvasImageUrl ||
      ""
    );
  }, [invite]);

  const displayImageUrl = uploadedImage?.base64 || existingImageUrl;

  const imageInfo = uploadedImage?.info || null;
  const qualityStatus = getImageQualityStatus(imageInfo, imageMode);

  const previewId = useMemo(() => {
    if (!invite) return "";
    return invite.shareId || invite._id || "";
  }, [invite]);

  const previewUrl = previewId ? `/invite/${previewId}` : "";

  const selectedVenueValue =
    eventForm.venueOwnerId && eventForm.venueHallId
      ? `${eventForm.venueOwnerId}__${eventForm.venueHallId}`
      : "";

  const selectedHall = useMemo(() => {
    if (!selectedVenueValue) return null;

    return (
      venueHalls.find(
        (hall) =>
          `${hall.venueOwnerId}__${hall.venueHallId}` === selectedVenueValue
      ) || null
    );
  }, [selectedVenueValue, venueHalls]);

  const updateEventField = <K extends keyof EventForm>(
    key: K,
    value: EventForm[K]
  ) => {
    setEventForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const fetchVenueHalls = async () => {
    try {
      setLoadingVenueHalls(true);
      setVenueHallsError("");

      const res = await fetch("/api/venues/public/halls", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת אולמות נכשלה");
      }

      setVenueHalls(Array.isArray(data.halls) ? data.halls : []);
    } catch (error) {
      console.error("GET /api/venues/public/halls failed:", error);
      setVenueHalls([]);
      setVenueHallsError("לא הצלחתי לטעון את רשימת האולמות");
    } finally {
      setLoadingVenueHalls(false);
    }
  };

  /* =========================================================
     Send live preview update into iframe
  ========================================================= */

  const sendLivePreviewToIframe = useCallback(() => {
    if (!phonePreviewRef.current?.contentWindow) return;

    phonePreviewRef.current.contentWindow.postMessage(
      {
        type: "INVISTIMO_PREVIEW_IMAGE_UPDATE",
        imageUrl: displayImageUrl,
        imageMode,
      },
      window.location.origin
    );
  }, [displayImageUrl, imageMode]);

  useEffect(() => {
    fetchVenueHalls();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sendLivePreviewToIframe();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [sendLivePreviewToIframe]);

  /* =========================================================
     Load invitation
  ========================================================= */

  useEffect(() => {
    if (!inviteId) {
      setLoading(false);
      return;
    }

    async function loadInvitation() {
      try {
        const res = await fetch(`/api/invitations/${inviteId}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.invitation) {
          alert("❌ שגיאה בטעינת ההזמנה");
          return;
        }

        const invitation = data.invitation;
        const linkedEvent =
          data.event || invitation.event || invitation.linkedEvent || null;

        setInvite(invitation);

        if (invitation?.orientation === "square") {
          setImageMode("square");
        } else {
          setImageMode("portrait");
        }

        setEventForm({
          eventId: getStringValue(
            invitation.eventId,
            invitation.productionEventId,
            invitation.linkedEventId,
            linkedEvent?._id,
            linkedEvent?.id
          ),
          eventTitle: getStringValue(
            linkedEvent?.title,
            invitation.eventTitle,
            invitation.title
          ),
          eventType: normalizeEventType(
            linkedEvent?.eventType || invitation.eventType
          ),
          eventDate: getStringValue(
            linkedEvent?.date,
            invitation.eventDate,
            invitation.date
          ),
          eventTime: getStringValue(
            linkedEvent?.time,
            invitation.eventTime,
            invitation.time
          ),
          estimatedGuests: getStringValue(
            linkedEvent?.estimatedGuestCount,
            linkedEvent?.estimatedGuests,
            linkedEvent?.maxGuests,
            invitation.estimatedGuests,
            invitation.maxGuests
          ),
          locationAddress: getStringValue(
            linkedEvent?.location?.address,
            invitation.location?.address,
            invitation.location
          ),
          venueOwnerId: getStringValue(
            linkedEvent?.venueOwnerId,
            invitation.venueOwnerId
          ),
          venueHallId: getStringValue(
            linkedEvent?.venueHallId,
            invitation.venueHallId
          ),
          venueHallName: getStringValue(
            linkedEvent?.venueHallName,
            invitation.venueHallName
          ),
        });
      } catch {
        alert("❌ שגיאה בטעינת ההזמנה");
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [inviteId]);

  /* =========================================================
     Upload image
  ========================================================= */

  const handleImageFile = async (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("ניתן להעלות קובץ תמונה בלבד");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (!allowedTypes.includes(file.type)) {
      alert("ניתן להעלות JPG, PNG או WEBP בלבד");
      return;
    }

    const maxSizeMb = 12;
    const sizeMb = file.size / 1024 / 1024;

    if (sizeMb > maxSizeMb) {
      alert(`התמונה גדולה מדי. ניתן להעלות עד ${maxSizeMb}MB`);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const info = await getImageInfo(base64);

      setUploadedImage({
        file,
        base64,
        info,
      });

      if (info.width && info.height) {
        const ratio = info.width / info.height;

        if (ratio > 0.9 && ratio < 1.1) {
          setImageMode("square");
        } else {
          setImageMode("portrait");
        }
      }
    } catch {
      alert("❌ שגיאה בקריאת התמונה");
    }
  };

  /* =========================================================
     Save invitation + Event connection
  ========================================================= */

  const handleSave = async () => {
    if (!inviteId || !invite) return;

    if (!displayImageUrl) {
      alert("צריך להעלות תמונת הזמנה לפני שמירה");
      return;
    }

    if (!eventForm.eventTitle.trim()) {
      alert("חובה להזין שם אירוע");
      return;
    }

    if (!eventForm.eventDate.trim()) {
      alert("חובה להזין תאריך אירוע");
      return;
    }

    if (!eventForm.eventTime.trim()) {
      alert("חובה להזין שעה");
      return;
    }

    if (!eventForm.venueOwnerId.trim() || !eventForm.venueHallId.trim()) {
      alert("חובה לבחור אולם מהרשימה");
      return;
    }

    try {
      setSaving(true);

      const body: any = {
        title: eventForm.eventTitle.trim(),
        orientation: imageMode,
        imageMode,

        canvasData: invite.canvasData || { objects: [] },

        createEvent: true,
        eventId: eventForm.eventId || undefined,
        eventTitle: eventForm.eventTitle.trim(),
        eventType: eventForm.eventType,
        eventDate: eventForm.eventDate,
        eventTime: eventForm.eventTime,
        estimatedGuests: Math.max(0, toNumber(eventForm.estimatedGuests, 0)),
        location: {
          address: eventForm.locationAddress.trim(),
        },

        venueOwnerId: eventForm.venueOwnerId.trim(),
        venueHallId: eventForm.venueHallId.trim(),
        venueHallName: eventForm.venueHallName.trim(),
      };

      /*
        שולחים תמונה חדשה רק אם הועלה קובץ חדש.
        השרת ממשיך להעלות ל-Cloudinary ולעדכן previewImageUrl/headerImageUrl.
      */
      if (uploadedImage?.base64) {
        body.previewBase64 = uploadedImage.base64;
      }

      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert(result.error || result.message || "❌ שגיאה בשמירה");
        return;
      }

      setInvite(result.invitation);

      const updatedInvitation = result.invitation || {};
      const updatedEvent = result.event || updatedInvitation.event || null;

      setEventForm((prev) => ({
        ...prev,
        eventId: getStringValue(
          updatedInvitation.eventId,
          updatedInvitation.productionEventId,
          updatedInvitation.linkedEventId,
          updatedEvent?._id,
          updatedEvent?.id,
          prev.eventId
        ),
        eventTitle: getStringValue(updatedEvent?.title, prev.eventTitle),
        eventType: normalizeEventType(updatedEvent?.eventType || prev.eventType),
        eventDate: getStringValue(updatedEvent?.date, prev.eventDate),
        eventTime: getStringValue(updatedEvent?.time, prev.eventTime),
        estimatedGuests: getStringValue(
          updatedEvent?.estimatedGuestCount,
          updatedEvent?.estimatedGuests,
          updatedEvent?.maxGuests,
          prev.estimatedGuests
        ),
        locationAddress: getStringValue(
          updatedEvent?.location?.address,
          prev.locationAddress
        ),
        venueOwnerId: getStringValue(
          updatedEvent?.venueOwnerId,
          prev.venueOwnerId
        ),
        venueHallId: getStringValue(updatedEvent?.venueHallId, prev.venueHallId),
        venueHallName: getStringValue(
          updatedEvent?.venueHallName,
          prev.venueHallName
        ),
      }));

      setUploadedImage(null);
      setPreviewRefreshKey((prev) => prev + 1);

      alert("✅ ההזמנה והאירוע עודכנו בהצלחה!");
    } catch {
      alert("❌ שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Preview
  ========================================================= */

  const handlePreview = () => {
    if (!previewUrl) {
      alert("לא נמצאה תצוגה מקדימה");
      return;
    }

    window.open(previewUrl, "_blank");
  };

  /* =========================================================
     Loading
  ========================================================= */

  if (loading || !invite) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#f8f4ee] flex items-center justify-center"
      >
        <div className="rounded-3xl bg-white px-8 py-7 shadow-xl border border-[#eadfce] text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-[#d7b98b] border-t-transparent animate-spin" />

          <p className="text-lg font-semibold text-[#3b2a1f]">
            טוען את ההזמנה...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     Render
  ========================================================= */

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6efe6] text-[#2d241c]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e6d9c7] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e1d3bf] bg-white text-lg shadow-sm hover:bg-[#faf6ef]"
              aria-label="חזרה"
            >
              →
            </button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a55]">
                Invistimo
              </p>

              <h1 className="truncate text-xl font-bold text-[#2d241c] md:text-2xl">
                עריכת הזמנה ואירוע
              </h1>

              <p className="mt-1 text-xs text-[#8a7967] md:text-sm">
                עדכון תמונת ההזמנה, פרטי ה־Event ושיוך לאולם.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-full border border-[#d8c7ad] bg-white px-5 py-2.5 text-sm font-semibold text-[#5a4634] shadow-sm hover:bg-[#fbf7f0]"
            >
              👁 תצוגה מקדימה
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg transition ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-l from-[#c79a55] to-[#8f6437] hover:shadow-xl"
              }`}
            >
              {saving ? "שומר..." : "💾 שמור"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Left side */}
          <div className="space-y-6">
            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-[0_24px_80px_rgba(71,48,25,0.08)] md:p-7">
              <div>
                <p className="text-sm font-semibold text-[#b58a55]">
                  פרטי האירוע
                </p>

                <h2 className="text-2xl font-black text-[#2d241c]">
                  חיבור ההזמנה ל־Event ולאולם
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#7b6a58]">
                  בחרי אולם מהרשימה. המערכת תשמור אוטומטית את בעל האולם,
                  מזהה האולם ושם האולם.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FormInput
                  label="eventId"
                  value={eventForm.eventId}
                  onChange={(value) => updateEventField("eventId", value)}
                  placeholder="אם כבר קיים Event — יוצג כאן"
                />

                <FormInput
                  label="שם האירוע"
                  value={eventForm.eventTitle}
                  onChange={(value) => updateEventField("eventTitle", value)}
                  placeholder="לדוגמה: החתונה של הדר ואור"
                />

                <label>
                  <span className="mb-2 block text-sm font-black text-[#6f6252]">
                    סוג אירוע
                  </span>

                  <select
                    value={eventForm.eventType}
                    onChange={(event) =>
                      updateEventField(
                        "eventType",
                        event.target.value as EventType
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#2b241c] outline-none transition focus:border-[#b98121]"
                  >
                    <option value="wedding">חתונה</option>
                    <option value="bar-mitzvah">בר מצווה</option>
                    <option value="bat-mitzvah">בת מצווה</option>
                    <option value="brit">ברית</option>
                    <option value="brita">בריתה</option>
                    <option value="henna">חינה</option>
                    <option value="other">אחר</option>
                  </select>
                </label>

                <FormInput
                  label="תאריך"
                  type="date"
                  value={eventForm.eventDate}
                  onChange={(value) => updateEventField("eventDate", value)}
                />

                <FormInput
                  label="שעה"
                  type="time"
                  value={eventForm.eventTime}
                  onChange={(value) => updateEventField("eventTime", value)}
                />

                <FormInput
                  label="כמות מוזמנים משוערת"
                  type="number"
                  value={eventForm.estimatedGuests}
                  onChange={(value) =>
                    updateEventField("estimatedGuests", value)
                  }
                  placeholder="לדוגמה: 350"
                />

                <FormInput
                  label="כתובת / שם מקום"
                  value={eventForm.locationAddress}
                  onChange={(value) =>
                    updateEventField("locationAddress", value)
                  }
                  placeholder="לדוגמה: אולם בראשית, נס ציונה"
                />
              </div>

              <div className="mt-6 rounded-[28px] border border-[#eadfce] bg-[#fff8eb] p-4">
                <div className="text-sm font-black text-[#2d241c]">
                  בחירת אולם
                </div>

                <p className="mt-1 text-xs font-bold leading-5 text-[#7b6a58]">
                  לאחר בחירה, האירוע יופיע בדשבורד וביומן של בעל האולם.
                </p>

                <div className="mt-4">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[#6f6252]">
                      אולם
                    </span>

                    <select
                      value={selectedVenueValue}
                      onChange={(event) => {
                        const selectedValue = event.target.value;

                        if (!selectedValue) {
                          updateEventField("venueOwnerId", "");
                          updateEventField("venueHallId", "");
                          updateEventField("venueHallName", "");
                          return;
                        }

                        const hall = venueHalls.find(
                          (item) =>
                            `${item.venueOwnerId}__${item.venueHallId}` ===
                            selectedValue
                        );

                        if (!hall) return;

                        updateEventField("venueOwnerId", hall.venueOwnerId);
                        updateEventField("venueHallId", hall.venueHallId);
                        updateEventField("venueHallName", hall.venueHallName);
                      }}
                      className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#2b241c] outline-none transition focus:border-[#b98121]"
                    >
                      <option value="">
                        {loadingVenueHalls ? "טוען אולמות..." : "בחרי אולם"}
                      </option>

                      {venueHalls.map((hall) => (
                        <option
                          key={`${hall.venueOwnerId}-${hall.venueHallId}`}
                          value={`${hall.venueOwnerId}__${hall.venueHallId}`}
                        >
                          {hall.name}
                          {hall.subtitle ? ` — ${hall.subtitle}` : ""}
                          {hall.capacity
                            ? ` · עד ${hall.capacity} אורחים`
                            : ""}
                          {hall.ownerName ? ` · ${hall.ownerName}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {venueHallsError ? (
                    <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                      {venueHallsError}
                    </div>
                  ) : null}

                  {!loadingVenueHalls && !venueHalls.length ? (
                    <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      לא נמצאו אולמות זמינים. ודאי שקיים לפחות אולם אחד במערכת בעל האולם.
                    </div>
                  ) : null}

                  {selectedHall ? (
                    <div className="mt-4 rounded-[24px] border border-[#eadfce] bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f4ead9] text-[#b98121]">
                          {selectedHall.image ? (
                            <img
                              src={selectedHall.image}
                              alt={selectedHall.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">🏛️</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black text-[#2d241c]">
                            {selectedHall.name}
                          </div>

                          <div className="mt-1 truncate text-xs font-bold text-[#7b6a58]">
                            {selectedHall.subtitle || "אולם אירועים"} ·{" "}
                            {selectedHall.capacity
                              ? `עד ${selectedHall.capacity} אורחים`
                              : "קיבולת לא הוגדרה"}
                          </div>

                          <div className="mt-1 text-xs font-bold text-[#9a7a45]">
                            בעלים: {selectedHall.ownerName}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-[#fbf4e8] p-4 text-sm leading-7 text-[#6b5844]">
                <p className="font-bold text-[#3c2d21]">סיכום החיבור</p>

                <p>
                  {eventForm.eventTitle || "שם האירוע"} ·{" "}
                  {getEventTypeLabel(eventForm.eventType)} ·{" "}
                  {eventForm.eventDate || "תאריך"} ·{" "}
                  {eventForm.eventTime || "שעה"}
                </p>

                <p>
                  אולם:{" "}
                  {eventForm.venueHallName ||
                    selectedHall?.name ||
                    "לא נבחר אולם"}
                </p>

                <p className="mt-2 text-xs font-black text-[#8f6437]">
                  Event ID: {eventForm.eventId || "עדיין לא מחובר"}
                </p>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[34px] border border-[#eadfce] bg-[#fbf8f2] shadow-[0_24px_80px_rgba(71,48,25,0.10)]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#d8b985]/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#c79a55]/10 blur-3xl" />

              <div className="relative border-b border-[#eadfce] bg-white/55 px-5 py-5 md:px-7">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#b58a55]">
                      תמונת ההזמנה
                    </p>

                    <h2 className="text-2xl font-black text-[#2d241c]">
                      העלאת תמונת הזמנה
                    </h2>

                    <p className="mt-1 text-sm text-[#7b6a58]">
                      בחרו תמונה מוכנה של ההזמנה ובדקו את התצוגה לפני שמירה.
                    </p>
                  </div>

                  <div className="flex rounded-full border border-[#e0d1bb] bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setImageMode("portrait")}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        imageMode === "portrait"
                          ? "bg-[#2d241c] text-white shadow"
                          : "text-[#6d5b49] hover:bg-[#f7f1e8]"
                      }`}
                    >
                      לאורך
                    </button>

                    <button
                      type="button"
                      onClick={() => setImageMode("square")}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        imageMode === "square"
                          ? "bg-[#2d241c] text-white shadow"
                          : "text-[#6d5b49] hover:bg-[#f7f1e8]"
                      }`}
                    >
                      מרובע
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative flex min-h-[680px] items-center justify-center p-5 md:p-10">
                {displayImageUrl ? (
                  <div className="w-full">
                    <div className="mx-auto flex w-full max-w-5xl justify-center">
                      <div
                        className={`relative w-full ${
                          imageMode === "square"
                            ? "max-w-[760px]"
                            : "max-w-[560px]"
                        }`}
                      >
                        <div className="absolute inset-0 rounded-[38px] bg-gradient-to-b from-[#fff9f2] via-[#f8f0e3] to-[#f1e4d2] shadow-[0_35px_100px_rgba(80,51,25,0.15)]" />

                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#ead3ab]/50 blur-2xl" />
                        <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-[#c79a55]/10 blur-2xl" />

                        <div className="relative rounded-[38px] border border-white/80 p-4 md:p-5">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold tracking-[0.12em] text-[#b58a55]">
                                תצוגת הזמנה
                              </p>

                              <p className="text-sm font-bold text-[#3b2a1f]">
                                איך התמונה נראית לפני שמירה
                              </p>
                            </div>

                            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#6d5b49] shadow-sm">
                              {imageMode === "square"
                                ? "פורמט מרובע"
                                : "פורמט לאורך"}
                            </span>
                          </div>

                          <div className="relative overflow-hidden rounded-[30px] border border-[#f1e3d0] bg-white p-3 shadow-[0_25px_70px_rgba(58,38,18,0.14)]">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                            <img
                              src={displayImageUrl}
                              alt="תמונת ההזמנה"
                              className={`block w-full rounded-[22px] object-contain ${
                                imageMode === "square"
                                  ? "aspect-square max-h-[760px]"
                                  : "aspect-[9/16] max-h-[860px]"
                              }`}
                            />

                            <div className="pointer-events-none absolute inset-3 rounded-[22px] ring-1 ring-black/5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-center">
                      {uploadedImage?.file ? (
                        <span className="rounded-full bg-[#fbf0dc] px-4 py-2 text-sm font-semibold text-[#8f6437]">
                          תמונה חדשה נבחרה: {uploadedImage.file.name}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#f4ecdf] px-4 py-2 text-sm font-semibold text-[#7a5a35]">
                          מוצגת התמונה השמורה להזמנה
                        </span>
                      )}

                      {imageInfo ? (
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5b4a39] shadow-sm">
                          {imageInfo.width}×{imageInfo.height}px
                        </span>
                      ) : null}

                      {qualityStatus ? (
                        <span
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            qualityStatus.level === "good"
                              ? "bg-emerald-50 text-emerald-700"
                              : qualityStatus.level === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {qualityStatus.text}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      handleImageFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`group flex min-h-[560px] w-full max-w-3xl flex-col items-center justify-center rounded-[34px] border-2 border-dashed p-8 text-center transition ${
                      dragActive
                        ? "border-[#c79a55] bg-[#fff7ea]"
                        : "border-[#d9c9b2] bg-white/72 hover:border-[#b58a55] hover:bg-white"
                    }`}
                  >
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#f2dfbf] to-[#fff8ea] text-4xl shadow-inner">
                      🖼️
                    </div>

                    <h3 className="text-2xl font-black text-[#2d241c]">
                      העלאת תמונת הזמנה
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#7b6a58]">
                      גררו לכאן תמונה מוכנה או לחצו לבחירת קובץ מהמחשב.
                    </p>

                    <div className="mt-6 rounded-full bg-gradient-to-l from-[#c79a55] to-[#8f6437] px-7 py-3 text-sm font-bold text-white shadow-lg transition group-hover:shadow-xl">
                      בחירת תמונה
                    </div>

                    <p className="mt-5 text-xs font-semibold text-[#9a8771]">
                      JPG / PNG / WEBP · עד 12MB
                    </p>
                  </button>
                )}

                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  hidden
                  onChange={(e) => {
                    handleImageFile(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-[0_18px_60px_rgba(71,48,25,0.08)]">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[#b58a55]">
                    סוג ההזמנה
                  </p>

                  <h3 className="text-xl font-black text-[#2d241c]">
                    בחירת פורמט
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setImageMode("portrait")}
                    className={`rounded-3xl border p-4 text-right transition ${
                      imageMode === "portrait"
                        ? "border-[#c79a55] bg-[#fff7ea] shadow-md"
                        : "border-[#eadfce] bg-[#fbf8f2] hover:bg-white"
                    }`}
                  >
                    <div className="mx-auto mb-3 h-24 w-14 rounded-xl border-2 border-current bg-white/70" />
                    <p className="text-center text-sm font-black">לאורך</p>
                    <p className="mt-1 text-center text-xs text-[#7b6a58]">
                      1080×1920
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageMode("square")}
                    className={`rounded-3xl border p-4 text-right transition ${
                      imageMode === "square"
                        ? "border-[#c79a55] bg-[#fff7ea] shadow-md"
                        : "border-[#eadfce] bg-[#fbf8f2] hover:bg-white"
                    }`}
                  >
                    <div className="mx-auto mb-3 h-20 w-20 rounded-xl border-2 border-current bg-white/70" />
                    <p className="text-center text-sm font-black">מרובע</p>
                    <p className="mt-1 text-center text-xs text-[#7b6a58]">
                      1080×1080
                    </p>
                  </button>
                </div>

                <div className="mt-5 rounded-3xl bg-[#fbf4e8] p-4 text-sm leading-6 text-[#6b5844]">
                  <p className="font-bold text-[#3c2d21]">המלצת איכות</p>
                  <p>{getRecommendedText(imageMode)}</p>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-[0_18px_60px_rgba(71,48,25,0.08)]">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[#b58a55]">
                    סטטוס חיבור
                  </p>

                  <h3 className="text-xl font-black text-[#2d241c]">
                    מה יתעדכן בשמירה
                  </h3>
                </div>

                <div className="rounded-3xl bg-[#fbf4e8] p-4 text-sm leading-7 text-[#6b5844]">
                  <p>
                    ההזמנה תישמר, ובנוסף השרת יעדכן או ייצור Event מחובר לאולם.
                  </p>

                  <p className="mt-2 font-bold text-[#3c2d21]">
                    {eventForm.eventTitle || "שם האירוע"} ·{" "}
                    {getEventTypeLabel(eventForm.eventType)}
                  </p>

                  <p>
                    {eventForm.eventDate || "תאריך"} ·{" "}
                    {eventForm.eventTime || "שעה"} ·{" "}
                    {eventForm.estimatedGuests || "0"} מוזמנים
                  </p>

                  <p className="mt-2">
                    אולם:{" "}
                    {eventForm.venueHallName ||
                      selectedHall?.name ||
                      "לא נבחר אולם"}
                  </p>

                  <p className="mt-2 text-xs font-black text-[#8f6437]">
                    Event ID: {eventForm.eventId || "עדיין לא מחובר"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Real mobile invite page preview */}
          <aside className="space-y-6">
            <div className="xl:sticky xl:top-24 space-y-6">
              <div className="rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-[0_20px_70px_rgba(71,48,25,0.10)]">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[#b58a55]">
                    תצוגה בטלפון
                  </p>

                  <h3 className="text-xl font-black text-[#2d241c]">
                    כך העמוד נראה במובייל
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#7b6a58]">
                    כאן מוצגת תצוגה של עמוד ההזמנה ואישור ההגעה.
                  </p>
                </div>

                <div className="mx-auto w-full max-w-[330px]">
                  <div className="rounded-[42px] bg-[#1f1f1f] p-[10px] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                    <div className="relative overflow-hidden rounded-[34px] bg-black">
                      <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center justify-center">
                        <div className="h-7 w-32 rounded-full bg-black shadow-inner" />
                      </div>

                      <div className="absolute right-4 top-5 z-20 h-2.5 w-2.5 rounded-full bg-[#1a1a1a] ring-2 ring-[#2f2f2f]" />

                      <div className="relative h-[690px] w-full overflow-hidden rounded-[34px] bg-[#f4efe8] pt-12">
                        {previewUrl ? (
                          <iframe
                            ref={phonePreviewRef}
                            key={`${previewUrl}-${previewRefreshKey}`}
                            src={previewUrl}
                            title="Mobile invitation preview"
                            className="h-full w-full bg-white"
                            onLoad={sendLivePreviewToIframe}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#6d5b49]">
                            אין כרגע תצוגה זמינה
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="rounded-2xl border border-[#d8c7ad] bg-white px-4 py-3 text-sm font-bold text-[#4b3828] shadow-sm transition hover:bg-[#fbf7f0]"
                  >
                    החלפת תמונה
                  </button>

                  <button
                    type="button"
                    onClick={handlePreview}
                    className="rounded-2xl bg-gradient-to-l from-[#c79a55] to-[#8f6437] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
                  >
                    תצוגה מקדימה
                  </button>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-[0_18px_60px_rgba(71,48,25,0.08)]">
                <p className="text-sm font-semibold text-[#b58a55]">פעולות</p>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="w-full rounded-2xl border border-[#d8c7ad] bg-white px-5 py-3 text-sm font-bold text-[#4b3828] shadow-sm transition hover:bg-[#fbf7f0]"
                  >
                    ⬆️ העלאת / החלפת תמונה
                  </button>

                  <button
                    type="button"
                    onClick={handlePreview}
                    className="w-full rounded-2xl border border-[#d8c7ad] bg-white px-5 py-3 text-sm font-bold text-[#4b3828] shadow-sm transition hover:bg-[#fbf7f0]"
                  >
                    👁 תצוגה מקדימה
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition ${
                      saving
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-l from-[#c79a55] to-[#8f6437] hover:shadow-xl"
                    }`}
                  >
                    {saving ? "שומר..." : "💾 שמירת ההזמנה והאירוע"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6d9c7] bg-white/92 p-3 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="rounded-2xl border border-[#d8c7ad] bg-white py-3 text-xs font-bold text-[#4b3828]"
          >
            העלאה
          </button>

          <button
            type="button"
            onClick={handlePreview}
            className="rounded-2xl border border-[#d8c7ad] bg-white py-3 text-xs font-bold text-[#4b3828]"
          >
            תצוגה
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`rounded-2xl py-3 text-xs font-black text-white ${
              saving ? "bg-gray-400" : "bg-[#8f6437]"
            }`}
          >
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Small components
========================================================= */

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-[#6f6252]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#2b241c] outline-none transition placeholder:text-[#b7a994] focus:border-[#b98121]"
      />
    </label>
  );
}