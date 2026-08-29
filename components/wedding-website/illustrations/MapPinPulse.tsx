"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  accent?: string;
  className?: string;
};

export default function MapPinPulse({
  accent = "#C9A962",
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative inline-flex h-16 w-16 items-center justify-center ${className}`} aria-hidden>
      {!reduce && (
        <>
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${accent}` }}
            initial={{ scale: 0.55, opacity: 0.55 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-2 rounded-full"
            style={{ border: `1px solid ${accent}` }}
            initial={{ scale: 0.55, opacity: 0.4 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
        </>
      )}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          d="M18 4C12.5 4 8 8.4 8 13.8c0 7.2 8.2 16.4 9.4 17.7a.8.8 0 0 0 1.2 0C19.8 30.2 28 21 28 13.8 28 8.4 23.5 4 18 4Z"
          fill={accent}
          fillOpacity="0.9"
        />
        <circle cx="18" cy="14" r="4" fill="white" fillOpacity="0.95" />
      </svg>
    </div>
  );
}
