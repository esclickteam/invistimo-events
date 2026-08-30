"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

function shouldEaseMobileScroll() {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia("(max-width: 767px)").matches) return true;
  const canvas = document.querySelector(".ww-editor-canvas") as HTMLElement | null;
  return Boolean(canvas && canvas.clientWidth > 0 && canvas.clientWidth < 700);
}

export function useEaseMobileScroll() {
  const [ease, setEase] = useState(true);

  useEffect(() => {
    const apply = () => setEase(shouldEaseMobileScroll());
    apply();
    const widthMq = window.matchMedia("(max-width: 767px)");
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    widthMq.addEventListener("change", apply);
    reduceMq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    const canvas = document.querySelector(".ww-editor-canvas");
    const observer = canvas ? new ResizeObserver(apply) : null;
    if (canvas && observer) observer.observe(canvas);
    return () => {
      widthMq.removeEventListener("change", apply);
      reduceMq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
      observer?.disconnect();
    };
  }, []);

  return ease;
}

export function WeddingMotionRoot({ children }: { children: ReactNode }) {
  const ease = useEaseMobileScroll();
  return <MotionConfig reducedMotion={ease ? "always" : "user"}>{children}</MotionConfig>;
}

export function WeddingDesktopFx({ children }: { children: ReactNode }) {
  const ease = useEaseMobileScroll();
  if (ease) return null;
  return <>{children}</>;
}
