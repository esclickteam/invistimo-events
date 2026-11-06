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

function imageUrlMatches(entryName: string, img: HTMLImageElement) {
  const src = img.currentSrc || img.src;
  if (!src) return false;
  if (entryName === src) return true;
  try {
    return entryName.endsWith(new URL(src, window.location.href).pathname);
  } catch {
    return false;
  }
}

/** True only after a presented frame, not after load or a scheduled animation frame. */
function posterFrameWasPresented(img: HTMLImageElement) {
  const paintedThisImage = (
    performance.getEntriesByType("largest-contentful-paint") as Array<
      PerformanceEntry & { element?: Element | null }
    >
  ).some((entry) => entry.element === img);
  if (paintedThisImage) return true;

  const fcp = performance.getEntriesByType("paint").find((entry) => entry.name === "first-contentful-paint");
  if (!fcp) return false;
  const resource = performance
    .getEntriesByType("resource")
    .find((entry) => imageUrlMatches(entry.name, img)) as PerformanceResourceTiming | undefined;
  return Boolean(resource && resource.responseEnd > 0 && fcp.startTime >= resource.responseEnd);
}

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
  const frameRef = useRef<HTMLDivElement | null>(null);
  const posterRef = useRef<HTMLImageElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const pausingRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const [pausedByUser, setPausedByUser] = useState(false);
  const [inView, setInView] = useState(eager);
  const [armed, setArmed] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "80px", threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!eager) return;
    const img = posterRef.current;
    if (!img) return;

    let alive = true;
    let observer: PerformanceObserver | null = null;
    let timeout = 0;

    const arm = () => {
      if (!alive) return;
      observer?.disconnect();
      window.clearTimeout(timeout);
      setArmed(true);
    };

    const watchPresentation = () => {
      if (!alive) return;
      if (posterFrameWasPresented(img)) {
        arm();
        return;
      }
      try {
        observer = new PerformanceObserver(() => {
          if (posterFrameWasPresented(img)) arm();
        });
        observer.observe({ type: "paint", buffered: true });
        try {
          observer.observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          /* LCP entries are optional; FCP after the poster response still counts. */
        }
      } catch {
        arm();
        return;
      }
      timeout = window.setTimeout(arm, 2500);
    };

    if (img.complete && img.naturalWidth > 0) watchPresentation();
    else if (typeof img.decode === "function") {
      img.decode().then(watchPresentation).catch(watchPresentation);
    } else {
      img.addEventListener("load", watchPresentation, { once: true });
      img.addEventListener("error", watchPresentation, { once: true });
    }

    return () => {
      alive = false;
      observer?.disconnect();
      window.clearTimeout(timeout);
    };
  }, [eager, poster]);

  useEffect(() => {
    if (eager || !inView || armed) return;
    if (performance.getEntriesByType("paint").some((entry) => entry.name === "first-contentful-paint")) {
      setArmed(true);
      return;
    }
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().some((entry) => entry.name === "first-contentful-paint")) {
          observer?.disconnect();
          setArmed(true);
        }
      });
      observer.observe({ type: "paint", buffered: true });
    } catch {
      setArmed(true);
    }
    return () => observer?.disconnect();
  }, [eager, inView, armed]);

  useEffect(() => {
    const el = (videoRef?.current ?? localRef.current) as HTMLVideoElement | null;
    if (!el) return;

    if (reducedMotion) {
      pausingRef.current = true;
      el.pause();
      el.removeAttribute("autoplay");
      return;
    }

    if (!inView) {
      pausingRef.current = true;
      el.pause();
      return;
    }

    if (!pausedByUser) {
      const play = el.play();
      if (play && typeof play.catch === "function") play.catch(() => undefined);
    }
  }, [reducedMotion, pausedByUser, videoRef, src, inView, armed]);

  const fitClass =
    objectFit === "contain" ? "h-full w-full object-contain" : "h-full w-full object-cover object-top";

  return (
    <div ref={frameRef} className={`relative overflow-hidden bg-[#2A0F1D] ${className}`}>
      {poster ? (
        <img
          ref={posterRef}
          src={poster}
          alt=""
          fetchPriority={eager ? "high" : "auto"}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={`absolute inset-0 ${fitClass}`}
        />
      ) : null}
      {armed ? (
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
          controls={reducedMotion || showControls}
          preload={eager ? "metadata" : "none"}
          onPlaying={() => setShowControls(true)}
          className={`absolute inset-0 ${fitClass}`}
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          onSeeked={(e) => onSeeked?.(e.currentTarget.currentTime)}
          onPlay={() => setPausedByUser(false)}
          onPause={() => {
            if (pausingRef.current) {
              pausingRef.current = false;
              return;
            }
            const el = localRef.current;
            if (el && !el.ended) setPausedByUser(true);
          }}
        />
      ) : null}
      {reducedMotion ? (
        <p className="sr-only">
          הווידאו מושהה כי הופעלה העדפת הפחתת תנועה. אפשר להפעיל ידנית באמצעות פקדי הניגון.
        </p>
      ) : null}
    </div>
  );
}
