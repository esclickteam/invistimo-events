"use client";

import { useEffect, useState, type Ref } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { luxBtnPlum } from "@/lib/ui/luxuryButtonClasses";
import { segment, useScrollProgress } from "./useScrollProgress";

const INVITES = [
  {
    src: "/marketing/invites/invite-save-the-date-maya-itai.webp",
    label: "Save the Date",
    couple: "מאיה ואיתי",
  },
  {
    src: "/marketing/invites/invite-wedding-mia-alon.webp",
    label: "הזמנה דיגיטלית",
    couple: "מיה ואלון",
  },
  {
    src: "/marketing/invites/invite-henna.webp",
    label: "חינה",
    couple: "חגיגת משפחה",
  },
  {
    src: "/marketing/videos/home-save-the-date-poster.jpg",
    label: "כרטיס שמירת תאריך",
    couple: "מיה ואלון",
  },
] as const;

const ENVELOPE_CHOICES = [0, 1] as const;

function useWideScreen() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return wide;
}

function PaperEnvelope({
  open,
  src,
  alt,
  onToggle,
}: {
  open: boolean;
  src: string;
  alt: string;
  onToggle: () => void;
}) {
  return (
    <div className={open ? "lux-env is-open mx-auto w-[min(100%,300px)]" : "lux-env mx-auto w-[min(100%,300px)]"}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="lux-env-scene focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A582]"
      >
        <span className="sr-only">{open ? "סגירת המעטפה" : "פתיחת המעטפה"}</span>
        <span className="lux-env-shadow" aria-hidden />
        <span className="lux-env-back" aria-hidden />
        <span className="lux-env-card">
          <img src={src} alt={alt} className="h-full w-full object-cover object-top" draggable={false} />
        </span>
        <span className="lux-env-pocket" aria-hidden />
        <span className="lux-env-flap" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Scroll-scrubbed invitation gallery, with an envelope that actually opens
 * and draws the card out. Sticky only on large screens, and only briefly.
 */
export default function LuxV2SaveTheDate() {
  const { ref, progress, reduceMotion } = useScrollProgress();
  const wide = useWideScreen();
  const [cardIndex, setCardIndex] = useState(0);
  const [forcedOpen, setForcedOpen] = useState<boolean | null>(null);
  const [openedByScroll, setOpenedByScroll] = useState(false);

  useEffect(() => {
    if (reduceMotion) setForcedOpen(true);
  }, [reduceMotion]);

  useEffect(() => {
    if (wide && progress > 0.34) setOpenedByScroll(true);
  }, [wide, progress]);

  const reveal = 1;
  const scrub = reduceMotion || !wide ? 0.2 : segment(progress, 0.18, 0.92);
  const shift = reduceMotion || !wide ? 0 : 1 - scrub * 16;
  const envelopeOpen = forcedOpen ?? openedByScroll;
  const card = INVITES[cardIndex];

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      dir="rtl"
      aria-labelledby="lux-v2-std"
      className="relative bg-[#E8D9C8] lg:h-[148vh]"
    >
      <div className="flex flex-col justify-center overflow-x-clip lg:sticky lg:top-0 lg:min-h-[100svh]">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 20% 15%, rgba(245,238,232,0.85), transparent 45%), radial-gradient(ellipse at 90% 80%, rgba(181,117,145,0.18), transparent 42%), linear-gradient(180deg, #F5EEE8 0%, #E8D9C8 48%, #DCC7B0 100%)",
          }}
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1400px] items-center gap-8 px-4 pb-6 pt-16 sm:px-6 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-10">
          <div
            style={{
              opacity: reveal,
              transform:
                reduceMotion || !wide ? undefined : `translateY(${(1 - reveal) * 28}px)`,
            }}
          >
            <p className="text-xs font-bold tracking-[0.28em] text-[#842B4C]">
              SAVE THE DATE
            </p>
            <h2
              id="lux-v2-std"
              className="mt-4 max-w-[14ch] text-[40px] font-black leading-[1.05] tracking-[-0.04em] text-[#42182F] sm:text-[56px] md:text-[72px]"
            >
              יש תאריך.
              <span className="mt-1 block text-[#842B4C]">עכשיו אפשר להתחיל להתרגש.</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#6B5360]">
              לפני ההזמנות ולפני אישורי ההגעה — רגע אחד שבו הכול מתחיל להיות אמיתי.
              גללו כדי לעבור בין כרטיסי שמירת התאריך וההזמנות.
            </p>
            <div className="mt-8">
              <TrackedCtaLink href="/rsvp/save-the-date" location="lux_v2_std" className={luxBtnPlum}>
                לשריין את הרגע
              </TrackedCtaLink>
            </div>
          </div>

          <div>
            <div className="mb-3 flex gap-2" role="tablist" aria-label="בחירת כרטיס מתוך המעטפה">
              {ENVELOPE_CHOICES.map((index) => {
                const item = INVITES[index];
                const on = cardIndex === index;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setCardIndex(index)}
                    className={`border px-3 py-2 text-[12px] font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A582] ${
                      on
                        ? "border-[#42182F] bg-[#42182F] text-[#F5EEE8]"
                        : "border-[#C5A582]/70 bg-[#F5EEE8]/70 text-[#42182F]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <PaperEnvelope
              open={envelopeOpen}
              src={card.src}
              alt={`${card.label} — ${card.couple}`}
              onToggle={() => setForcedOpen((value) => !(value ?? envelopeOpen))}
            />
            <p className="mt-2 text-center text-[11px] font-bold tracking-[0.16em] text-[#842B4C]">
              {card.couple}
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full pb-12">
          <div
            className="flex w-max gap-5 overflow-x-auto px-4 sm:gap-7 sm:px-6 md:px-10 lg:overflow-visible"
            style={{
              transform: shift ? `translate3d(${shift}%, 0, 0)` : undefined,
            }}
          >
            {INVITES.map((item, i) => {
              const depth = reduceMotion || !wide ? 0 : Math.sin((scrub + i * 0.18) * Math.PI) * 10;
              return (
                <figure
                  key={item.src + item.label}
                  className="relative w-[72vw] max-w-[340px] shrink-0 overflow-hidden border border-[#C5A582]/35 bg-[#F5EEE8] shadow-[0_30px_80px_rgba(66,24,47,0.12)] sm:w-[300px]"
                  style={{ transform: depth ? `translate3d(0, ${depth}px, 0)` : undefined }}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={item.src}
                      alt={`${item.label} — ${item.couple}`}
                      className="h-full w-full object-cover object-top"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                  <figcaption className="border-t border-[#C5A582]/35 px-5 py-4">
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#842B4C]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#42182F]">{item.couple}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
