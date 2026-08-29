"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/** Eternal Gold — thin gold line that progresses with page scroll */
export default function GoldScrollLine({ color = "#C9A962" }: { color?: string }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-right"
      style={{ scaleX, background: `linear-gradient(90deg, transparent, ${color}, ${color})` }}
    />
  );
}
