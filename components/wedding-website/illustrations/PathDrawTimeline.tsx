"use client";

import { motion, useReducedMotion } from "framer-motion";

type Item = { time: string; title: string; description: string };

/** Forest / schedule — vertical path that draws in as items appear */
export default function PathDrawTimeline({
  items,
  accent = "#7CB87A",
  text = "#E8F0E4",
  muted = "#8AA892",
}: {
  items: Item[];
  accent?: string;
  text?: string;
  muted?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto max-w-xl">
      <svg
        className="pointer-events-none absolute bottom-4 top-4 right-[22px] w-6"
        viewBox="0 0 24 400"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d="M12 0 C12 40, 4 80, 12 120 S20 200, 12 260 S4 340, 12 400"
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0, opacity: 0.35 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      </svg>

      <ol className="space-y-8">
        {items.map((item, i) => (
          <motion.li
            key={`${item.time}-${item.title}`}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08, duration: 0.55 }}
            className="relative grid grid-cols-[auto_1fr] gap-4 pr-10"
          >
            <span
              className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border"
              style={{ borderColor: accent, backgroundColor: accent }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.2em]" style={{ color: accent }}>
                {item.time}
              </p>
              <h3 className="mt-1 text-xl font-semibold" style={{ color: text }}>
                {item.title}
              </h3>
              {item.description ? (
                <p className="mt-1 text-sm leading-relaxed" style={{ color: muted }}>
                  {item.description}
                </p>
              ) : null}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
