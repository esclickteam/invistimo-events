"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Props = {
  src: string;
  poster?: string;
  title: string;
  className?: string;
  /** Eager for hero; lazy for below-fold */
  eager?: boolean;
  /** cover (default) for hero crops; contain preserves native aspect ratio */
  objectFit?: "cover" | "contain";
  videoRef?: RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeked?: (currentTime: number) => void;
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

export default function MarketingVideo({
  src,
  poster,
  title,
  className = "",
  eager = false,
  objectFit = "cover",
  videoRef,
  onTimeUpdate,
  onSeeked,
}: Props) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [pausedByUser, setPausedByUser] = useState(false);

  useEffect(() => {
    const el = (videoRef?.current ?? localRef.current) as HTMLVideoElement | null;
    if (!el) return;

    if (reducedMotion) {
      el.pause();
      el.removeAttribute("autoplay");
      return;
    }

    if (!pausedByUser) {
      const play = el.play();
      if (play && typeof play.catch === "function") play.catch(() => undefined);
    }
  }, [reducedMotion, pausedByUser, videoRef, src]);

  return (
    <div className={`relative overflow-hidden bg-[#17120E] ${className}`}>
      <video
        ref={(node) => {
          localRef.current = node;
          if (videoRef) {
            (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
          }
        }}
        src={src}
        poster={poster}
        title={title}
        aria-label={title}
        muted
        loop
        playsInline
        autoPlay={!reducedMotion}
        controls
        preload={eager ? "metadata" : "none"}
        className={
          objectFit === "contain"
            ? "h-full w-full object-contain"
            : "h-full w-full object-cover object-top"
        }
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onSeeked={(e) => onSeeked?.(e.currentTarget.currentTime)}
        onPlay={() => setPausedByUser(false)}
        onPause={() => {
          const el = localRef.current;
          if (el && !el.ended) setPausedByUser(true);
        }}
      />
      {reducedMotion ? (
        <p className="sr-only">
          הווידאו מושהה כי הופעלה העדפת הפחתת תנועה. אפשר להפעיל ידנית באמצעות פקדי הניגון.
        </p>
      ) : null}
    </div>
  );
}
