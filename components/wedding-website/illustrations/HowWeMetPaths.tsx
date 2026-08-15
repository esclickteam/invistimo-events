"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Two people walk toward each other along curved paths and meet with a heart. */
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
      className={`relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl ${className}`}
      aria-hidden
      style={{
        background: `linear-gradient(180deg, ${accent}10 0%, transparent 100%)`,
        minHeight: 150,
      }}
    >
      <svg className="mx-auto block h-[140px] w-full" viewBox="0 0 400 140" fill="none">
        <motion.path
          d="M24 108 C90 108 130 40 200 68"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="6 8"
          initial={reduce ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0.35 }}
          whileInView={{ pathLength: 1, opacity: 0.85 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        <motion.path
          d="M376 108 C310 108 270 40 200 68"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="6 8"
          initial={reduce ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0.35 }}
          whileInView={{ pathLength: 1, opacity: 0.85 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Person left */}
        <motion.g
          initial={reduce ? false : { x: -30, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
        >
          <circle cx="48" cy="100" r="9" fill={accent} />
          <rect x="40" y="110" width="16" height="20" rx="4" fill={accent} fillOpacity="0.75" />
        </motion.g>

        {/* Person right */}
        <motion.g
          initial={reduce ? false : { x: 30, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
        >
          <circle cx="352" cy="100" r="9" fill={accent} fillOpacity="0.9" />
          <path
            d="M342 112 C344 128 348 140 352 144 C356 140 360 128 362 112 Z"
            fill={accent}
            fillOpacity="0.5"
          />
        </motion.g>

        <motion.path
          d="M200 58 C198 52 190 50 188 56 C186 50 178 52 180 58 C180 66 200 76 200 76 C200 76 220 66 220 58 C222 52 214 50 212 56 C210 50 202 52 200 58Z"
          fill={accent}
          initial={reduce ? { scale: 1, opacity: 0.9 } : { scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 0.95 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
          style={{ transformOrigin: "200px 62px" }}
        />
      </svg>
      <p
        className="pb-3 text-center text-[11px] font-bold tracking-[0.18em]"
        style={{ color: accent }}
      >
        שני מסלולים שנפגשו
      </p>
    </div>
  );
}
