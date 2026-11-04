"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { HERO_DESKTOP, HERO_MOBILE } from "@/lib/marketing/homeHeroAssets";
import {
  luxBtnPrimaryOnDark,
  luxBtnSecondaryOnDark,
} from "@/lib/ui/luxuryButtonClasses";

const HomeMarketingSections = dynamic(
  () => import("@/components/marketing/HomeMarketingSections"),
  { ssr: true }
);

function useReducedMotionPreferred() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return reduce;
}

function useViewportMode() {
  const [mode, setMode] = useState<"desktop" | "mobile" | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMode(mq.matches ? "mobile" : "desktop");
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  return mode;
}

function CinematicHeroVideo({ reduceMotion }: { reduceMotion: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mode = useViewportMode();
  const sources = mode === "mobile" ? HERO_MOBILE : HERO_DESKTOP;
  const [shouldLoad, setShouldLoad] = useState(false);
  /** True only after playback has actually started (or a decoded frame exists). */
  const [isShowingVideo, setIsShowingVideo] = useState(false);
  const playAttemptedRef = useRef(false);

  useEffect(() => {
    setIsShowingVideo(false);
    playAttemptedRef.current = false;
  }, [sources.mp4]);

  useEffect(() => {
    if (reduceMotion || mode === null) {
      setShouldLoad(false);
      return;
    }

    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;

    if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") {
      return;
    }

    // Poster is already in the SSR/DOM paint; mount video on the next frames.
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setShouldLoad(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion, mode]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldLoad || playAttemptedRef.current) return;

    playAttemptedRef.current = true;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;

    const attempt = el.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        // Autoplay blocked once — keep matching poster visible; no retry loop.
        setIsShowingVideo(false);
      });
    }
  }, [shouldLoad, sources.mp4]);

  const revealIfReady = (el: HTMLVideoElement) => {
    if (!el.paused && el.readyState >= 2) {
      setIsShowingVideo(true);
    }
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#2A0F1D]" aria-hidden>
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={HERO_MOBILE.posterWebp}
          type="image/webp"
        />
        <source
          media="(min-width: 768px)"
          srcSet={HERO_DESKTOP.posterWebp}
          type="image/webp"
        />
        {/* JPG fallback only for rare no-webp clients — avoids dual poster fetch. */}
        <img
          src={HERO_DESKTOP.posterJpg}
          alt=""
          width={1280}
          height={720}
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          decoding="sync"
          draggable={false}
        />
      </picture>

      {shouldLoad && mode !== null ? (
        <video
          key={sources.mp4}
          ref={videoRef}
          className={`absolute inset-0 z-[1] h-full w-full object-cover ${
            isShowingVideo ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={sources.posterJpg}
          aria-hidden
          onLoadedData={(e) => revealIfReady(e.currentTarget)}
          onCanPlay={(e) => revealIfReady(e.currentTarget)}
          onPlaying={() => setIsShowingVideo(true)}
          onTimeUpdate={(e) => {
            // Safety: if playing but still hidden, reveal once time advances.
            if (!e.currentTarget.paused && e.currentTarget.currentTime > 0.05) {
              setIsShowingVideo(true);
            }
          }}
        >
          <source src={sources.webm} type="video/webm" />
          <source src={sources.mp4} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}

function CinematicHomeHero() {
  const reduceMotion = useReducedMotionPreferred();

  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#2A0F1D] text-[#F5EEE8]"
      aria-labelledby="home-hero-heading"
    >
      <div className="absolute inset-0">
        <CinematicHeroVideo reduceMotion={reduceMotion} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(42,15,29,0.55)_0%,rgba(66,24,47,0.28)_34%,rgba(42,15,29,0.40)_68%,rgba(42,15,29,0.90)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(42,15,29,0.42)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-32 bg-gradient-to-b from-transparent to-[#F5EEE8] md:h-40"
        aria-hidden
      />

      <div
        dir="rtl"
        lang="he"
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1180px] flex-col items-center justify-center px-4 pb-28 pt-28 text-center max-[360px]:px-3 sm:px-6 md:px-10 md:pb-32 md:pt-32"
      >
        <p className="mb-5 text-[11px] font-semibold tracking-[0.32em] text-[#C5A582] sm:mb-6 sm:text-xs">
          INVISTIMO
        </p>

        <h1
          id="home-hero-heading"
          className="max-w-[16ch] text-[46px] font-black leading-[1.05] tracking-[-0.038em] text-white [text-shadow:0_2px_28px_rgba(42,15,29,0.58),0_10px_44px_rgba(42,15,29,0.42)] max-[360px]:text-[38px] sm:text-[56px] md:max-w-none md:text-[76px] lg:text-[88px]"
        >
          האירוע שלכם.
          <span className="mt-1.5 block bg-gradient-to-l from-[#842B4C] via-[#C5A582] to-[#B57591] bg-clip-text text-transparent [filter:drop-shadow(0_2px_20px_rgba(42,15,29,0.5))] sm:mt-2">
            הסדר שלנו.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-[36rem] text-[15px] font-medium leading-7 text-[#F5EEE8] [text-shadow:0_2px_18px_rgba(42,15,29,0.5)] sm:mt-7 sm:text-[17px] sm:leading-8 md:text-[18px]">
          הזמנות דיגיטליות, אישורי הגעה והושבה חכמה — כל מה שצריך לאירוע מושלם, במקום
          אחד.
        </p>

        <div className="mt-9 flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
          <TrackedCtaLink
            href="/pricing"
            location="home_hero_primary"
            className={`${luxBtnPrimaryOnDark} group w-full min-w-0 sm:w-auto sm:min-w-[220px]`}
          >
            בואו נתחיל
            <span className="transition duration-150 group-hover:-translate-x-0.5" aria-hidden>
              ←
            </span>
          </TrackedCtaLink>
          <TrackedCtaLink
            href="/try"
            location="home_hero_demo"
            className={`${luxBtnSecondaryOnDark} w-full min-w-0 sm:w-auto sm:min-w-[220px]`}
          >
            צפו בהדגמה
          </TrackedCtaLink>
        </div>

        <div
          className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[#C5A582]/80"
          aria-hidden
        >
          <span className="text-[10px] font-semibold tracking-[0.24em]">גללו</span>
          <span className="h-8 w-px bg-gradient-to-b from-[#C5A582] to-transparent" />
        </div>
      </div>
    </section>
  );
}

export default function HomePageClient() {
  return (
    <div className="lux-home overflow-x-hidden pb-[max(5.5rem,env(safe-area-inset-bottom))] text-[#2A1A22]">
      <CinematicHomeHero />
      <HomeMarketingSections />
    </div>
  );
}
