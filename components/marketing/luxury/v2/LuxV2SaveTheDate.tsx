"use client";

import { useEffect, useState } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { luxBtnPlum, luxBtnSecondary } from "@/lib/ui/luxuryButtonClasses";
import { cn } from "@/lib/utils";

const DESIGNS = [
  {
    id: "std-maya",
    src: "/marketing/invites/invite-save-the-date-maya-itai.webp",
    label: "Save the Date",
    couple: "מאיה ואיתי",
  },
  {
    id: "wedding-mia",
    src: "/marketing/invites/invite-wedding-mia-alon.webp",
    label: "הזמנה דיגיטלית",
    couple: "מיה ואלון",
  },
  {
    id: "henna",
    src: "/marketing/invites/invite-henna.webp",
    label: "חינה",
    couple: "חגיגת משפחה",
  },
  {
    id: "poster",
    src: "/marketing/videos/home-save-the-date-poster.jpg",
    label: "כרטיס שמירת תאריך",
    couple: "מיה ואלון",
  },
] as const;

/**
 * Click-driven cinematic envelope + invitation reveal with design switching.
 * No tall sticky scrub / no page scroll hijacking.
 */
export default function LuxV2SaveTheDate() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const design = DESIGNS[active];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) setOpen(true);
  }, [reduceMotion]);

  const selectDesign = (index: number) => {
    setActive(index);
    if (!open) setOpen(true);
  };

  return (
    <section
      dir="rtl"
      aria-labelledby="lux-v2-std"
      className="relative overflow-hidden bg-[#E8D9C8] px-4 py-16 sm:px-6 md:px-10 md:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 20% 15%, rgba(245,238,232,0.85), transparent 45%), radial-gradient(ellipse at 90% 80%, rgba(181,117,145,0.18), transparent 42%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-xs font-bold tracking-[0.28em] text-[#842B4C]">SAVE THE DATE</p>
          <h2
            id="lux-v2-std"
            className="mt-4 max-w-[14ch] text-[40px] font-black leading-[1.05] tracking-[-0.04em] text-[#42182F] sm:text-[56px] md:text-[64px]"
          >
            יש תאריך.
            <span className="mt-1 block text-[#842B4C]">עכשיו אפשר להתחיל להתרגש.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#6B5360]">
            לפני ההזמנות ולפני אישורי ההגעה — רגע אחד שבו הכול מתחיל להיות אמיתי. לחצו על
            המעטפה, שלפו את ההזמנה, והחליפו בין עיצובים.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={luxBtnPlum}
              aria-expanded={open}
              aria-controls="lux-envelope-stage"
            >
              {open ? "לסגור את המעטפה" : "לפתוח את המעטפה"}
            </button>
            <TrackedCtaLink href="/rsvp/save-the-date" location="lux_v2_std" className={luxBtnSecondary}>
              לשריין את הרגע
            </TrackedCtaLink>
          </div>

          <div className="mt-10 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DESIGNS.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => selectDesign(i)}
                className={cn(
                  "w-[104px] shrink-0 overflow-hidden border text-right transition duration-300",
                  i === active
                    ? "border-[#842B4C] shadow-[0_12px_28px_rgba(66,24,47,0.14)]"
                    : "border-[#C5A582]/40 opacity-80 hover:opacity-100",
                )}
                aria-pressed={i === active}
              >
                <img
                  src={card.src}
                  alt=""
                  className="aspect-[3/4] w-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <span className="block px-2 py-1.5 text-[10px] font-bold tracking-wide text-[#842B4C]">
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div id="lux-envelope-stage" className="relative mx-auto w-full max-w-[420px]">
          <div
            className="relative mx-auto aspect-[4/5] w-full max-w-[380px]"
            style={{ perspective: reduceMotion ? undefined : "1200px" }}
          >
            {/* Soft ground shadow */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-[8%] bottom-[6%] z-0 h-[18%] rounded-[100%] bg-[#42182F]/18 blur-xl",
                !reduceMotion && "transition-opacity duration-500",
              )}
              style={{ opacity: open ? 0.55 : 0.35 }}
              aria-hidden
            />

            {/* Invitation card — rises from pocket */}
            <div
              className={cn(
                "absolute inset-x-[14%] bottom-[22%] z-[5] overflow-hidden border border-[#C5A582]/45 bg-[#FFFBFA]",
                !reduceMotion &&
                  "transition-[transform,box-shadow] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              )}
              style={{
                transform: open
                  ? "translate3d(0,-42%,0) rotate(-2deg)"
                  : "translate3d(0,22%,0) scale(0.94)",
                boxShadow: open
                  ? "0 36px 70px rgba(66,24,47,0.22), 0 8px 18px rgba(66,24,47,0.12)"
                  : "0 10px 24px rgba(66,24,47,0.08)",
              }}
              aria-hidden={!open}
            >
              <img
                key={design.src}
                src={design.src}
                alt={`${design.label} — ${design.couple}`}
                className={cn(
                  "aspect-[3/4] w-full object-cover object-top",
                  !reduceMotion && open && "lux-invite-swap",
                )}
                loading="eager"
                decoding="async"
                draggable={false}
              />
              <div className="border-t border-[#C5A582]/35 px-4 py-3">
                <p className="text-[11px] font-bold tracking-[0.18em] text-[#842B4C]">{design.label}</p>
                <p className="mt-1 text-base font-extrabold text-[#42182F]">{design.couple}</p>
              </div>
            </div>

            {/* Envelope assembly */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="group absolute inset-x-0 bottom-0 z-20 h-[62%] w-full cursor-pointer border-0 bg-transparent p-0 text-start"
              aria-label={open ? "סגירת המעטפה" : "פתיחת המעטפה"}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Back liner */}
              <span
                className="absolute inset-x-0 top-[18%] bottom-0 z-0"
                style={{
                  background: "linear-gradient(180deg, #E8D9C8 0%, #DCC7B0 100%)",
                  boxShadow: "inset 0 12px 28px rgba(66,24,47,0.06)",
                }}
                aria-hidden
              />

              {/* Front pocket */}
              <span
                className="absolute inset-x-0 bottom-0 z-10 h-[72%]"
                style={{
                  background:
                    "linear-gradient(165deg, #FFFBFA 0%, #F5EEE8 42%, #E8D9C8 100%)",
                  clipPath: "polygon(0 22%, 50% 0, 100% 22%, 100% 100%, 0 100%)",
                  boxShadow: "0 28px 60px rgba(66,24,47,0.14)",
                }}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-x-[12%] bottom-[18%] z-10 h-px bg-gradient-to-l from-transparent via-[#C5A582]/70 to-transparent"
                aria-hidden
              />

              {/* Flap — folds back */}
              <span
                className={cn(
                  "absolute inset-x-0 top-0 z-30 h-[48%] origin-top",
                  !reduceMotion &&
                    "transition-[transform,opacity,filter] duration-[680ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                )}
                style={{
                  transform: open
                    ? "rotateX(-168deg) translateY(-2%)"
                    : "rotateX(0deg) translateY(0)",
                  transformStyle: "preserve-3d",
                  opacity: open ? 0.35 : 1,
                  filter: open ? "brightness(0.85)" : "none",
                  background:
                    "linear-gradient(180deg, #D4B899 0%, #C5A582 38%, #B57591 78%, #842B4C 100%)",
                  clipPath: "polygon(0 100%, 50% 6%, 100% 100%)",
                  boxShadow: open ? "none" : "0 10px 24px rgba(66,24,47,0.18)",
                  backfaceVisibility: "hidden",
                }}
                aria-hidden
              />

              <span
                className={cn(
                  "absolute inset-x-0 bottom-5 z-40 text-center text-[11px] font-bold tracking-[0.22em] text-[#842B4C] transition",
                  open ? "opacity-0" : "opacity-80 group-hover:opacity-100",
                )}
              >
                לחצו לפתיחה
              </span>
              <span
                className={cn(
                  "absolute inset-x-0 bottom-5 z-40 text-center text-[11px] font-bold tracking-[0.22em] text-[#842B4C] transition",
                  open ? "opacity-80 group-hover:opacity-100" : "opacity-0",
                )}
              >
                לחצו לסגירה
              </span>
            </button>
          </div>
          <p className="mt-5 text-center text-[11px] font-medium tracking-wide text-[#42182F]/60">
            הדגמה אינטראקטיבית · ללא שליחה אמיתית
          </p>
        </div>
      </div>
    </section>
  );
}
