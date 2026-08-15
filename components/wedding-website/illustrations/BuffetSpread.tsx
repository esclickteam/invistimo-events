"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Banquet tables slide in from the sides; dishes and candles appear on top. */
export default function BuffetSpread({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const tables = [
    { x: -1, delay: 0 },
    { x: 0, delay: 0.15 },
    { x: 1, delay: 0.3 },
  ];

  return (
    <div
      className={`relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl ${className}`}
      aria-hidden
      style={{
        background: `linear-gradient(180deg, ${accent}10 0%, transparent 100%)`,
        minHeight: 180,
      }}
    >
      <svg className="mx-auto block h-[170px] w-full max-w-xl" viewBox="0 0 420 170" fill="none">
        <ellipse cx="210" cy="155" rx="160" ry="8" fill={`${accent}22`} />

        {tables.map((t, i) => (
          <motion.g
            key={t.x}
            initial={
              reduce
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: t.x * 100, scale: 0.85 }
            }
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.9, delay: t.delay, ease: [0.22, 1, 0.36, 1] }}
          >
            <g transform={`translate(${90 + i * 105} 55)`}>
              {/* Candle glow */}
              <motion.circle
                cx="55"
                cy="8"
                r="14"
                fill={accent}
                fillOpacity="0.12"
                animate={reduce ? undefined : { opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }}
              />
              <rect x="52" y="10" width="6" height="18" rx="2" fill={accent} fillOpacity="0.7" />
              <motion.ellipse
                cx="55"
                cy="8"
                rx="3"
                ry="5"
                fill="#F5D76E"
                animate={reduce ? undefined : { scaleY: [1, 1.25, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />

              {/* Food plates */}
              <motion.g
                initial={reduce ? false : { y: -16, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55 + i * 0.12, duration: 0.5 }}
              >
                <ellipse cx="22" cy="38" rx="14" ry="5" fill={accent} fillOpacity="0.25" />
                <circle cx="22" cy="34" r="7" fill={accent} fillOpacity="0.55" />
                <ellipse cx="55" cy="40" rx="16" ry="5" fill={accent} fillOpacity="0.2" />
                <circle cx="50" cy="36" r="5" fill={accent} fillOpacity="0.65" />
                <circle cx="60" cy="35" r="4" fill={accent} fillOpacity="0.45" />
                <ellipse cx="88" cy="38" rx="14" ry="5" fill={accent} fillOpacity="0.25" />
                <circle cx="88" cy="34" r="6" fill={accent} fillOpacity="0.5" />
              </motion.g>

              {/* Table top */}
              <rect x="4" y="48" width="102" height="12" rx="6" fill={accent} fillOpacity="0.85" />
              <rect x="8" y="46" width="94" height="4" rx="2" fill="#fff" fillOpacity="0.35" />
              {/* Legs */}
              <rect x="18" y="60" width="5" height="28" rx="2" fill={accent} fillOpacity="0.55" />
              <rect x="88" y="60" width="5" height="28" rx="2" fill={accent} fillOpacity="0.55" />
            </g>
          </motion.g>
        ))}
      </svg>
      <p
        className="pb-3 text-center text-[11px] font-bold tracking-[0.18em]"
        style={{ color: accent }}
      >
        שולחנות האירוע נפרסים
      </p>
    </div>
  );
}
