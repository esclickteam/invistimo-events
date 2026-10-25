"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  title: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export default function SeatingDemoVideo({ src, poster, title }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const programmaticPause = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const [pausedByUser, setPausedByUser] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.25),
      { threshold: [0, 0.25, 0.5, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      programmaticPause.current = true;
      el.pause();
      el.removeAttribute("autoplay");
      return;
    }

    if (!inView || pausedByUser) {
      programmaticPause.current = true;
      el.pause();
      return;
    }

    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => undefined).finally(() => {
        programmaticPause.current = false;
      });
    } else {
      programmaticPause.current = false;
    }
  }, [reducedMotion, pausedByUser, inView, src]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#1E1814]">
      <div className="relative aspect-video w-full bg-[#1E1814]">
        <video
          ref={ref}
          src={src}
          poster={poster}
          title={title}
          aria-label={title}
          muted
          loop
          playsInline
          autoPlay={!reducedMotion}
          controls
          preload="metadata"
          className="h-full w-full object-contain"
          onPlay={() => {
            programmaticPause.current = false;
            setPausedByUser(false);
          }}
          onPause={() => {
            if (programmaticPause.current) return;
            const el = ref.current;
            if (el && !el.ended) setPausedByUser(true);
          }}
        />
      </div>
      <p className="px-4 py-3 text-sm font-semibold text-[#E8D1A5]">
        סרטון הדגמה — שיבוץ אורחים במפת ההושבה (נתוני דמו בלבד)
        {reducedMotion ? " · הווידאו מושהה בגלל העדפת הפחתת תנועה" : ""}
      </p>
    </div>
  );
}
