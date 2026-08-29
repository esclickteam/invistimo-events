"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getFlippedCountdownUnits, type CountdownValues } from "./CountdownUnits";

type Props = {
  time: CountdownValues;
  accent?: string;
  surface?: string;
  text?: string;
  muted?: string;
  variant?: "cards" | "editorial" | "glow";
};

/** Distinct motion language for countdown — not static numbers */
export default function AnimatedCountdown({
  time,
  accent = "#C9A962",
  surface = "#FFFFFF",
  text = "#2A2118",
  muted = "#8A7560",
  variant = "cards",
}: Props) {
  const reduce = useReducedMotion();
  const units = getFlippedCountdownUnits(time);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {units.map(({ label, value }, i) => (
        <motion.div
          key={label}
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.08, duration: 0.55, ease: "easeOut" }}
          className={`relative overflow-hidden px-4 py-6 text-center ${
            variant === "glow"
              ? "rounded-sm border"
              : variant === "editorial"
                ? "border border-black"
                : "rounded-2xl border shadow-[0_12px_36px_rgba(60,45,30,0.06)]"
          }`}
          style={{
            background: surface,
            borderColor: `${accent}55`,
            color: text,
          }}
        >
          {!reduce && variant !== "editorial" ? (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-0 h-px origin-center"
              style={{ background: accent }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.7 }}
            />
          ) : null}
          <motion.p
            key={`${label}-${value}`}
            initial={reduce ? false : { opacity: 0.35, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-4xl font-light tracking-tight"
            style={{ color: accent, fontFamily: "var(--ww-font-display), serif" }}
          >
            {value}
          </motion.p>
          <p className="mt-2 text-[11px] font-bold tracking-[0.22em]" style={{ color: muted }}>
            {label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
