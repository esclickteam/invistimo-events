"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/** Location — route draws to a venue pin as you scroll */
export default function ScrollRoute({
  accent = "#C9A962",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 40%"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.05, 1]);
  const pinScale = useTransform(scrollYProgress, [0.7, 1], reduce ? [1, 1] : [0.6, 1]);
  const pinOpacity = useTransform(scrollYProgress, [0.55, 0.85], reduce ? [1, 1] : [0, 1]);

  return (
    <div ref={ref} className={`relative mx-auto h-40 w-full max-w-md ${className}`} aria-hidden>
      <svg viewBox="0 0 320 140" className="h-full w-full">
        <motion.path
          d="M20 110 C70 40, 120 130, 170 70 S250 20, 300 55"
          fill="none"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength }}
          opacity={0.75}
        />
        <motion.g style={{ scale: pinScale, opacity: pinOpacity, transformOrigin: "300px 45px" }}>
          <circle cx="300" cy="55" r="10" fill={accent} opacity={0.25} />
          <circle cx="300" cy="55" r="5" fill={accent} />
          <path d="M300 30 L308 48 L292 48 Z" fill={accent} />
        </motion.g>
      </svg>
    </div>
  );
}
