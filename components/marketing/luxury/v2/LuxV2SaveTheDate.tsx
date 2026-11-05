"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
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

function InviteCard({
  item,
  trackIndex,
  hidden = false,
  onActivate,
}: {
  item: (typeof INVITES)[number];
  trackIndex: number;
  hidden?: boolean;
  onActivate?: (index: number) => void;
}) {
  return (
    <figure
      data-invite-slide
      aria-hidden={hidden || undefined}
      className={`lux-invite-card relative shrink-0 overflow-hidden border border-[#C5A582]/35 bg-[#F5EEE8] shadow-[0_30px_80px_rgba(66,24,47,0.12)] ${
        onActivate ? "cursor-pointer" : ""
      }`}
      onClick={onActivate ? () => onActivate(trackIndex) : undefined}
    >
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={item.src}
          alt={`${item.label} — ${item.couple}`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
      <figcaption className="border-t border-[#C5A582]/35 px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#842B4C]">{item.label}</p>
        <p className="mt-1 text-lg font-extrabold text-[#42182F]">{item.couple}</p>
      </figcaption>
    </figure>
  );
}

/**
 * Mobile invitation carousel. Clones of the first and last cards let the
 * strip wrap without a visible jump. Dots match the wedding-site gallery.
 */
function InviteCarousel({ reduceMotion }: { reduceMotion: boolean }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<number>(INVITES.length);
  const [active, setActive] = useState(0);
  const count = INVITES.length;
  const slides = [0, 1, 2].flatMap((copy) =>
    INVITES.map((item, index) => ({
      item,
      key: `${copy}-${index}`,
      hidden: copy !== 1,
      trackIndex: copy * count + index,
    })),
  );

  const realFromTrack = (trackIndex: number) => ((trackIndex % count) + count) % count;

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (desktop.matches) return;

    let timer = 0;
    let suppress = false;

    const slideNodes = () => [...root.querySelectorAll<HTMLElement>("[data-invite-slide]")];

    const nearest = () => {
      const mid = root.getBoundingClientRect().left + root.clientWidth / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      slideNodes().forEach((node, index) => {
        const rect = node.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      return best;
    };

    const center = (index: number, behavior: ScrollBehavior) => {
      const card = slideNodes()[index];
      if (!card || root.clientWidth === 0) return;
      const delta =
        card.getBoundingClientRect().left +
        card.clientWidth / 2 -
        (root.getBoundingClientRect().left + root.clientWidth / 2);
      if (Math.abs(delta) < 1.5) return;
      if (behavior === "auto") root.scrollLeft += delta;
      else root.scrollBy({ left: delta, behavior });
    };

    const publish = (trackIndex: number) => {
      trackRef.current = trackIndex;
      const real = realFromTrack(trackIndex);
      setActive((prev) => (prev === real ? prev : real));
    };

    const jumpFromClone = (trackIndex: number) => {
      if (trackIndex >= count && trackIndex < count * 2) return false;
      const realTrack = trackIndex < count ? trackIndex + count : trackIndex - count;
      suppress = true;
      center(realTrack, "auto");
      publish(realTrack);
      window.setTimeout(() => {
        suppress = false;
      }, 60);
      return true;
    };

    const settle = () => {
      if (suppress) return;
      const trackIndex = nearest();
      if (!jumpFromClone(trackIndex)) publish(trackIndex);
    };

    suppress = true;
    center(count, "auto");
    publish(count);
    window.setTimeout(() => {
      suppress = false;
    }, 60);

    const onScroll = () => {
      if (suppress) return;
      publish(nearest());
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("scrollend", settle);
    const onResize = () => {
      if (root.clientWidth === 0 || suppress) return;
      center(trackRef.current, "auto");
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", onResize);
    };
  }, [count, reduceMotion]);

  function centerTrack(index: number) {
    const root = scrollerRef.current;
    const card = root?.querySelectorAll<HTMLElement>("[data-invite-slide]")[index];
    if (!root || !card) return;
    const delta =
      card.getBoundingClientRect().left +
      card.clientWidth / 2 -
      (root.getBoundingClientRect().left + root.clientWidth / 2);
    if (Math.abs(delta) < 1.5) return;
    if (reduceMotion) root.scrollLeft += delta;
    else root.scrollBy({ left: delta, behavior: "smooth" });
  }

  function goToReal(target: number) {
    const current = trackRef.current;
    const currentReal = realFromTrack(current);
    const forward = (target - currentReal + count) % count;
    const backward = (currentReal - target + count) % count;
    centerTrack(forward <= backward ? current + forward : current - backward);
  }

  return (
    <div className="relative z-10 w-full min-w-0 pb-12 lg:hidden">
      <div className="lux-invite-viewport">
        <div
          ref={scrollerRef}
          className="lux-invite-row flex gap-4 overflow-x-auto"
          aria-label="הזמנות וכרטיסי שמירת תאריך"
        >
          {slides.map((slide) => (
            <InviteCard
              key={slide.key}
              item={slide.item}
              trackIndex={slide.trackIndex}
              hidden={slide.hidden}
              onActivate={centerTrack}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1">
        {INVITES.map((item, index) => (
          <button
            key={item.src + item.label}
            type="button"
            aria-label={item.label}
            aria-current={index === active ? "true" : undefined}
            onClick={() => goToReal(index)}
            className="flex h-10 w-10 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A582]"
          >
            <span
              className={`h-1 w-8 motion-safe:transition-colors motion-safe:duration-500 ${
                index === active ? "bg-[#842B4C]" : "bg-[#C5A582]/40"
              }`}
            />
          </button>
        ))}
      </div>
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
      className="relative bg-[#E8D9C8] lg:pb-[10vh]"
    >
      <div className="flex flex-col justify-start overflow-x-clip lg:sticky lg:top-0">
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

        <InviteCarousel reduceMotion={reduceMotion} />

        <div className="relative z-10 hidden w-full min-w-0 pb-12 lg:block">
          <div
            className="lux-invite-row flex w-max gap-7 overflow-visible"
            style={{
              transform: shift ? `translate3d(${shift}%, 0, 0)` : undefined,
            }}
          >
            {INVITES.map((item, i) => {
              const depth = reduceMotion ? 0 : Math.sin((scrub + i * 0.18) * Math.PI) * 10;
              return (
                <figure
                  key={item.src + item.label}
                  className="lux-invite-card relative shrink-0 overflow-hidden border border-[#C5A582]/35 bg-[#F5EEE8] shadow-[0_30px_80px_rgba(66,24,47,0.12)]"
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
