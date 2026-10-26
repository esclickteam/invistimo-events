"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  getPublicVideoMeta,
  publicVideoShellClass,
  type PublicVideoMeta,
} from "@/lib/marketing/publicVideoMeta";

export type PublicAutoplayVideoProps = {
  src: string;
  poster?: string;
  title: string;
  className?: string;
  /** Frame/shell className; defaults from intrinsic orientation */
  shellClassName?: string;
  /** Eager hero: preload metadata immediately */
  eager?: boolean;
  /** Show native controls (default false — use accessible toggle + optional expand) */
  controls?: boolean;
  /** Allow user to unmute when narration matters; starts muted for autoplay */
  allowUnmute?: boolean;
  /** Offer lightbox expand for dense UI recordings */
  expandable?: boolean;
  /** Optional <track> captions */
  captionsSrc?: string;
  captionsLabel?: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeked?: (currentTime: number) => void;
  /** Override aspect-ratio CSS; otherwise from registry or measured */
  aspectRatio?: string;
  /** Fill color behind letterboxing */
  frameBg?: string;
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

/**
 * Unified public-site video policy:
 * autoplay (muted) + loop + playsInline when in view,
 * object-fit contain + intrinsic aspect-ratio (no crop),
 * pause when off-screen, respect reduced-motion, accessible play/pause.
 */
export default function PublicAutoplayVideo({
  src,
  poster,
  title,
  className = "",
  shellClassName,
  eager = false,
  controls = false,
  allowUnmute = false,
  expandable,
  captionsSrc,
  captionsLabel = "עברית",
  videoRef,
  onTimeUpdate,
  onSeeked,
  aspectRatio: aspectRatioProp,
  frameBg = "#17120E",
}: PublicAutoplayVideoProps) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const programmaticPause = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const [pausedByUser, setPausedByUser] = useState(false);
  const [inView, setInView] = useState(eager);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState<PublicVideoMeta | null>(null);
  const labelId = useId();

  const registryMeta = getPublicVideoMeta(src);
  const meta = measured ?? registryMeta;
  const aspectRatio = aspectRatioProp || meta?.aspectRatio || undefined;
  const canExpand = expandable ?? Boolean(meta?.expandable);

  const assignRef = useCallback(
    (node: HTMLVideoElement | null) => {
      localRef.current = node;
      if (videoRef) {
        (videoRef as MutableRefObject<HTMLVideoElement | null>).current = node;
      }
    },
    [videoRef]
  );

  // Near-viewport: start loading source (lazy); eager skips this.
  useEffect(() => {
    if (shouldLoad) return;
    const el = shellRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "280px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  // Play/pause by visibility
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.2);
        setInView(visible);
      },
      { threshold: [0, 0.2, 0.35, 0.5, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = localRef.current;
    if (!el || !shouldLoad) return;

    if (reducedMotion) {
      programmaticPause.current = true;
      el.pause();
      el.removeAttribute("autoplay");
      setPlaying(false);
      return;
    }

    if (!inView || pausedByUser || autoplayBlocked) {
      programmaticPause.current = true;
      el.pause();
      setPlaying(false);
      return;
    }

    const attempt = el.play();
    if (attempt && typeof attempt.then === "function") {
      attempt
        .then(() => {
          programmaticPause.current = false;
          setPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          setAutoplayBlocked(true);
          setPlaying(false);
        });
    } else {
      programmaticPause.current = false;
      setPlaying(true);
    }
  }, [reducedMotion, pausedByUser, inView, src, shouldLoad, autoplayBlocked, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const togglePlay = () => {
    const el = localRef.current;
    if (!el) return;
    if (el.paused) {
      setPausedByUser(false);
      setAutoplayBlocked(false);
      programmaticPause.current = false;
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setAutoplayBlocked(true));
    } else {
      setPausedByUser(true);
      programmaticPause.current = false;
      el.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const el = localRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const onLoadedMeta = () => {
    const el = localRef.current;
    if (!el || registryMeta) return;
    const w = el.videoWidth;
    const h = el.videoHeight;
    if (w > 0 && h > 0) {
      setMeasured({
        width: w,
        height: h,
        aspectRatio: `${w} / ${h}`,
        orientation: w === h ? "square" : w > h ? "landscape" : "portrait",
        expandable: w >= h,
      });
    }
  };

  const shell = shellClassName ?? publicVideoShellClass(meta);
  const classHasAspect = /\baspect-/.test(className);
  const frameStyle: CSSProperties = {
    backgroundColor: frameBg,
    ...(!classHasAspect ? { aspectRatio: aspectRatio || "16 / 9" } : null),
  };

  const videoEl = (
    <video
      ref={assignRef}
      src={shouldLoad ? src : undefined}
      poster={poster}
      title={title}
      aria-labelledby={labelId}
      muted={muted}
      loop
      playsInline
      autoPlay={!reducedMotion && !pausedByUser}
      controls={controls}
      preload={eager || shouldLoad ? "metadata" : "none"}
      className="absolute inset-0 h-full w-full object-contain object-center"
      onLoadedMetadata={onLoadedMeta}
      onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
      onSeeked={(e) => onSeeked?.(e.currentTarget.currentTime)}
      onPlay={() => {
        programmaticPause.current = false;
        setPlaying(true);
        setPausedByUser(false);
        setAutoplayBlocked(false);
      }}
      onPause={() => {
        if (programmaticPause.current) return;
        const el = localRef.current;
        if (el && !el.ended) {
          setPausedByUser(true);
          setPlaying(false);
        }
      }}
    >
      {captionsSrc ? (
        <track kind="captions" srcLang="he" label={captionsLabel} src={captionsSrc} default />
      ) : null}
    </video>
  );

  return (
    <>
      <div
        ref={shellRef}
        className={`relative ${shell}`}
        data-public-autoplay-video={src}
      >
        <div
          className={`relative w-full overflow-hidden ${className}`}
          style={frameStyle}
        >
          {poster && !shouldLoad ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain object-center"
              loading={eager ? "eager" : "lazy"}
              decoding="async"
            />
          ) : null}
          {videoEl}

          {/* Accessible controls — compact bar, never a giant Play overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-black/55 via-black/20 to-transparent p-2.5 pt-10">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                aria-pressed={playing}
                aria-label={playing ? `השהיית סרטון: ${title}` : `ניגון סרטון: ${title}`}
              >
                {playing ? "השהיה" : "ניגון"}
              </button>
              {allowUnmute ? (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/25 bg-black/45 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                  aria-pressed={!muted}
                  aria-label={muted ? "הפעלת קול" : "השתקת קול"}
                >
                  {muted ? "הפעלת קול" : "השתקה"}
                </button>
              ) : null}
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/25 bg-black/45 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                  aria-label={`הגדלת סרטון: ${title}`}
                >
                  הגדלה
                </button>
              ) : null}
            </div>
            {(reducedMotion || autoplayBlocked) && !playing ? (
              <p className="pointer-events-none max-w-[14rem] text-left text-[10px] font-semibold leading-4 text-white/90">
                {reducedMotion
                  ? "הניגון האוטומטי מושהה (הפחתת תנועה)"
                  : "הדפדפן חסם ניגון אוטומטי — לחצו ניגון"}
              </p>
            ) : null}
          </div>
        </div>
        <p id={labelId} className="sr-only">
          {title}
          {reducedMotion
            ? " · הווידאו מושהה כי הופעלה העדפת הפחתת תנועה. אפשר להפעיל ידנית."
            : ""}
        </p>
      </div>

      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            style={aspectRatio ? { aspectRatio } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={src}
              poster={poster}
              title={title}
              muted={muted}
              loop
              playsInline
              autoPlay
              controls
              preload="metadata"
              className="h-full max-h-[90vh] w-full object-contain"
            >
              {captionsSrc ? (
                <track
                  kind="captions"
                  srcLang="he"
                  label={captionsLabel}
                  src={captionsSrc}
                  default
                />
              ) : null}
            </video>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/55 px-3 py-2 text-xs font-bold text-white"
              aria-label="סגירת תצוגה מוגדלת"
            >
              סגירה
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
