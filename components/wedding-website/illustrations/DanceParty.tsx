"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Reception dance — couples sway with dress swirl and music notes. */
export default function DanceParty({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl ${className}`}
      aria-hidden
      style={{
        background: `radial-gradient(ellipse at 50% 80%, ${accent}22 0%, transparent 70%)`,
        minHeight: 190,
      }}
    >
      {/* Soft spotlight */}
      <div
        className="pointer-events-none absolute inset-x-16 bottom-8 h-24 rounded-full blur-3xl"
        style={{ background: `${accent}28` }}
      />

      <svg className="mx-auto block h-[180px] w-full max-w-lg" viewBox="0 0 400 180" fill="none">
        <ellipse cx="200" cy="160" rx="140" ry="8" fill={`${accent}20`} />

        {/* Music notes */}
        {!reduce
          ? [0, 1, 2].map((i) => (
              <motion.g
                key={i}
                animate={{ y: [0, -18, 0], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5 }}
              >
                <text
                  x={70 + i * 120}
                  y={36}
                  fill={accent}
                  fontSize="18"
                  fontFamily="serif"
                  opacity="0.7"
                >
                  ♪
                </text>
              </motion.g>
            ))
          : null}

        {[0, 1].map((pair) => (
          <motion.g
            key={pair}
            animate={
              reduce
                ? undefined
                : {
                    y: [0, -5, 0, -3, 0],
                    rotate: pair === 0 ? [0, -4, 3, -2, 0] : [0, 4, -3, 2, 0],
                  }
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: pair * 0.2,
            }}
            style={{ transformOrigin: `${140 + pair * 120}px 120px` }}
          >
            <g transform={`translate(${95 + pair * 115} 55)`}>
              {/* Bride / dress dancer */}
              <circle cx="28" cy="16" r="10" fill={accent} fillOpacity="0.9" />
              <motion.path
                d="M12 30 C16 55 20 95 28 105 C36 95 40 55 44 30 Z"
                fill={accent}
                fillOpacity="0.45"
                animate={
                  reduce
                    ? undefined
                    : {
                        d: [
                          "M12 30 C16 55 20 95 28 105 C36 95 40 55 44 30 Z",
                          "M10 30 C14 55 18 95 28 105 C38 95 42 55 46 30 Z",
                          "M12 30 C16 55 20 95 28 105 C36 95 40 55 44 30 Z",
                        ],
                      }
                }
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Partner */}
              <circle cx="58" cy="14" r="9" fill={accent} />
              <rect x="48" y="26" width="20" height="34" rx="5" fill={accent} fillOpacity="0.85" />
              <path
                d="M50 40 L38 28"
                stroke={accent}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M66 40 L78 50"
                stroke={accent}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <rect x="50" y="58" width="7" height="22" rx="3" fill={accent} fillOpacity="0.7" />
              <rect x="60" y="58" width="7" height="22" rx="3" fill={accent} fillOpacity="0.7" />
            </g>
          </motion.g>
        ))}
      </svg>
      <p
        className="pb-3 text-center text-[11px] font-bold tracking-[0.18em]"
        style={{ color: accent }}
      >
        רוקדים יחד
      </p>
    </div>
  );
}
