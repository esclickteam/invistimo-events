"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  accent?: string;
  label?: string;
  className?: string;
};

/**
 * Elegant shuttle illustration that drifts RTL (right → left) in a reserved lane.
 * Transform-only animation — no layout shift. Respects prefers-reduced-motion.
 */
export default function ShuttleRide({
  accent = "#3D8BBA",
  label = "הסעה לאירוע",
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative h-24 w-full overflow-hidden rounded-2xl ${className}`}
      aria-hidden
      style={{
        background: `linear-gradient(180deg, transparent 55%, ${accent}18 55%, ${accent}18 70%, transparent 70%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-[58%] h-px opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 18px, transparent 18px 34px)`,
        }}
      />

      <motion.div
        className="absolute top-3 flex items-center gap-3"
        style={{ right: 0 }}
        initial={reduce ? { x: "-35%" } : { x: "10%" }}
        animate={reduce ? { x: "-35%" } : { x: ["10%", "-120%"] }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 14, ease: "linear", repeat: Infinity, repeatDelay: 1.5 }
        }
      >
        <svg width="120" height="56" viewBox="0 0 120 56" fill="none">
          <rect
            x="8"
            y="14"
            width="96"
            height="28"
            rx="10"
            fill={accent}
            fillOpacity="0.92"
          />
          <rect x="18" y="20" width="18" height="12" rx="2" fill="white" fillOpacity="0.85" />
          <rect x="42" y="20" width="18" height="12" rx="2" fill="white" fillOpacity="0.85" />
          <rect x="66" y="20" width="18" height="12" rx="2" fill="white" fillOpacity="0.85" />
          <circle cx="28" cy="44" r="6" fill="#2A2A2A" />
          <circle cx="28" cy="44" r="2.5" fill="#D0D0D0" />
          <circle cx="88" cy="44" r="6" fill="#2A2A2A" />
          <circle cx="88" cy="44" r="2.5" fill="#D0D0D0" />
          <path d="M104 22h10l4 10H104V22Z" fill={accent} fillOpacity="0.75" />
        </svg>
        <span
          className="whitespace-nowrap text-xs font-semibold tracking-wide"
          style={{ color: accent }}
        >
          {label}
        </span>
      </motion.div>
    </div>
  );
}
