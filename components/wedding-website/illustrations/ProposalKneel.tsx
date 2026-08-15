"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Proposal scene — groom kneels with a glowing ring; bride reacts with hearts. */
export default function ProposalKneel({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl ${className}`}
      aria-hidden
      style={{
        background: `radial-gradient(ellipse at 50% 70%, ${accent}20 0%, ${accent}08 45%, transparent 75%)`,
        minHeight: 230,
      }}
    >
      <svg className="mx-auto block h-[220px] w-full max-w-md" viewBox="0 0 360 220" fill="none">
        <ellipse cx="180" cy="200" rx="120" ry="10" fill={`${accent}22`} />

        {/* Sparkles */}
        {!reduce
          ? [0, 1, 2, 3].map((i) => (
              <motion.circle
                key={i}
                cx={90 + i * 50}
                cy={30 + (i % 2) * 18}
                r="2.5"
                fill={accent}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.35 }}
              />
            ))
          : null}

        {/* Bride standing */}
        <motion.g
          initial={reduce ? false : { opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <g transform="translate(200 48)">
            <circle cx="28" cy="16" r="12" fill={accent} fillOpacity="0.92" />
            <path d="M16 12 Q28 -4 40 12" fill={accent} fillOpacity="0.18" />
            <path
              d="M10 34 C14 70 18 120 28 132 C38 120 42 70 46 34 Z"
              fill={accent}
              fillOpacity="0.42"
            />
            <path
              d="M8 36 Q28 48 48 36"
              stroke={accent}
              strokeWidth="2"
              fill="none"
              opacity="0.35"
            />
            {/* Hands to face / surprise */}
            <motion.g
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 }}
            >
              <path
                d="M48 8 C48 4 54 2 56 7 C58 2 64 4 64 8 C64 14 56 18 56 18 C56 18 48 14 48 8Z"
                fill={accent}
                fillOpacity="0.75"
              />
            </motion.g>
          </g>
        </motion.g>

        {/* Groom kneels */}
        <motion.g
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, delay: 0.15 }}
        >
          <g transform="translate(70 70)">
            <circle cx="40" cy="18" r="12" fill={accent} />
            {/* Torso leaning forward */}
            <path
              d="M24 34 C28 55 34 70 42 76 C50 70 56 55 60 34 Z"
              fill={accent}
              fillOpacity="0.88"
            />
            {/* Kneeling legs */}
            <path
              d="M36 74 L24 118 L42 122 L50 80 Z"
              fill={accent}
              fillOpacity="0.72"
            />
            <path
              d="M50 76 L72 112 L88 106 L64 72 Z"
              fill={accent}
              fillOpacity="0.65"
            />
            {/* Arm offering ring */}
            <motion.g
              initial={reduce ? false : { rotate: 22 }}
              whileInView={{ rotate: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
              style={{ transformOrigin: "58px 48px" }}
            >
              <path
                d="M54 44 L92 58"
                stroke={accent}
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Ring box */}
              <rect
                x="88"
                y="48"
                width="22"
                height="16"
                rx="3"
                fill={accent}
                fillOpacity="0.9"
              />
              <motion.circle
                cx="99"
                cy="56"
                r="5"
                fill="#F5D76E"
                stroke="#fff"
                strokeWidth="1"
                animate={reduce ? undefined : { scale: [1, 1.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 1.2 }}
              />
            </motion.g>
          </g>
        </motion.g>
      </svg>
      <p
        className="pb-3 text-center text-[11px] font-bold tracking-[0.18em]"
        style={{ color: accent }}
      >
        הרגע שבו הוא כרע ברך
      </p>
    </div>
  );
}
