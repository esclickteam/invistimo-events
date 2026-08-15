"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Two paths / people meet in the middle — “how we met”. */
export default function HowWeMetPaths({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto h-28 w-full max-w-lg ${className}`}
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 400 112" fill="none">
        <motion.path
          d="M20 90 C80 90 120 30 200 56"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={reduce ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0.3 }}
          whileInView={{ pathLength: 1, opacity: 0.85 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        <motion.path
          d="M380 90 C320 90 280 30 200 56"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={reduce ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0.3 }}
          whileInView={{ pathLength: 1, opacity: 0.85 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        <motion.circle
          cx="200"
          cy="56"
          r="10"
          fill={accent}
          initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.1, duration: 0.45, type: "spring" }}
        />
        <motion.circle
          cx="48"
          cy="88"
          r="7"
          fill={accent}
          fillOpacity="0.8"
          initial={reduce ? { x: 0 } : { x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1 }}
        />
        <motion.circle
          cx="352"
          cy="88"
          r="7"
          fill={accent}
          fillOpacity="0.8"
          initial={reduce ? { x: 0 } : { x: 20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1 }}
        />
      </svg>
    </div>
  );
}
