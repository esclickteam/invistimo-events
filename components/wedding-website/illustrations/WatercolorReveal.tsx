"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Desert Rose — soft wash-in reveal (no tiny circle that can stick mid-animation) */
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
      className={`relative ${className}`}
      initial={
        reduce
          ? { opacity: 1, filter: "blur(0px)", y: 0 }
          : { opacity: 0, filter: "blur(10px)", y: 28 }
      }
      whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
