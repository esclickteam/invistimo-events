"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedPriceProps = {
  value: string;
  className?: string;
  "data-testid"?: string;
};

/**
 * Shows the real price immediately. Animation is cosmetic only —
 * never delays calculation or displays a temporary wrong amount.
 */
export default function AnimatedPrice({
  value,
  className = "",
  "data-testid": testId,
}: AnimatedPriceProps) {
  const [pulse, setPulse] = useState(false);
  const first = useRef(true);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceRef.current) return;

    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 220);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <span
      data-testid={testId}
      className={`pricing-animated-price ${pulse ? "is-updating" : "is-settled"} ${className}`}
    >
      {value}
    </span>
  );
}
