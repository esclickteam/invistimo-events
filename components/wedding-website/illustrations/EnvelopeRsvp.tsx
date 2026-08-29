"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Royal Ivory / RSVP — envelope that opens to reveal the form */
export default function EnvelopeRsvp({
  accent = "#B8956B",
  children,
  open,
}: {
  accent?: string;
  children: ReactNode;
  open: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto max-w-lg">
      <motion.div
        className="relative overflow-hidden rounded-[28px] border bg-white shadow-[0_24px_70px_rgba(100,75,50,0.12)]"
        style={{ borderColor: `${accent}55` }}
        initial={false}
        animate={{ paddingTop: open || reduce ? 28 : 72 }}
        transition={{ duration: 0.55 }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16 origin-top"
          style={{
            background: `linear-gradient(135deg, ${accent}22, ${accent}55)`,
            clipPath: "polygon(0 0, 50% 70%, 100% 0)",
          }}
          animate={
            reduce
              ? { rotateX: 0, opacity: 0.4 }
              : open
                ? { rotateX: -160, opacity: 0.15 }
                : { rotateX: 0, opacity: 0.85 }
          }
          transition={{ duration: 0.7 }}
        />
        <div className="relative z-10 px-6 pb-7 pt-4">{children}</div>
      </motion.div>
    </div>
  );
}
