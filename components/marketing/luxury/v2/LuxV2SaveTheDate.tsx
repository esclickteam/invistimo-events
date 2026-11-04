"use client";

import type { Ref } from "react";
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

/**
 * Leading interaction: scroll-scrubbed horizontal invitation gallery
 * on warm champagne — not a static side-by-side layout.
 */
export default function LuxV2SaveTheDate() {
  const { ref, progress, reduceMotion } = useScrollProgress();
  // Keep copy/gallery visible on first paint — no empty sticky void.
  const reveal = reduceMotion ? 1 : 0.55 + segment(progress, 0, 0.18) * 0.45;
  const scrub = reduceMotion ? 0.35 : segment(progress, 0.05, 0.92);
  // Move gallery from right → left as user scrolls
  const shift = reduceMotion ? -18 : 4 - scrub * 52;

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      dir="rtl"
      aria-labelledby="lux-v2-std"
      className="relative h-[220vh] bg-[#E8D9C8]"
    >
      <div className="sticky top-0 flex min-h-[100svh] flex-col justify-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 20% 15%, rgba(245,238,232,0.85), transparent 45%), radial-gradient(ellipse at 90% 80%, rgba(181,117,145,0.18), transparent 42%), linear-gradient(180deg, #F5EEE8 0%, #E8D9C8 48%, #DCC7B0 100%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pt-20 sm:px-6 md:px-10">
          <div
            style={{
              opacity: reveal,
              transform: reduceMotion ? undefined : `translateY(${(1 - reveal) * 36}px)`,
              transition: reduceMotion ? undefined : "opacity 0.2s linear",
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
          </div>
        </div>

        <div className="relative z-10 mt-10 w-full pb-16">
          <div
            className="flex w-max gap-5 px-4 sm:gap-7 sm:px-6 md:px-10"
            style={{
              transform: `translate3d(${shift}%, 0, 0)`,
              willChange: "transform",
            }}
          >
            {INVITES.map((card, i) => {
              const depth = reduceMotion ? 0 : Math.sin((scrub + i * 0.18) * Math.PI) * 18;
              const scale = reduceMotion ? 1 : 0.94 + Math.sin((scrub * 2 + i) * Math.PI) * 0.06;
              return (
                <figure
                  key={card.src + card.label}
                  className="relative w-[72vw] max-w-[380px] shrink-0 overflow-hidden bg-[#F5EEE8] shadow-[0_30px_80px_rgba(66,24,47,0.12)] sm:w-[340px] md:w-[400px]"
                  style={{
                    transform: `translate3d(0, ${depth}px, 0) scale(${scale})`,
                  }}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={card.src}
                      alt={`${card.label} — ${card.couple}`}
                      className="h-full w-full object-cover object-top"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                  <figcaption className="border-t border-[#C5A582]/35 px-5 py-4">
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#842B4C]">
                      {card.label}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#42182F]">{card.couple}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-6 md:px-10">
          <TrackedCtaLink href="/rsvp/save-the-date" location="lux_v2_std" className={luxBtnPlum}>
            לשריין את הרגע
          </TrackedCtaLink>
        </div>
      </div>
    </section>
  );
}
