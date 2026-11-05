"use client";

import { useEffect, useRef, useState } from "react";

/** Scroll progress 0→1 for a tall sticky section. No scroll hijacking. */
export function useScrollProgress() {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMq = () => setReduceMotion(mq.matches);
    syncMq();
    mq.addEventListener?.("change", syncMq);
    return () => mq.removeEventListener?.("change", syncMq);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, el.offsetHeight - window.innerHeight);
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      const next = scrolled / total;
      setProgress((prev) => (Math.abs(prev - next) < 0.012 ? prev : next));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, progress, reduceMotion };
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Map global progress into a local 0→1 window. */
export function segment(progress: number, start: number, end: number) {
  if (end <= start) return progress >= end ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}
