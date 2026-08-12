"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Garden Bloom — soft petals/leaves floating */
export default function FloatingPetals({
  color = "#6B9E78",
  count = 10,
}: {
  color?: string;
  count?: number;
}) {
  const reduce = useReducedMotion();
  const petals = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${8 + ((i * 9) % 84)}%`,
    delay: i * 0.4,
    duration: 10 + (i % 5),
    rotate: (i % 2 === 0 ? 1 : -1) * (12 + i * 3),
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {petals.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-10%] h-3 w-2 rounded-[40%]"
          style={{ left: p.left, backgroundColor: color, opacity: 0.35 }}
          animate={
            reduce
              ? { y: "40vh", opacity: 0.2 }
              : {
                  y: ["0vh", "110vh"],
                  x: [0, p.rotate > 0 ? 24 : -24, 0],
                  rotate: [0, p.rotate, p.rotate * 2],
                  opacity: [0, 0.45, 0],
                }
          }
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
