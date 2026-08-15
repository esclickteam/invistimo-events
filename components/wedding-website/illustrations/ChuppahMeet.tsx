"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Bride & groom walk from opposite sides and meet under a chuppah. */
export default function ChuppahMeet({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto h-40 w-full max-w-xl overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Ground */}
      <div
        className="absolute inset-x-0 bottom-3 h-px opacity-50"
        style={{ background: accent }}
      />

      {/* Chuppah */}
      <motion.div
        className="absolute left-1/2 top-2 -translate-x-1/2"
        initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7 }}
      >
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <path
            d="M10 28 L60 8 L110 28"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M18 28 h84 v8 H18Z" fill={accent} fillOpacity="0.35" />
          <line x1="22" y1="36" x2="22" y2="82" stroke={accent} strokeWidth="2.5" />
          <line x1="98" y1="36" x2="98" y2="82" stroke={accent} strokeWidth="2.5" />
          <line x1="40" y1="36" x2="40" y2="70" stroke={accent} strokeWidth="1.5" opacity="0.5" />
          <line x1="80" y1="36" x2="80" y2="70" stroke={accent} strokeWidth="1.5" opacity="0.5" />
          {/* flowers on poles */}
          <circle cx="22" cy="34" r="4" fill={accent} fillOpacity="0.7" />
          <circle cx="98" cy="34" r="4" fill={accent} fillOpacity="0.7" />
        </svg>
      </motion.div>

      {/* Groom from right (LTR visual: right side) */}
      <motion.div
        className="absolute bottom-4"
        style={{ right: "8%" }}
        initial={reduce ? { x: 0, opacity: 1 } : { x: 90, opacity: 0 }}
        whileInView={{ x: 28, opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
      >
        <PersonSilhouette accent={accent} variant="groom" />
      </motion.div>

      {/* Bride from left */}
      <motion.div
        className="absolute bottom-4"
        style={{ left: "8%" }}
        initial={reduce ? { x: 0, opacity: 1 } : { x: -90, opacity: 0 }}
        whileInView={{ x: -28, opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
      >
        <PersonSilhouette accent={accent} variant="bride" />
      </motion.div>
    </div>
  );
}

function PersonSilhouette({
  accent,
  variant,
}: {
  accent: string;
  variant: "bride" | "groom";
}) {
  if (variant === "bride") {
    return (
      <svg width="36" height="56" viewBox="0 0 36 56" fill="none">
        <circle cx="18" cy="10" r="7" fill={accent} fillOpacity="0.9" />
        <path
          d="M8 22 C8 22 10 50 18 52 C26 50 28 22 28 22 Z"
          fill={accent}
          fillOpacity="0.55"
        />
        <path d="M6 24 Q18 30 30 24" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg width="32" height="56" viewBox="0 0 32 56" fill="none">
      <circle cx="16" cy="10" r="7" fill={accent} fillOpacity="0.95" />
      <rect x="8" y="20" width="16" height="28" rx="4" fill={accent} fillOpacity="0.75" />
      <rect x="6" y="22" width="6" height="18" rx="2" fill={accent} fillOpacity="0.55" />
      <rect x="20" y="22" width="6" height="18" rx="2" fill={accent} fillOpacity="0.55" />
    </svg>
  );
}
