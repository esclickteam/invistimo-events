"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import HomeMarketingSections from "@/components/marketing/HomeMarketingSections";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";

const HERO_DESKTOP = {
  webm: "/marketing/videos/home-cinematic-hero-desktop.webm",
  mp4: "/marketing/videos/home-cinematic-hero-desktop.mp4",
  posterWebp: "/marketing/videos/home-cinematic-hero-poster.webp",
  posterJpg: "/marketing/videos/home-cinematic-hero-poster.jpg",
} as const;

const HERO_MOBILE = {
  webm: "/marketing/videos/home-cinematic-hero-mobile.webm",
  mp4: "/marketing/videos/home-cinematic-hero-mobile.mp4",
  posterWebp: "/marketing/videos/home-cinematic-hero-mobile-poster.webp",
  posterJpg: "/marketing/videos/home-cinematic-hero-mobile-poster.jpg",
} as const;

function useIsNarrow(breakpointPx = 768) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [breakpointPx]);

  return narrow;
}

function CinematicHeroVideo({ reduceMotion }: { reduceMotion: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrow = useIsNarrow();
  const sources = narrow ? HERO_MOBILE : HERO_DESKTOP;
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setShouldPlay(false);
      return;
    }

    let cancelled = false;
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;

    if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") {
      return;
    }

    const enable = () => {
      if (!cancelled) setShouldPlay(true);
    };

    const start = () => {
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (typeof ric === "function") {
        ric(enable, { timeout: 1200 });
      } else {
        setTimeout(enable, 200);
      }
    };

    if (document.readyState === "complete") {
      start();
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, [reduceMotion, narrow]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldPlay) return;
    el.muted = true;
    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        /* Autoplay can be blocked; poster remains visible. */
      });
    }
  }, [shouldPlay, sources.mp4]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#1A1410]" aria-hidden>
      {/* Responsive poster via media queries — paints before any JS/video. */}
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={HERO_MOBILE.posterWebp}
          type="image/webp"
        />
        <source media="(max-width: 767px)" srcSet={HERO_MOBILE.posterJpg} />
        <source
          media="(min-width: 768px)"
          srcSet={HERO_DESKTOP.posterWebp}
          type="image/webp"
        />
        <img
          src={HERO_DESKTOP.posterJpg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </picture>

      {shouldPlay ? (
        <video
          key={sources.mp4}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={sources.posterJpg}
          aria-hidden
        >
          <source src={sources.webm} type="video/webm" />
          <source src={sources.mp4} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}

function CinematicHomeHero() {
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const mediaOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduceMotion ? 1 : 0.55]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 48]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#1A1410] text-[#F7F1E8]"
      aria-labelledby="home-hero-heading"
    >
      <motion.div className="absolute inset-0" style={{ opacity: mediaOpacity }}>
        <CinematicHeroVideo reduceMotion={reduceMotion} />
      </motion.div>

      {/* Soft cinematic grade — champagne readability without hiding the film */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(18,12,8,0.55)_0%,rgba(22,16,12,0.28)_38%,rgba(18,12,8,0.45)_72%,rgba(18,12,8,0.82)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(12,8,6,0.28)_100%)]"
        aria-hidden
      />
      {/* Seamless handoff into the cream intro section */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-28 bg-gradient-to-b from-transparent to-[#F7F1E8] md:h-36"
        aria-hidden
      />

      <motion.div
        dir="rtl"
        lang="he"
        style={{ y: contentY }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1200px] flex-col items-center justify-center px-4 pb-24 pt-28 text-center max-[360px]:px-3 sm:px-6 md:px-10 md:pb-28 md:pt-32"
      >
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 text-[11px] font-semibold tracking-[0.28em] text-[#E8D4A8] sm:text-xs"
        >
          INVISTIMO
        </motion.p>

        <motion.h1
          id="home-hero-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[18ch] text-[40px] font-black leading-[1.08] tracking-[-0.035em] text-white drop-shadow-[0_10px_36px_rgba(0,0,0,0.35)] max-[360px]:text-[34px] sm:text-[48px] md:max-w-none md:text-[68px] lg:text-[76px]"
        >
          האירוע שלכם.
          <span className="mt-2 block bg-gradient-to-l from-[#B88A2D] via-[#E8D4A8] to-[#C9A45C] bg-clip-text text-transparent">
            הסדר שלנו.
          </span>
        </motion.h1>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-[34rem] text-[15px] font-medium leading-7 text-[#F3E8D6]/92 sm:text-[17px] sm:leading-8 md:text-[18px]"
        >
          מהרגע שבו שולחים את ההזמנה ועד שהאורח האחרון מוצא את מקומו — כל הפרטים
          הקטנים שמאחורי אירוע גדול, במקום אחד.
          <span className="mt-3 block text-[#E8D4A8]/90">
            הזמנות דיגיטליות, אישורי הגעה, סידורי הושבה ועוד — כדי שאתם תוכלו להתרגש
            מהרגעים החשובים באמת.
          </span>
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4"
        >
          <TrackedCtaLink
            href="/pricing"
            location="home_hero_primary"
            className="group inline-flex w-full min-w-0 items-center justify-center gap-3 rounded-full bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220] px-6 py-4 text-[16px] font-extrabold text-white shadow-[0_18px_38px_rgba(184,134,45,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(184,134,45,0.4)] sm:w-auto sm:min-w-[220px] sm:px-9"
          >
            בואו נתחיל
            <span className="transition group-hover:-translate-x-1" aria-hidden>
              ←
            </span>
          </TrackedCtaLink>
          <TrackedCtaLink
            href="/try"
            location="home_hero_demo"
            className="inline-flex w-full min-w-0 items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-4 text-[16px] font-extrabold text-white shadow-[0_14px_32px_rgba(0,0,0,0.18)] backdrop-blur-sm transition hover:bg-white/18 sm:w-auto sm:min-w-[220px] sm:px-9"
          >
            נסו דמו
          </TrackedCtaLink>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ duration: 1, delay: reduceMotion ? 0 : 0.7 }}
          className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[#E8D4A8]/80"
          aria-hidden
        >
          <span className="text-[10px] font-semibold tracking-[0.22em]">גללו</span>
          <span className="h-8 w-px bg-gradient-to-b from-[#E8D4A8] to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default function HomePageClient() {
  return (
    <div className="overflow-x-hidden bg-[#F4F0E8] pb-[max(5.5rem,env(safe-area-inset-bottom))] text-[#2C241C]">
      <CinematicHomeHero />
      <HomeMarketingSections />
    </div>
  );
}
