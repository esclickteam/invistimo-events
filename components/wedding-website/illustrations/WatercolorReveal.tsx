"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Desert Rose — soft watercolor-style mask reveal */
export default function WatercolorReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={reduce ? { opacity: 1, clipPath: "circle(100% at 50% 50%)" } : { opacity: 0.2, clipPath: "circle(8% at 50% 45%)" }}
      whileInView={{ opacity: 1, clipPath: "circle(120% at 50% 45%)" }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
