"use client";

import type { InteractiveInviteTemplateId } from "@/types/interactiveInvite";

/** Per-template atmospheric layers — keeps each design distinct beyond palette swaps. */
export default function TemplateAtmosphere({
  id,
}: {
  id: InteractiveInviteTemplateId;
}) {
  if (id === "lunar-silk") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        <div
          className="absolute -top-20 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #c9d4e8, transparent 70%)" }}
        />
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            data-ii-float
            style={{
              position: "absolute",
              left: `${(i * 13) % 100}%`,
              top: `${(i * 19) % 100}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              borderRadius: "50%",
              background: "#E8EEF8",
              opacity: 0.25 + (i % 5) * 0.08,
            }}
          />
        ))}
      </div>
    );
  }

  if (id === "olive-clay") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        <div
          className="absolute inset-x-0 top-0 h-40 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(107,127,74,0.08) 18px, rgba(107,127,74,0.08) 19px)",
          }}
        />
        <div
          className="absolute bottom-10 -start-10 h-48 w-48 rounded-full opacity-25 blur-2xl"
          style={{ background: "#8B5A3C" }}
        />
      </div>
    );
  }

  if (id === "noir-champagne") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        <div
          className="absolute inset-x-8 top-24 h-px opacity-50"
          style={{ background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }}
        />
        <div
          className="absolute inset-x-16 top-28 h-px opacity-30"
          style={{ background: "linear-gradient(90deg, transparent, #E8D48B, transparent)" }}
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            data-ii-float
            style={{
              position: "absolute",
              left: `${10 + ((i * 7) % 80)}%`,
              top: `${20 + ((i * 11) % 60)}%`,
              width: 4,
              height: 4,
              transform: "rotate(45deg)",
              background: "#D4AF37",
              opacity: 0.2 + (i % 4) * 0.05,
            }}
          />
        ))}
      </div>
    );
  }

  if (id === "garden-mist") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            data-ii-float
            style={{
              position: "absolute",
              left: `${(i * 15) % 100}%`,
              top: `${(i * 21) % 100}%`,
              width: 12 + (i % 4) * 3,
              height: 16 + (i % 4) * 3,
              borderRadius: "70% 30% 70% 30%",
              background: i % 2 === 0 ? "#C4877A" : "#7E9A6A",
              opacity: 0.12 + (i % 3) * 0.05,
            }}
          />
        ))}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.55), transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(196,135,122,0.18), transparent 45%)",
          }}
        />
      </div>
    );
  }

  if (id === "coastal-pearl") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-ii-wave
            className="absolute inset-x-[-10%] opacity-30"
            style={{
              bottom: `${8 + i * 7}%`,
              height: 70 + i * 16,
              borderRadius: "50%",
              background: `color-mix(in srgb, #4A8FA0 ${18 + i * 8}%, transparent)`,
            }}
          />
        ))}
      </div>
    );
  }

  // amber-archive
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,42,26,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,42,26,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute top-16 end-6 rotate-6 rounded-sm px-3 py-2 text-[10px] tracking-widest opacity-40"
        style={{
          border: "1px solid rgba(59,42,26,0.25)",
          fontFamily: "Libre Baskerville, serif",
        }}
      >
        ARCHIVE · 2027
      </div>
    </div>
  );
}
