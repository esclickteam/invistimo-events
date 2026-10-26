"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
};

/** One-shot reveal on scroll. Content stays visible for SSR / no-JS. */
export default function RevealOnScroll({ children, className = "" }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReady(false);
      setVisible(true);
      return;
    }

    setReady(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`pricing-reveal ${className}`}
      data-ready={ready ? "true" : "false"}
      data-visible={visible ? "true" : "false"}
    >
      {children}
    </div>
  );
}
