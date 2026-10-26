"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "desktop" | "mobile";

type Props = {
  templateId: string;
  title: string;
  variant?: Variant;
  /** CSS height of the visible frame */
  frameHeight?: number;
  className?: string;
  eager?: boolean;
};

/**
 * Lazy live preview of a real demo template.
 * Renders a full-width iframe scaled into a large frame — not a tiny card crop.
 */
export default function LiveSiteFrame({
  templateId,
  title,
  variant = "desktop",
  frameHeight,
  className = "",
  eager = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(eager);
  const isMobile = variant === "mobile";
  const srcWidth = isMobile ? 390 : 1280;
  const srcHeight = isMobile ? 2400 : 3200;
  const height = frameHeight ?? (isMobile ? 560 : 520);

  useEffect(() => {
    if (eager || active) return;
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: "280px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, active]);

  return (
    <div
      ref={hostRef}
      className={`relative overflow-hidden bg-[#1A1510] ${className}`}
      style={{ height }}
    >
      {active ? (
        <iframe
          src={`/wedding-website/${templateId}?embed=1`}
          title={title}
          loading={eager ? "eager" : "lazy"}
          className="pointer-events-none absolute left-1/2 top-0 border-0"
          style={{
            width: srcWidth,
            height: srcHeight,
            transform: `translateX(-50%) scale(var(--ww-preview-scale, ${isMobile ? 0.72 : 0.55}))`,
            transformOrigin: "top center",
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#2A2118] to-[#1A1510] text-sm text-[#E8D5A8]/70">
          טוען תצוגה חיה…
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1A1510]/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}
