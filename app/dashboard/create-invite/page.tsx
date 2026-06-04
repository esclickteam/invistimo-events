"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* =========================================================
   Types
========================================================= */

type InviteImageMode = "portrait" | "square";

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

type EventForm = {
  eventId: string;
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

/* =========================================================
   Phone Preview
========================================================= */

function CreatePhonePreview({
  imageUrl,
  imageMode,
}: {
  imageUrl: string;
  imageMode: InviteImageMode;
}) {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#f7efe5]" dir="rtl">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-14 top-8 h-44 w-44 rounded-full bg-[#dfc08f]/25 blur-3xl" />
        <div className="absolute -left-16 top-1/3 h-52 w-52 rounded-full bg-white/70 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-full w-full flex-col items-center px-4 py-7 pb-10">
        <section className="mb-6 w-full text-center">
          <div className="mx-auto mb-4 h-px w-28 bg-gradient-to-l from-transparent via-[#c79a55] to-transparent" />

          <p className="text-xs font-bold tracking-[0.24em] text-[#b58a55]">
            הזמנה לאירוע
          </p>

          <h1 className="mt-3 text-2xl font-black leading-tight text-[#2d241c]">
            שמחים להזמינכם
          </h1>

          <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-l from-transparent via-[#d7b98b] to-transparent" />
        </section>

        <section className="w-full">
          {imageUrl ? (
            <div className="relative mx-auto w-full">
              <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[#dfc08f]/30 blur-3xl" />
              <div className="absolute -bottom-7 -left-7 h-28 w-28 rounded-full bg-white/60 blur-3xl" />

              <div className="relative rounded-[30px] border border-white/80 bg-white/85 p-3 shadow-[0_24px_70px_rgba(92,66,38,0.16)] backdrop-blur">
                <div className="relative overflow-hidden rounded-[24px] bg-[#faf7f1]">
                  <img
                    src={imageUrl}
                    alt="תמונת ההזמנה"
                    className={`mx-auto block w-full rounded-[24px] object-contain ${
                      imageMode === "square" ? "aspect-square" : "aspect-[9/16]"
                    }`}
                  />

                  <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-black/5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-[430px] w-full items-center justify-center rounded-[30px] border border-dashed border-[#d1c7b4] bg-white/80 px-6 text-center text-sm text-[#6b6046]">
              כאן תופיע תמונת ההזמנה
            </div>
          )}
        </section>

        <section className="relative mt-7 w-full overflow-hidden rounded-[34px] border border-white/80 bg-white/92 p-6 shadow-[0_28px_90px_rgba(92,66,38,0.16)] backdrop-blur">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#dfc08f]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#fff2d9]/80 blur-3xl" />

          <div className="relative">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-black leading-tight text-[#2d241c]">
                נשמח לדעת אם תגיעו לחגוג איתנו
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                className="rounded-2xl border border-[#eadfce] bg-[#fbf8f2] px-4 py-4 text-sm font-black text-[#5a4634]"
              >
                מגיע/ה
              </button>

              <button
                type="button"
                disabled
                className="rounded-2xl border border-[#eadfce] bg-[#fbf8f2] px-4 py-4 text-sm font-black text-[#5a4634]"
              >
                לא מגיע/ה
              </button>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-2xl bg-gradient-to-l from-[#c79a55] to-[#8f6437] px-5 py-4 text-lg font-black text-white opacity-90 shadow-[0_18px_45px_rgba(143,100,55,0.28)]"
            >
              שליחת אישור הגעה
            </button>
          </div>
        </section>

        <footer className="mt-10 flex flex-col items-center gap-2 pb-4 text-center">
          <div className="h-px w-24 bg-gradient-to-l from-transparent via-[#d7b98b] to-transparent" />

          <div className="font-serif text-2xl font-black tracking-wide text-[#3a2c20]">
            Invistimo
          </div>

          <p className="text-[11px] font-medium text-[#9a8771]">
            Digital invitation & RSVP
          </p>
        </footer>
      </main>
    </div>
  );
}

/* =========================================================
   Component
========================================================= */

export default function CreateInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventIdFromUrl = searchParams.get("eventId") || "";

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [imageMode, setImageMode] = useState<InviteImageMode>("portrait");
  const [uploadedImage, setUploadedImage] = useState<UploadedImageState | null>(
    null
  );

  const [eventForm, setEventForm] = useState<EventForm>({
    eventId: "",
  });

  const displayImageUrl = uploadedImage?.base64 || "";
  const imageInfo = uploadedImage?.info || null;
  const qualityStatus = getImageQualityStatus(imageInfo, imageMode);

  const imageSelectedText = useMemo(() => {
    if (!uploadedImage?.file) return "";
    return uploadedImage.file.name;
  }, [uploadedImage]);

  useEffect(() => {
    if (!eventIdFromUrl) return;

    setEventForm((prev) => ({
      ...prev,
      eventId: eventIdFromUrl,
    }));
  }, [eventIdFromUrl]);

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
    } catch (error) {
      console.error("IMAGE_UPLOAD_FAILED:", error);
      alert("❌ שגיאה בקריאת התמונה");
    }
  };

  /* =========================================================
     Save
  ========================================================= */

  const handleSave = async () => {
  try {
    if (!uploadedImage?.base64) {
      alert("צריך להעלות תמונת הזמנה לפני שמירה");
      return;
    }

    setSaving(true);

    const cleanEventId = eventForm.eventId.trim();

    const canvasData = {
      objects: [],
      orientation: imageMode,
    };

    const invitationPayload = {
  ...(cleanEventId
    ? {
        eventId: cleanEventId,
        productionEventId: cleanEventId,
        linkedEventId: cleanEventId,

        // ✅ חשוב לאולם — מחבר את ההזמנה החדשה לאירוע האולם
        venueClientEventId: cleanEventId,
        venueLinkedEventId: cleanEventId,
        syncVenueEvent: true,
        source: "venue_client_create_invitation",
      }
    : {}),

  canvasData,
  orientation: imageMode,
};

    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(invitationPayload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || data.message || "❌ שגיאה ביצירת הזמנה");
      return;
    }

    const invitationId = data.invitation?._id;

    if (!invitationId) {
      alert("❌ ההזמנה נוצרה אבל לא חזר מזהה הזמנה");
      return;
    }

    const uploadRes = await fetch("/api/invitations/upload-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        invitationId,
        base64Image: uploadedImage.base64,
        imageMode,
      }),
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error("UPLOAD ERROR:", text);
      alert("❌ שגיאה בהעלאת תמונה");
      return;
    }

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      alert("❌ שגיאה בהעלאת תמונה");
      return;
    }

    router.push(`/dashboard/invitations/${invitationId}/edit`);
  } catch (err) {
    console.error("❌ SAVE ERROR:", err);
    alert("❌ שגיאה בשמירה");
  } finally {
    setSaving(false);
  }
};

  /* =========================================================
     Render
  ========================================================= */

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6efe6] text-[#2d241c]">
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
                יצירת הזמנה
              </h1>

              <p className="mt-1 text-xs text-[#8a7967] md:text-sm">
                העלאת תמונת הזמנה וחיבור לפרטי האירוע.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="rounded-full border border-[#d8c7ad] bg-white px-5 py-2.5 text-sm font-semibold text-[#5a4634] shadow-sm hover:bg-[#fbf7f0]"
            >
              ⬆️ העלאת תמונה
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg transition ${
                saving
                  ? "cursor-not-allowed bg-gray-400"
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
          <div className="space-y-6">

            

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
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />

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
                      <span className="rounded-full bg-[#fbf0dc] px-4 py-2 text-sm font-semibold text-[#8f6437]">
                        תמונה חדשה נבחרה: {imageSelectedText}
                      </span>

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
            </div>
          </div>

          <aside className="space-y-6">
            <div className="space-y-6 xl:sticky xl:top-24">
              <div className="rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-[0_20px_70px_rgba(71,48,25,0.10)]">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[#b58a55]">
                    תצוגה בטלפון
                  </p>

                  <h3 className="text-xl font-black text-[#2d241c]">
                    כך העמוד ייראה במובייל
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#7b6a58]">
                    כאן מוצגת תצוגה של ההזמנה ואישור ההגעה לפני יצירה.
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
                        <CreatePhonePreview
                          imageUrl={displayImageUrl}
                          imageMode={imageMode}
                        />
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
                    onClick={handleSave}
                    disabled={saving}
                    className={`rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition ${
                      saving
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-gradient-to-l from-[#c79a55] to-[#8f6437] hover:shadow-xl"
                    }`}
                  >
                    {saving ? "שומר..." : "שמירה"}
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
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition ${
                      saving
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-gradient-to-l from-[#c79a55] to-[#8f6437] hover:shadow-xl"
                    }`}
                  >
                    {saving ? "שומר..." : "💾 שמירת ההזמנה"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6d9c7] bg-white/92 p-3 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="rounded-2xl border border-[#d8c7ad] bg-white py-3 text-xs font-bold text-[#4b3828]"
          >
            העלאה
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