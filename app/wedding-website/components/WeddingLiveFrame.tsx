"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type Ref } from "react";

type Props = {
  templateId: string;
  name: string;
  mode: "desktop" | "phone";
  poster: string;
  eager?: boolean;
  frameRef?: Ref<HTMLIFrameElement>;
  onLoad?: () => void;
};

export const weddingLiveFrameCss = `
.ww-live-desktop,
.ww-live-phone {
  container-type: inline-size;
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #2a0f1d;
}
.ww-live-desktop { aspect-ratio: 16 / 10; }
.ww-live-phone { aspect-ratio: 390 / 844; }
.ww-live-desktop iframe,
.ww-live-phone iframe {
  position: absolute;
  top: 0;
  left: 0;
  border: 0;
  background: transparent;
  transform-origin: top left;
}
.ww-live-desktop iframe {
  width: 1280px;
  height: 800px;
  transform: scale(var(--ww-scale, 0.4));
}
.ww-live-phone iframe {
  width: 390px;
  height: 844px;
  transform: scale(var(--ww-scale, 0.36));
}
`;

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
  const [live, setLive] = useState(eager);
  const baseWidth = mode === "desktop" ? 1280 : 390;

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
    if (eager) return;
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLive(true);
        observer.disconnect();
      },
      { rootMargin: "320px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <div ref={box} className={mode === "desktop" ? "ww-live-desktop" : "ww-live-phone"}>
      <Image
        src={poster}
        alt=""
        fill
        unoptimized
        className="object-cover object-top"
        sizes={mode === "desktop" ? "(max-width: 1024px) 100vw, 60vw" : "220px"}
      />
      {live ? (
        <iframe
          ref={frameRef}
          title={`${name} — אתר חתונה לדוגמה, ${mode === "desktop" ? "מחשב" : "טלפון"}`}
          src={`/wedding-website/${templateId}?embed=1`}
          loading={eager ? "eager" : "lazy"}
          onLoad={onLoad}
        />
      ) : null}
    </div>
  );
}
