"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/** Coastal Breeze — scroll-linked wave ribbons */
export default function WaveMotion({
  color = "#3D8BBA",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x1 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -80]);
  const x2 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 60]);

  return (
    <div ref={ref} className={`pointer-events-none relative h-28 w-full overflow-hidden ${className}`} aria-hidden>
      <motion.svg style={{ x: x1 }} className="absolute inset-x-0 top-2 h-16 w-[140%]" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path
          d="M0,60 C150,20 300,100 450,60 C600,20 750,100 900,60 C1050,20 1200,80 1200,60 L1200,120 L0,120 Z"
          fill={color}
          opacity="0.18"
        />
      </motion.svg>
      <motion.svg style={{ x: x2 }} className="absolute inset-x-0 top-8 h-16 w-[140%]" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path
          d="M0,70 C200,30 350,110 550,70 C750,30 900,110 1100,70 C1150,60 1200,80 1200,70 L1200,120 L0,120 Z"
          fill={color}
          opacity="0.28"
        />
      </motion.svg>
    </div>
  );
}
