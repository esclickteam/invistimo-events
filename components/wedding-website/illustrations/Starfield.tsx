"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Midnight Velvet — soft drifting stars */
export default function Starfield({ count = 28 }: { count?: number }) {
  const reduce = useReducedMotion();
  const stars = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    top: `${(i * 53) % 100}%`,
    size: 1 + (i % 3),
    delay: (i % 8) * 0.35,
    duration: 3 + (i % 5),
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-[#D4AF37]"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: 0.35,
          }}
          animate={
            reduce
              ? { opacity: 0.35 }
              : { opacity: [0.15, 0.75, 0.15], scale: [1, 1.4, 1] }
          }
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}
