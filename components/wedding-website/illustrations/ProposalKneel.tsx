"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Proposal scene — groom kneels, offers a ring to the bride. */
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
      className={`relative mx-auto flex h-44 w-full max-w-md items-end justify-center gap-6 ${className}`}
      aria-hidden
    >
      {/* Soft glow */}
      <motion.div
        className="pointer-events-none absolute inset-x-10 bottom-0 h-16 rounded-full blur-2xl"
        style={{ background: `${accent}33` }}
        animate={reduce ? { opacity: 0.4 } : { opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Kneeling groom */}
      <motion.div
        initial={reduce ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.8 }}
      >
        <svg width="70" height="110" viewBox="0 0 70 110" fill="none">
          <circle cx="34" cy="18" r="10" fill={accent} />
          {/* torso leaning */}
          <path
            d="M22 32 C24 48 28 58 34 62 C40 58 44 48 46 32 Z"
            fill={accent}
            fillOpacity="0.85"
          />
          {/* kneeling leg */}
          <path
            d="M30 62 L22 92 L34 94 L38 66 Z"
            fill={accent}
            fillOpacity="0.7"
          />
          <path
            d="M38 64 L52 88 L60 84 L46 60 Z"
            fill={accent}
            fillOpacity="0.65"
          />
          {/* arm with ring */}
          <motion.g
            initial={reduce ? { rotate: 0 } : { rotate: 18 }}
            whileInView={{ rotate: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7 }}
            style={{ originX: "34px", originY: "40px" }}
          >
            <path
              d="M44 40 L58 48"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="60" cy="50" r="5" fill="#F5D76E" stroke={accent} strokeWidth="1.5" />
            <circle cx="60" cy="50" r="2" fill="#fff" fillOpacity="0.7" />
          </motion.g>
        </svg>
      </motion.div>

      {/* Standing bride */}
      <motion.div
        initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <svg width="56" height="120" viewBox="0 0 56 120" fill="none">
          <circle cx="28" cy="16" r="10" fill={accent} fillOpacity="0.9" />
          <path
            d="M12 30 C14 70 18 108 28 112 C38 108 42 70 44 30 Z"
            fill={accent}
            fillOpacity="0.45"
          />
          <path
            d="M10 32 Q28 42 46 32"
            stroke={accent}
            strokeWidth="2"
            fill="none"
            opacity="0.4"
          />
          {/* happy hearts */}
          <motion.g
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <path
              d="M40 8 C40 5 44 4 45 7 C46 4 50 5 50 8 C50 12 45 15 45 15 C45 15 40 12 40 8Z"
              fill={accent}
              fillOpacity="0.7"
            />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
