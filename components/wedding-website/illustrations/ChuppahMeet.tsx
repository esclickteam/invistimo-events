"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Cinematic scene: bride & groom walk from opposite sides and meet under a floral chuppah. */
export default function ChuppahMeet({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const soft = `${accent}33`;
  const mid = `${accent}88`;

  return (
    <div
      className={`relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl ${className}`}
      aria-hidden
      style={{
        background: `linear-gradient(180deg, ${accent}12 0%, ${accent}08 55%, transparent 100%)`,
        minHeight: 200,
      }}
    >
      {/* Floating petals */}
      {!reduce
        ? [0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute block h-2 w-2 rounded-full"
              style={{
                background: accent,
                opacity: 0.35,
                left: `${12 + i * 18}%`,
                top: 8,
              }}
              animate={{ y: [0, 120], opacity: [0.4, 0], rotate: [0, 80] }}
              transition={{
                duration: 4 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeIn",
              }}
            />
          ))
        : null}

      <svg
        className="mx-auto block h-[200px] w-full max-w-xl"
        viewBox="0 0 420 200"
        fill="none"
      >
        {/* Soft ground */}
        <ellipse cx="210" cy="188" rx="150" ry="10" fill={soft} />

        {/* Chuppah poles + canopy */}
        <motion.g
          initial={reduce ? false : { opacity: 0, y: -12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <line x1="130" y1="48" x2="130" y2="170" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <line x1="290" y1="48" x2="290" y2="170" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          {/* Canopy fabric */}
          <path
            d="M118 52 Q210 18 302 52 L296 78 Q210 52 124 78 Z"
            fill={mid}
            stroke={accent}
            strokeWidth="2"
          />
          <path d="M124 78 Q210 58 296 78" stroke={accent} strokeWidth="1.5" opacity="0.5" />
          {/* Floral clusters on poles */}
          <circle cx="130" cy="46" r="10" fill={accent} fillOpacity="0.55" />
          <circle cx="122" cy="40" r="6" fill={accent} fillOpacity="0.4" />
          <circle cx="140" cy="42" r="5" fill={accent} fillOpacity="0.45" />
          <circle cx="290" cy="46" r="10" fill={accent} fillOpacity="0.55" />
          <circle cx="282" cy="40" r="6" fill={accent} fillOpacity="0.4" />
          <circle cx="300" cy="42" r="5" fill={accent} fillOpacity="0.45" />
        </motion.g>

        {/* Groom walks from right */}
        <motion.g
          initial={reduce ? { x: 0 } : { x: 110 }}
          whileInView={{ x: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        >
          <g transform="translate(232 96)">
            <circle cx="18" cy="14" r="11" fill={accent} />
            <rect x="8" y="28" width="20" height="36" rx="6" fill={accent} fillOpacity="0.9" />
            <rect x="4" y="30" width="8" height="22" rx="3" fill={accent} fillOpacity="0.65" />
            <rect x="24" y="30" width="8" height="22" rx="3" fill={accent} fillOpacity="0.65" />
            <rect x="10" y="62" width="7" height="22" rx="3" fill={accent} fillOpacity="0.75" />
            <rect x="20" y="62" width="7" height="22" rx="3" fill={accent} fillOpacity="0.75" />
          </g>
        </motion.g>

        {/* Bride walks from left */}
        <motion.g
          initial={reduce ? { x: 0 } : { x: -110 }}
          whileInView={{ x: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        >
          <g transform="translate(132 90)">
            <circle cx="22" cy="14" r="11" fill={accent} fillOpacity="0.95" />
            {/* veil */}
            <path d="M12 10 Q22 -6 32 10" fill={accent} fillOpacity="0.2" />
            {/* dress */}
            <path
              d="M10 30 C12 48 14 78 22 92 C30 78 32 48 34 30 Z"
              fill={accent}
              fillOpacity="0.5"
            />
            <path
              d="M8 32 Q22 42 36 32"
              stroke={accent}
              strokeWidth="2"
              fill="none"
              opacity="0.35"
            />
          </g>
        </motion.g>

        {/* Heart when they meet */}
        <motion.path
          d="M210 110 C208 104 200 102 198 108 C196 102 188 104 190 110 C190 118 210 128 210 128 C210 128 230 118 230 110 C232 104 224 102 222 108 C220 102 212 104 210 110Z"
          fill={accent}
          initial={reduce ? { scale: 1, opacity: 0.85 } : { scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 0.9 }}
          viewport={{ once: true }}
          transition={{ delay: 1.7, type: "spring", stiffness: 220, damping: 12 }}
          style={{ transformOrigin: "210px 115px" }}
        />
      </svg>

      <p
        className="pb-3 text-center text-[11px] font-bold tracking-[0.18em]"
        style={{ color: accent }}
      >
        פגישה תחת החופה
      </p>
    </div>
  );
}
