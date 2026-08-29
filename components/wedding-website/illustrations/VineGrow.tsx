"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/** Garden / floral — vines grow with scroll progress */
export default function VineGrow({
  color = "#6B9E78",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 35%"],
  });
  const grow = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0, 1]);

  return (
    <div ref={ref} className={`pointer-events-none relative h-28 w-full overflow-hidden ${className}`} aria-hidden>
      <svg viewBox="0 0 400 100" className="h-full w-full" preserveAspectRatio="none">
        <motion.path
          d="M0 80 C60 20, 100 90, 160 40 S260 10, 320 55 S380 90, 400 40"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ pathLength: grow }}
          opacity={0.7}
        />
        {[70, 150, 230, 310].map((x, i) => (
          <motion.ellipse
            key={x}
            cx={x}
            cy={40 + (i % 2) * 18}
            rx="7"
            ry="11"
            fill={color}
            style={{ opacity: grow, scale: grow }}
            transform={`rotate(${i % 2 === 0 ? -25 : 20} ${x} ${40 + (i % 2) * 18})`}
          />
        ))}
      </svg>
    </div>
  );
}
