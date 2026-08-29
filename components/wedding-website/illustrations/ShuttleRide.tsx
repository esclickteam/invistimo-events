"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  accent?: string;
  label?: string;
  className?: string;
};

/**
 * Shuttle travels along a ridge/road — transform-only, respects reduced motion.
 */
export default function ShuttleRide({
  accent = "#3D8BBA",
  label = "הסעה לאירוע",
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative h-32 w-full overflow-hidden rounded-2xl ${className}`}
      aria-hidden
      style={{
        background: `linear-gradient(180deg, ${accent}10 0%, ${accent}08 42%, ${accent}22 58%, ${accent}18 72%, transparent 72%)`,
      }}
    >
      {/* Ridge hills */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-10 h-16 w-full"
        viewBox="0 0 600 64"
        preserveAspectRatio="none"
      >
        <path
          d="M0 48 Q80 20 160 40 T320 36 T480 44 T600 30 V64 H0Z"
          fill={accent}
          fillOpacity="0.18"
        />
        <path
          d="M0 52 Q100 28 200 46 T400 40 T600 48 V64 H0Z"
          fill={accent}
          fillOpacity="0.28"
        />
      </svg>

      {/* Road */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[68%] h-[3px] opacity-50"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 16px, transparent 16px 30px)`,
        }}
      />

      <motion.div
        className="absolute top-6 flex items-center gap-3"
        style={{ right: 0 }}
        initial={reduce ? { x: "-40%" } : { x: "12%" }}
        animate={reduce ? { x: "-40%" } : { x: ["12%", "-125%"] }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 16, ease: "linear", repeat: Infinity, repeatDelay: 1.2 }
        }
      >
        <svg width="132" height="60" viewBox="0 0 132 60" fill="none">
          <rect x="10" y="14" width="100" height="30" rx="11" fill={accent} fillOpacity="0.95" />
          <rect x="20" y="20" width="18" height="12" rx="2" fill="white" fillOpacity="0.88" />
          <rect x="44" y="20" width="18" height="12" rx="2" fill="white" fillOpacity="0.88" />
          <rect x="68" y="20" width="18" height="12" rx="2" fill="white" fillOpacity="0.88" />
          <circle cx="32" cy="46" r="7" fill="#2A2A2A" />
          <circle cx="32" cy="46" r="2.8" fill="#D0D0D0" />
          <circle cx="92" cy="46" r="7" fill="#2A2A2A" />
          <circle cx="92" cy="46" r="2.8" fill="#D0D0D0" />
          <path d="M110 22h12l5 12H110V22Z" fill={accent} fillOpacity="0.8" />
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
