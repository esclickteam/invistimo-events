"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Buffet tables spread outward with dishes appearing above. */
export default function BuffetSpread({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const tables = [-1, 0, 1];

  return (
    <div
      className={`relative mx-auto h-36 w-full max-w-2xl overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-x-0 bottom-6 h-px opacity-30"
        style={{ background: accent }}
      />
      <div className="absolute inset-0 flex items-end justify-center gap-3 pb-4 md:gap-6">
        {tables.map((slot, i) => (
          <motion.div
            key={slot}
            className="relative flex flex-col items-center"
            initial={
              reduce
                ? { opacity: 1, x: 0, scale: 1 }
                : { opacity: 0, x: slot * 80, scale: 0.7 }
            }
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.85, delay: 0.15 * i, ease: "easeOut" }}
          >
            {/* Food plates */}
            <motion.div
              className="mb-1 flex gap-1"
              initial={reduce ? { y: 0, opacity: 1 } : { y: -12, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45 + i * 0.12, duration: 0.5 }}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="block h-3 w-3 rounded-full md:h-3.5 md:w-3.5"
                  style={{
                    background:
                      d === 1 ? accent : d === 0 ? `${accent}99` : `${accent}55`,
                  }}
                />
              ))}
            </motion.div>
            {/* Table top */}
            <div
              className="h-3 w-20 rounded-full md:w-24"
              style={{ background: accent, opacity: 0.85 }}
            />
            {/* Legs */}
            <div className="mt-0.5 flex w-16 justify-between md:w-20">
              <span className="h-5 w-0.5" style={{ background: accent }} />
              <span className="h-5 w-0.5" style={{ background: accent }} />
            </div>
          </motion.div>
        ))}
      </div>
      <p
        className="absolute inset-x-0 bottom-0 text-center text-[10px] font-bold tracking-wide"
        style={{ color: accent }}
      >
        שולחנות האירוע נפרסים
      </p>
    </div>
  );
}
