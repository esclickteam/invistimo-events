"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Couples dancing — looping silhouette animation for reception / dance schedule. */
export default function DanceParty({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto h-36 w-full max-w-lg overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-x-0 bottom-4 h-px opacity-40"
        style={{ background: accent }}
      />
      <div className="absolute inset-0 flex items-end justify-center gap-4 pb-5 md:gap-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={
              reduce
                ? { y: 0, rotate: 0 }
                : {
                    y: [0, -6, 0, -4, 0],
                    rotate: i % 2 === 0 ? [0, -6, 4, -3, 0] : [0, 5, -4, 3, 0],
                  }
            }
            transition={{
              duration: 1.4 + i * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.12,
            }}
          >
            <DanceCouple accent={accent} mirror={i === 1} />
          </motion.div>
        ))}
      </div>
      <p
        className="absolute inset-x-0 bottom-0 text-center text-[10px] font-bold tracking-wide"
        style={{ color: accent }}
      >
        רוקדים יחד
      </p>
    </div>
  );
}

function DanceCouple({ accent, mirror }: { accent: string; mirror?: boolean }) {
  return (
    <svg
      width="56"
      height="72"
      viewBox="0 0 56 72"
      fill="none"
      style={{ transform: mirror ? "scaleX(-1)" : undefined }}
    >
      {/* left dancer */}
      <circle cx="18" cy="12" r="6" fill={accent} fillOpacity="0.9" />
      <path
        d="M10 22 C12 36 14 52 18 58 C22 52 24 36 26 22 Z"
        fill={accent}
        fillOpacity="0.55"
      />
      <path d="M12 28 L6 40" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 28 L32 24" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      {/* right dancer */}
      <circle cx="38" cy="12" r="6" fill={accent} />
      <rect x="30" y="20" width="16" height="28" rx="4" fill={accent} fillOpacity="0.75" />
      <path d="M32 28 L26 24" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 28 L50 38" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
