"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Celebration burst when a guest confirms attendance. */
export default function RsvpCelebrate({
  accent = "#B8844F",
  active,
  className = "",
}: {
  accent?: string;
  active: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (!active) return null;

  const bits = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      className={`pointer-events-none relative mx-auto h-24 w-full max-w-xs overflow-visible ${className}`}
      aria-hidden
    >
      {bits.map((i) => {
        const angle = (i / bits.length) * Math.PI * 2;
        const dist = 36 + (i % 3) * 10;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist - 10;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 block h-2.5 w-2.5 rounded-full"
            style={{ background: i % 2 === 0 ? accent : `${accent}99` }}
            initial={reduce ? { opacity: 0.8, x, y, scale: 1 } : { opacity: 0, x: 0, y: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 0.8], x, y, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : i * 0.04 }}
          />
        );
      })}
      <motion.p
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-black"
        style={{ color: accent }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.45 }}
      >
        שמחים שאתם מגיעים!
      </motion.p>
    </div>
  );
}
