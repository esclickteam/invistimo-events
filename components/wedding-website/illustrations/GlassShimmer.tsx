"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Modern Glass — cool shimmer sweep across glass panels */
export default function GlassShimmer({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <motion.div
        className="absolute -inset-y-8 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={
          reduce
            ? { x: "120%" }
            : { x: ["0%", "280%"] }
        }
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
      />
    </div>
  );
}
