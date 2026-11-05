"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

/**
 * Below-fold screenshots stay out of the first request wave.
 * Width and height keep the box stable until the file is near the viewport.
 */
export default function DeferredShot({ src, alt, width, height, className }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "120px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={ref}
      src={ready ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      className={className}
    />
  );
}
