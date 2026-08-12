"use client";

import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";
import TransportationGuestSection from "@/app/components/TransportationGuestSection";

/* ============================================================
   MENU LABELS
============================================================ */

const MENU_LABELS: Record<string, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
  kosherGlatt: "כשר גלאט",
  kosherMahfoud: "כשר מחפוד",
  transportation: "הסעות",
};

/* ============================================================
   TYPES
============================================================ */

const RSVP_VALUES = ["yes", "no", "pending"] as const;

type RsvpValue = (typeof RSVP_VALUES)[number];

type GiftOptions = {
  creditEnabled?: boolean;
  creditUrl?: string;
  payboxEnabled?: boolean;
  payboxUrl?: string;
};

type PreviewImageMode = "portrait" | "square";

type PublicEventNote = {
  enabled: boolean;
  text: string;
};

/* ============================================================
   HELPERS
============================================================ */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toBool(value: unknown) {
  const normalized = cleanStr(value).toLowerCase();

  return (
    value === true ||
    value === 1 ||
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "כן"
  );
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

function normalizeRsvp(value: unknown): RsvpValue {
  return value === "yes" || value === "no" ? value : "pending";
}

function normalizeNotes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanStr(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isStaffPreviewFromSearchParams(searchParams: URLSearchParams) {
  const preview = cleanStr(searchParams.get("preview")).toLowerCase();
  const mode = cleanStr(searchParams.get("mode")).toLowerCase();

  return (
    preview === "staff" ||
    mode === "staff" ||
    toBool(searchParams.get("staffPreview"))
  );
}

/* ============================================================
   HEART BURST EFFECT
============================================================ */

function HeartBurst({ triggerKey }: { triggerKey: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!triggerKey) return;

    setShow(true);

    const timer = window.setTimeout(() => {
      setShow(false);
    }, 1250);

    return () => window.clearTimeout(timer);
  }, [triggerKey]);

  if (!show) return null;

  const items = ["😍", "💛", "🤍", "✨", "💖", "🥰", "💫", "❤️"];

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      <div className="relative h-56 w-56">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="heart-burst-item absolute left-1/2 top-1/2 text-4xl"
            style={
              {
                "--x": `${
                  Math.cos((index / items.length) * Math.PI * 2) * 125
                }px`,
                "--y": `${
                  Math.sin((index / items.length) * Math.PI * 2) * 125
                }px`,
                "--delay": `${index * 45}ms`,
              } as CSSProperties
            }
          >
            {item}
          </span>
        ))}

        <div className="heart-burst-center absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-5xl shadow-[0_25px_80px_rgba(105,70,35,0.22)]">
          😍
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GIFT SECTION
============================================================ */

function GiftSection({ giftOptions }: { giftOptions?: GiftOptions }) {
  const creditUrl = (giftOptions?.creditUrl ?? "").trim();
  const payboxUrl = (giftOptions?.payboxUrl ?? "").trim();

  const showCredit = !!giftOptions?.creditEnabled && !!creditUrl;
  const showPaybox = !!giftOptions?.payboxEnabled && !!payboxUrl;

  if (!showCredit && !showPaybox) return null;

  return (
    <div className="rounded-[28px] border border-[#eadfce] bg-[#fffaf2] p-4 shadow-sm">
      <div className="mb-3 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          🎁
        </div>

        <p className="text-sm font-black text-[#3a2c20]">
          רוצים לשמח גם במתנה?
        </p>
      </div>

      <div className="flex gap-3">
        {showCredit && (
          <a
            href={creditUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-2xl border border-[#d8c7ad] bg-white py-3 text-center text-sm font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]"
          >
            מתנה באשראי
          </a>
        )}

        {showPaybox && (
          <a
            href={payboxUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-2xl border border-[#d8c7ad] bg-white py-3 text-center text-sm font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]"
          >
            מתנה ב־PayBox
          </a>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PUBLIC EVENT NOTE SECTION
============================================================ */

function PublicEventNoteSection({ note }: { note: PublicEventNote }) {
  if (!note.enabled || !note.text.trim()) return null;

  return (
    <section className="mt-7 w-full max-w-md overflow-hidden rounded-[30px] border border-[#eadfce] bg-white/90 p-6 text-center shadow-[0_20px_70px_rgba(92,66,38,0.12)] backdrop-blur">
      <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-base font-bold leading-8 text-[#5a4634]">
        {note.text}
      </p>
    </section>
  );
}

/* ============================================================
   STAFF PREVIEW CARD
============================================================ */

function StaffPreviewCard({
  publicEventNote,
  giftOptions,
}: {
  publicEventNote: PublicEventNote;
  giftOptions?: GiftOptions;
}) {
  return (
    <section className="mt-7 w-full max-w-md overflow-hidden rounded-[34px] border border-[#eadfce] bg-white/92 p-6 text-center shadow-[0_28px_90px_rgba(92,66,38,0.16)] backdrop-blur">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ea] text-2xl">
        👀
      </div>

      <h2 className="text-2xl font-black leading-tight text-[#2d241c]">
        צפייה בהזמנה בלבד
      </h2>

      <p className="mx-auto mt-3 max-w-sm text-sm font-bold leading-7 text-[#6b6046]">
        זהו מצב צפייה לעובד מערכת. ניתן לראות איך ההזמנה נראית לאורחים,
        אבל אי אפשר לאשר הגעה או לשנות תשובה בשם אורח.
      </p>

      <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fffaf2] px-4 py-3 text-sm font-black text-[#8f6437]">
        טופס אישור ההגעה מוסתר במצב צפייה.
      </div>

      <PublicEventNoteSection note={publicEventNote} />

      <div className="mt-5">
        <GiftSection giftOptions={giftOptions} />
      </div>
    </section>
  );
}

/* ============================================================
   INVITATION IMAGE CARD
============================================================ */

function InvitationImageCard({
  imageUrl,
  imageMode,
  canvasData,
}: {
  imageUrl: string;
  imageMode: PreviewImageMode;
  canvasData?: any;
}) {
  return (
    <div className="w-full">
      {imageUrl ? (
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#dfc08f]/30 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/60 blur-3xl" />

          <div className="relative rounded-[34px] border border-white/80 bg-white/85 p-3 shadow-[0_30px_90px_rgba(92,66,38,0.16)] backdrop-blur">
            <div className="relative overflow-hidden rounded-[26px] bg-[#faf7f1]">
              <img
                src={imageUrl}
                alt="תמונת ההזמנה"
                className={`mx-auto block w-full rounded-[26px] object-contain ${
                  imageMode === "square" ? "aspect-square" : "aspect-[9/16]"
                }`}
              />

              <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-black/5" />
            </div>
          </div>
        </div>
      ) : canvasData ? (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-[34px] bg-white p-3 shadow-[0_30px_90px_rgba(92,66,38,0.16)]">
          <div className="overflow-hidden rounded-[26px]">
            <PublicInviteRenderer canvasData={canvasData} />
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-[360px] w-full max-w-md items-center justify-center rounded-[30px] border border-dashed border-[#d1c7b4] bg-white/80 px-6 text-center text-sm text-[#6b6046]">
          תמונת ההזמנה לא זמינה כרגע
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PUBLIC INVITE PAGE
============================================================ */

export default function PublicInvitePage({ params }: any) {
  const router = useRouter();

  const [shareId, setShareId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [routeReady, setRouteReady] = useState(false);

  const [invite, setInvite] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isStaffPreview, setIsStaffPreview] = useState(false);

  const [heartTrigger, setHeartTrigger] = useState(0);

  /*
    תמונה זמנית מתוך עמוד העריכה.
    זה רק לתצוגה חיה בתוך iframe.
    זה לא שומר כלום ולא משנה RSVP.
  */
  const [previewOverrideImage, setPreviewOverrideImage] = useState("");
  const [previewOverrideMode, setPreviewOverrideMode] =
    useState<PreviewImageMode | null>(null);

  const [form, setForm] = useState({
    rsvp: "pending" as RsvpValue,
    arrivedCount: 1,
    notes: [] as string[],
  });

  /* ============================================================
     UNWRAP PARAMS + TOKEN / STAFF PREVIEW
  ============================================================ */

  useEffect(() => {
    (async () => {
      const resolved = await params;

      const nextShareId = resolved.shareId || resolved.id || "";

      const sp = new URLSearchParams(window.location.search);
      const nextIsStaffPreview = isStaffPreviewFromSearchParams(sp);
      const nextToken = cleanStr(sp.get("token"));

      setShareId(nextShareId);
      setIsStaffPreview(nextIsStaffPreview);

      /*
        חשוב:
        במצב צפייה של עובד לא משתמשים ב-token,
        כדי שלא תהיה אפשרות לענות בשם אורח.
      */
      setToken(nextIsStaffPreview ? null : nextToken || null);
      setRouteReady(true);
    })();
  }, [params]);

  /* ============================================================
     LIVE PREVIEW MESSAGE FROM EDIT PAGE
  ============================================================ */

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "INVISTIMO_PREVIEW_IMAGE_UPDATE") return;

      const nextImageUrl =
        typeof event.data.imageUrl === "string" ? event.data.imageUrl : "";

      const nextMode =
        event.data.imageMode === "square" ? "square" : "portrait";

      setPreviewOverrideImage(nextImageUrl);
      setPreviewOverrideMode(nextMode);
    }

    window.addEventListener("message", handlePreviewMessage);

    return () => {
      window.removeEventListener("message", handlePreviewMessage);
    };
  }, []);

  /* ============================================================
     LOAD INVITATION + GUEST
     חשוב:
     אורח עם token אישי תמיד יכול לעדכן.
     לא חוסמים לפי canSubmitRsvp מהשרת.
  ============================================================ */

  useEffect(() => {
    if (!routeReady || !shareId) return;

    async function fetchInvite() {
      try {
        setLoading(true);

        const query = new URLSearchParams();

        if (isStaffPreview) {
          query.set("preview", "staff");
        } else if (token) {
          query.set("token", token);
        }

        const queryString = query.toString();

        const res = await fetch(
          `/api/invite/${shareId}${queryString ? `?${queryString}` : ""}`,
          {
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (data.success) {
          const nextIsStaffPreview = Boolean(
            data.isStaffPreview ||
              data.preview?.type === "staff" ||
              data.preview?.enabled === true ||
              isStaffPreview
          );

          setInvite(data.invitation);
          setEvent(data.event);
          setIsStaffPreview(nextIsStaffPreview);

          /*
            במצב preview=staff אין אורח פעיל ואין שליחת RSVP.
          */
          if (nextIsStaffPreview) {
            setSelectedGuest(null);
            return;
          }

          if (data.guest) {
            const guest = data.guest;
            const existingRsvp = normalizeRsvp(guest.rsvp || guest.status);

            const existingArrivedCount = toNumber(
              guest.arrivedCount ?? guest.amount,
              existingRsvp === "yes" ? 1 : 0
            );

            setSelectedGuest(guest);

            /*
              חשוב:
              הסימון הקיים נטען כברירת מחדל,
              אבל המשתמש יכול לשנות אותו תמיד.
            */
            setForm({
              rsvp: existingRsvp,
              arrivedCount:
                existingRsvp === "yes"
                  ? Math.max(1, existingArrivedCount || 1)
                  : 0,
              notes: normalizeNotes(guest.notes),
            });
          } else {
            setSelectedGuest(null);
          }
        } else {
          setInvite(null);
          setEvent(null);
          setSelectedGuest(null);
        }
      } catch {
        setInvite(null);
        setEvent(null);
        setSelectedGuest(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [routeReady, shareId, token, isStaffPreview]);

  /* ============================================================
     INVITATION IMAGE
  ============================================================ */

  const invitationImageUrl = useMemo(() => {
    return (
      previewOverrideImage ||
      invite?.previewImageUrl ||
      invite?.headerImageUrl ||
      invite?.imageUrl ||
      invite?.canvasImageUrl ||
      ""
    );
  }, [previewOverrideImage, invite]);

  const invitationImageMode: PreviewImageMode = useMemo(() => {
    if (previewOverrideMode) return previewOverrideMode;
    if (invite?.orientation === "square") return "square";
    return "portrait";
  }, [previewOverrideMode, invite]);

  /* ============================================================
     ACTIVE MENU OPTIONS
  ============================================================ */

  const activeMenuOptions = useMemo(() => {
    const menu = invite?.invitationSettings?.menuOptions;

    if (!menu) return [];

    return Object.entries(menu)
      .filter(([_, value]) => value === true)
      .map(([key]) => ({
        key,
        label: MENU_LABELS[key],
      }))
      .filter((x) => x.label);
  }, [invite]);

  const giftOptions = useMemo(() => invite?.giftOptions, [invite]);

  const publicEventNote = useMemo<PublicEventNote>(() => {
    const publicEventPage =
      invite?.publicEventPage || event?.publicEventPage || {};
    const note = publicEventPage?.note || {};

    const enabled =
      note?.enabled === true ||
      publicEventPage?.noteEnabled === true ||
      invite?.publicEventPage?.note?.enabled === true ||
      event?.publicEventPage?.note?.enabled === true;

    const text = String(
      note?.text ||
        publicEventPage?.noteText ||
        invite?.publicEventPage?.noteText ||
        event?.publicEventPage?.noteText ||
        ""
    ).trim();

    return {
      enabled,
      text,
    };
  }, [invite, event]);

  /* ============================================================
     SUBMIT RSVP
     חשוב:
     לא חוסמים לפי סטטוס קודם.
     לא חוסמים לפי callRounds.
     לא חוסמים לפי canSubmitRsvp.
     רק staff preview חסום.
  ============================================================ */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;

    if (isStaffPreview) {
      alert("זה מצב צפייה בלבד. לא ניתן לשלוח אישור הגעה מכאן.");
      return;
    }

    if (form.rsvp !== "yes" && form.rsvp !== "no") {
      alert("יש לבחור האם מגיעים או לא מגיעים");
      return;
    }

    const guestToken = cleanStr(selectedGuest?.token || token);

    if (!guestToken) {
      alert("שגיאה בזיהוי האורח");
      return;
    }

    try {
      setIsSubmitting(true);

      const nextArrivedCount =
        form.rsvp === "yes" ? Math.max(1, toNumber(form.arrivedCount, 1)) : 0;

      const res = await fetch(
        `/api/invitationGuests/respondByToken/${guestToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rsvp: form.rsvp,
            status: form.rsvp,
            arrivedCount: nextArrivedCount,
            amount: nextArrivedCount,
            notes: form.notes,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        alert(data?.error || data?.message || "לא הצלחנו לשמור את אישור ההגעה");
        return;
      }

      if (data.guest) {
        setSelectedGuest(data.guest);
      }

      if (form.rsvp === "yes") {
        router.push("/thank-you");
      } else {
        setSent(true);
      }
    } catch {
      alert("שגיאה בשליחת אישור ההגעה");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#f7efe5]"
      >
        <div className="rounded-[30px] border border-[#eadfce] bg-white px-8 py-7 text-center shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#d7b98b] border-t-transparent" />
          <p className="text-lg font-bold text-[#3b2a1f]">טוען הזמנה…</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#f7efe5] p-6"
      >
        <div className="rounded-[30px] border border-red-100 bg-white px-8 py-7 text-center text-red-600 shadow-xl">
          ❌ ההזמנה לא נמצאה
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[#f7efe5]">
      <HeartBurst triggerKey={heartTrigger} />

      <style>{`
        @keyframes heart-burst-fly {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.4);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--x)),
                calc(-50% + var(--y))
              )
              scale(1.25) rotate(18deg);
          }
        }

        @keyframes heart-burst-center {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          25% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.08);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.35);
          }
        }

        .heart-burst-item {
          animation: heart-burst-fly 1.05s ease-out forwards;
          animation-delay: var(--delay);
        }

        .heart-burst-center {
          animation: heart-burst-center 1.15s ease-out forwards;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#dfc08f]/30 blur-3xl" />
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-white/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#c79a55]/10 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-4 py-8 pb-28">
        {/* Elegant top */}
        <section className="mb-6 w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-px w-28 bg-gradient-to-l from-transparent via-[#c79a55] to-transparent" />

          <p className="text-xs font-bold tracking-[0.24em] text-[#b58a55]">
            הזמנה לאירוע
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-[#2d241c]">
            {invite?.title || "שמחים להזמינכם"}
          </h1>

          <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-l from-transparent via-[#d7b98b] to-transparent" />
        </section>

        {isStaffPreview && (
          <section className="mb-5 w-full max-w-md rounded-[24px] border border-[#d7b98b] bg-[#fffaf2] px-5 py-4 text-center shadow-sm">
            <p className="text-sm font-black text-[#8f6437]">
              מצב צפייה לעובד מערכת
            </p>
            <p className="mt-1 text-xs font-bold leading-6 text-[#6b6046]">
              העובד רואה את ההזמנה בלבד. אישור הגעה חסום במסך הזה.
            </p>
          </section>
        )}

        <InvitationImageCard
          imageUrl={invitationImageUrl}
          imageMode={invitationImageMode}
          canvasData={invite.canvasData}
        />

        {isStaffPreview ? (
          <StaffPreviewCard
            publicEventNote={publicEventNote}
            giftOptions={giftOptions}
          />
        ) : !sent ? (
          <form
            onSubmit={handleSubmit}
            className="relative mt-7 w-full max-w-md overflow-hidden rounded-[34px] border border-white/80 bg-white/92 p-6 shadow-[0_28px_90px_rgba(92,66,38,0.16)] backdrop-blur"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#dfc08f]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#fff2d9]/80 blur-3xl" />

            <div className="relative">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-[#2d241c] leading-tight">
                  נשמח לדעת אם תגיעו לחגוג איתנו
                </h2>
              </div>

              {/* מגיע / לא מגיע */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSent(false);
                    setForm((prev) => ({
                      ...prev,
                      rsvp: "yes",
                      arrivedCount: Math.max(1, prev.arrivedCount || 1),
                    }));
                    setHeartTrigger(Date.now());
                  }}
                  className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-sm font-black transition disabled:cursor-wait disabled:opacity-70 ${
                    form.rsvp === "yes"
                      ? "border-[#c79a55] bg-gradient-to-l from-[#c79a55] to-[#8f6437] text-white shadow-lg"
                      : "border-[#eadfce] bg-[#fbf8f2] text-[#5a4634] hover:border-[#c79a55] hover:bg-[#fff7ea]"
                  }`}
                >
                  מגיע/ה
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSent(false);
                    setForm((prev) => ({
                      ...prev,
                      rsvp: "no",
                      arrivedCount: 0,
                    }));
                  }}
                  className={`rounded-2xl border px-4 py-4 text-sm font-black transition disabled:cursor-wait disabled:opacity-70 ${
                    form.rsvp === "no"
                      ? "border-[#b88a8a] bg-[#b88a8a] text-white shadow-lg"
                      : "border-[#eadfce] bg-[#fbf8f2] text-[#5a4634] hover:bg-white"
                  }`}
                >
                  לא מגיע/ה
                </button>
              </div>

              {/* כמה מגיעים */}
              {form.rsvp === "yes" && (
                <div className="mt-6 rounded-[28px] border border-[#eadfce] bg-[#fffaf2] p-5">
                  <div className="mb-4 text-center text-sm font-black text-[#3a2c20]">
                    כמה מגיעים?
                  </div>

                  <div className="flex items-center justify-center gap-5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          arrivedCount: Math.max(1, prev.arrivedCount - 1),
                        }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c7ad] bg-white text-xl font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0] disabled:cursor-wait disabled:opacity-70"
                    >
                      −
                    </button>

                    <div className="flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 text-2xl font-black text-[#2d241c] shadow-sm">
                      {form.arrivedCount}
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          arrivedCount: prev.arrivedCount + 1,
                        }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c7ad] bg-white text-xl font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0] disabled:cursor-wait disabled:opacity-70"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* בקשות מיוחדות */}
              {form.rsvp === "yes" && activeMenuOptions.length > 0 && (
                <div className="mt-6 rounded-[28px] border border-[#eadfce] bg-white p-5">
                  <label className="mb-3 block text-sm font-black text-[#3a2c20]">
                    בקשות מיוחדות:
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {activeMenuOptions.map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          form.notes.includes(opt.label)
                            ? "border-[#c79a55] bg-[#fff7ea] text-[#5a4634]"
                            : "border-[#eadfce] bg-[#fbf8f2] text-[#6b6046]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isSubmitting}
                          checked={form.notes.includes(opt.label)}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              notes: e.target.checked
                                ? Array.from(new Set([...prev.notes, opt.label]))
                                : prev.notes.filter((n) => n !== opt.label),
                            }))
                          }
                          className="accent-[#8f6437] disabled:cursor-wait"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  mt-6 w-full rounded-2xl
                  bg-gradient-to-l from-[#c79a55] to-[#8f6437]
                  px-5 py-4
                  text-lg font-black
                  text-white
                  shadow-[0_18px_45px_rgba(143,100,55,0.28)]
                  transition
                  hover:shadow-[0_22px_55px_rgba(143,100,55,0.34)]
                  disabled:cursor-wait
                  disabled:opacity-70
                "
              >
                {isSubmitting ? "שולח אישור הגעה…" : "שליחת אישור הגעה"}
              </button>

              <PublicEventNoteSection note={publicEventNote} />

              <div className="mt-5">
                <GiftSection giftOptions={giftOptions} />
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-7 w-full max-w-md rounded-[30px] border border-emerald-100 bg-white px-6 py-6 text-center font-black text-emerald-700 shadow-[0_20px_70px_rgba(92,66,38,0.12)]">
            ✓ תודה! תשובתך התקבלה
          </div>
        )}

        {shareId && !isStaffPreview && (
          <TransportationGuestSection
            shareId={shareId}
            guestToken={cleanStr(selectedGuest?.token || token) || undefined}
          />
        )}

        <div className="mt-7 w-full max-w-md">
          <EventLocationCard location={invite?.location} />
        </div>

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