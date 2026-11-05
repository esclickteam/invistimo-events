"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { weddingLiveFrameCss } from "./weddingLiveFrameCss";

export { weddingLiveFrameCss };

type Props = {
  templateId: string;
  name: string;
  mode: "desktop" | "phone";
  poster: string;
  eager?: boolean;
  frameRef?: Ref<HTMLIFrameElement>;
  onLoad?: () => void;
};

/** At most two embedded sites hydrate at once. Posters stay visible until then. */
const MAX_CONCURRENT = 2;
let activeLoads = 0;
const pending: Array<{ cancelled: boolean; start: () => void }> = [];

function pumpQueue() {
  while (activeLoads < MAX_CONCURRENT && pending.length) {
    const job = pending.shift();
    if (!job || job.cancelled) continue;
    activeLoads += 1;
    job.start();
  }
}

function enqueueLive(start: () => void) {
  const job = { cancelled: false, start };
  pending.push(job);
  pumpQueue();
  return () => {
    job.cancelled = true;
  };
}

function releaseLiveSlot() {
  activeLoads = Math.max(0, activeLoads - 1);
  pumpQueue();
}

/** Live sites start on the first gesture, or once the first paint has had a quiet window. */
function whenCalm(run: () => void) {
  let done = false;
  let timer = 0;
  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", finish);
    window.removeEventListener("keydown", finish);
    window.removeEventListener("scroll", finish);
    window.removeEventListener("load", start);
    run();
  };
  const start = () => {
    const wait = Math.max(0, 6500 - performance.now());
    timer = window.setTimeout(finish, wait);
    window.addEventListener("pointerdown", finish, { once: true, passive: true });
    window.addEventListener("keydown", finish, { once: true });
    window.addEventListener("scroll", finish, { once: true, passive: true });
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return () => {
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", finish);
    window.removeEventListener("keydown", finish);
    window.removeEventListener("scroll", finish);
    window.removeEventListener("load", start);
  };
}

export default function WeddingLiveFrame({
  templateId,
  name,
  mode,
  poster,
  eager = false,
  frameRef,
  onLoad,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const slotHeld = useRef(false);
  const [wanted, setWanted] = useState(false);
  const [showPoster, setShowPoster] = useState(eager);
  const [live, setLive] = useState(false);
  const baseWidth = mode === "desktop" ? 1280 : 390;

  const freeSlot = () => {
    if (!slotHeld.current) return;
    slotHeld.current = false;
    releaseLiveSlot();
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const apply = () => {
      const width = el.clientWidth;
      if (width > 0) el.style.setProperty("--ww-scale", String(width / baseWidth));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [baseWidth]);

  useEffect(() => {
    if (!eager) return;
    return whenCalm(() => setWanted(true));
  }, [eager]);

  useEffect(() => {
    if (eager) return;
    const el = box.current;
    let stop = () => {};
    let alive = true;
    const arm = () => {
      if (!alive) return;
      setShowPoster(true);
      stop = whenCalm(() => {
        if (alive) setWanted(true);
      });
    };
    if (!el || typeof IntersectionObserver === "undefined") {
      arm();
      return () => {
        alive = false;
        stop();
      };
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        arm();
        observer.disconnect();
      },
      { rootMargin: "480px 0px" }
    );
    observer.observe(el);
    return () => {
      alive = false;
      stop();
      observer.disconnect();
    };
  }, [eager]);

  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    const cancel = enqueueLive(() => {
      if (!alive) {
        releaseLiveSlot();
        return;
      }
      slotHeld.current = true;
      setLive(true);
    });
    return () => {
      alive = false;
      cancel();
      freeSlot();
    };
    // freeSlot is stable enough for this mount; slotHeld guards double release.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  useEffect(() => {
    if (!live) return;
    const timer = window.setTimeout(() => freeSlot(), 15000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div ref={box} className={mode === "desktop" ? "ww-live-desktop" : "ww-live-phone"}>
      {showPoster ? (
        <img
          src={poster}
          alt=""
          fetchPriority="low"
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}
      {live ? (
        <iframe
          ref={frameRef}
          title={`${name} — אתר חתונה לדוגמה, ${mode === "desktop" ? "מחשב" : "טלפון"}`}
          src={`/wedding-website/${templateId}?embed=1`}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => {
            freeSlot();
            onLoad?.();
          }}
        />
      ) : null}
    </div>
  );
}
