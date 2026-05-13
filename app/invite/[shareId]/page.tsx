"use client";

import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";

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

type GiftOptions = {
  creditEnabled?: boolean;
  creditUrl?: string;
  payboxEnabled?: boolean;
  payboxUrl?: string;
};

type PreviewImageMode = "portrait" | "square";

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

  const [invite, setInvite] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

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
    rsvp: "pending" as "yes" | "no" | "pending",
    arrivedCount: 1,
    notes: [] as string[],
  });

  /* ============================================================
     UNWRAP PARAMS + TOKEN
  ============================================================ */

  useEffect(() => {
    (async () => {
      const resolved = await params;

      setShareId(resolved.shareId || resolved.id);

      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("token");

      if (t) setToken(t);
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
  ============================================================ */

  useEffect(() => {
    if (!shareId) return;

    async function fetchInvite() {
      try {
        const res = await fetch(
          `/api/invite/${shareId}${token ? `?token=${token}` : ""}`,
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (data.success) {
          setInvite(data.invitation);
          setEvent(data.event);

          if (data.guest) {
            setSelectedGuest(data.guest);

            /*
              לא מסמנים "מגיע" כברירת מחדל.
              רק אם האורח כבר ענה בעבר yes/no — נטען את הבחירה הקיימת.
            */
            if (data.guest.rsvp === "yes" || data.guest.rsvp === "no") {
              setForm((f) => ({
                ...f,
                rsvp: data.guest.rsvp,
                arrivedCount:
                  data.guest.rsvp === "yes" &&
                  typeof data.guest.arrivedCount === "number"
                    ? data.guest.arrivedCount
                    : data.guest.rsvp === "yes"
                    ? 1
                    : 0,
                notes: Array.isArray(data.guest.notes)
                  ? data.guest.notes
                  : [],
              }));
            }
          }
        } else {
          setInvite(null);
        }
      } catch {
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [shareId, token]);

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

  /* ============================================================
     SUBMIT RSVP
  ============================================================ */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.rsvp !== "yes" && form.rsvp !== "no") {
      alert("יש לבחור האם מגיעים או לא מגיעים");
      return;
    }

    if (!selectedGuest?.token) {
      alert("שגיאה בזיהוי האורח");
      return;
    }

    const res = await fetch(
      `/api/invitationGuests/respondByToken/${selectedGuest.token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvp: form.rsvp,
          arrivedCount: form.rsvp === "yes" ? form.arrivedCount : 0,
          notes: form.notes,
        }),
      }
    );

    const data = await res.json();

    if (data.success) {
      form.rsvp === "yes" ? router.push("/thank-you") : setSent(true);
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

          <p className="mx-auto mt-3 max-w-xs text-sm font-medium leading-6 text-[#7b6a58]">
            נשמח לראותכם איתנו ולחגוג יחד ברגעים המיוחדים
          </p>

          <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-l from-transparent via-[#d7b98b] to-transparent" />
        </section>

        <InvitationImageCard
          imageUrl={invitationImageUrl}
          imageMode={invitationImageMode}
          canvasData={invite.canvasData}
        />

        {!sent ? (
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
                  onClick={() => {
                    setForm({ ...form, rsvp: "yes", arrivedCount: 1 });
                    setHeartTrigger(Date.now());
                  }}
                  className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-sm font-black transition ${
                    form.rsvp === "yes"
                      ? "border-[#c79a55] bg-gradient-to-l from-[#c79a55] to-[#8f6437] text-white shadow-lg"
                      : "border-[#eadfce] bg-[#fbf8f2] text-[#5a4634] hover:border-[#c79a55] hover:bg-[#fff7ea]"
                  }`}
                >
                  מגיע/ה
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, rsvp: "no", arrivedCount: 0 })
                  }
                  className={`rounded-2xl border px-4 py-4 text-sm font-black transition ${
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
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          arrivedCount: Math.max(1, p.arrivedCount - 1),
                        }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c7ad] bg-white text-xl font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]"
                    >
                      −
                    </button>

                    <div className="flex h-14 min-w-[64px] items-center justify-center rounded-2xl bg-white px-5 text-2xl font-black text-[#2d241c] shadow-sm">
                      {form.arrivedCount}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          arrivedCount: p.arrivedCount + 1,
                        }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c7ad] bg-white text-xl font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* הערות */}
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
                          checked={form.notes.includes(opt.label)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              notes: e.target.checked
                                ? [...form.notes, opt.label]
                                : form.notes.filter((n) => n !== opt.label),
                            })
                          }
                          className="accent-[#8f6437]"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="mt-6 w-full rounded-2xl bg-gradient-to-l from-[#c79a55] to-[#8f6437] px-5 py-4 text-lg font-black text-white shadow-[0_18px_45px_rgba(143,100,55,0.28)] transition hover:shadow-[0_22px_55px_rgba(143,100,55,0.34)]"
              >
                שליחת אישור הגעה
              </button>

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