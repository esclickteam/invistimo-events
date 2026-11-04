"use client";

import type { Ref } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import {
  luxBtnGhostLight,
  luxBtnPlum,
  luxBtnPrimaryOnDark,
} from "@/lib/ui/luxuryButtonClasses";
import { segment, useScrollProgress } from "./useScrollProgress";

const GUESTS = [
  { id: "g1", name: "נועה כהן", party: 2, status: "מגיעה" },
  { id: "g2", name: "יוסי לוי", party: 1, status: "מגיע" },
  { id: "g3", name: "מיכל אברהם", party: 2, status: "ממתינה" },
  { id: "g4", name: "דניאל שמש", party: 3, status: "מגיע" },
  { id: "g5", name: "שירה גולן", party: 2, status: "מגיעה" },
] as const;

const TABLES = [
  { id: "t1", label: "1", x: 28, y: 32, seats: 10, filled: 4 },
  { id: "t2", label: "2", x: 62, y: 28, seats: 10, filled: 2 },
  { id: "t3", label: "3", x: 45, y: 62, seats: 8, filled: 0 },
] as const;

const STORY = [
  {
    title: "רשימת מוזמנים מסודרת",
    body: "כל התשובות במקום אחד — מי מגיע, כמה מקומות, ומי עוד מחכים לתשובה.",
  },
  {
    title: "מפת השולחנות נפתחת",
    body: "רואים את האולם מלמעלה ומתחילים לשבץ לפי קבוצות ומשפחות.",
  },
  {
    title: "אורח עובר לשולחן",
    body: "גוררים או משבצים — והאורח מקבל מקום ברור על המפה.",
  },
  {
    title: "התפוסה מתעדכנת בזמן אמת",
    body: "מוני המושבים מתעדכנים כדי שלא ייווצרו שולחנות מלאים מדי או ריקים מדי.",
  },
] as const;

/**
 * Leading interaction: sticky storytelling — guest list → hall map → seat assign → counters.
 * Illustrative demo of the real seating flow (not a live app embed).
 */
export default function LuxV2SeatingStory() {
  const { ref, progress, reduceMotion } = useScrollProgress();
  const p = reduceMotion ? 1 : progress;

  const stage =
    p < 0.22 ? 0 : p < 0.48 ? 1 : p < 0.74 ? 2 : 3;

  const listOpacity = reduceMotion ? 0.35 : 1 - segment(p, 0.2, 0.55) * 0.55;
  const mapOpacity = reduceMotion ? 1 : segment(p, 0.15, 0.4);
  const mapScale = reduceMotion ? 1 : 0.92 + segment(p, 0.15, 0.55) * 0.08;
  const chipProgress = reduceMotion ? 1 : segment(p, 0.45, 0.72);
  const fillBoost = reduceMotion ? 3 : Math.round(segment(p, 0.7, 0.95) * 3);
  const seatedTotal = 6 + (stage >= 2 ? 2 : 0) + fillBoost;

  // Chip flies from list (right) toward table 3 center
  const chipX = reduceMotion ? 45 : 78 - chipProgress * 33;
  const chipY = reduceMotion ? 62 : 78 - chipProgress * 16;

  const story = STORY[stage];

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      dir="rtl"
      aria-labelledby="lux-v2-seating"
      className="relative h-[300vh] bg-[#F5EEE8]"
    >
      <div className="sticky top-0 flex min-h-[100svh] items-center overflow-hidden">
        {/* Soft cream → plum vignette only in later stages */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          aria-hidden
          style={{
            opacity: segment(p, 0.35, 0.7),
            background:
              "radial-gradient(ellipse at 70% 40%, rgba(66,24,47,0.55), transparent 55%), linear-gradient(180deg, #F5EEE8 0%, #42182F 100%)",
          }}
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p
              className={`text-xs font-bold tracking-[0.28em] ${
                p > 0.4 ? "text-[#C5A582]" : "text-[#842B4C]"
              }`}
            >
              סידורי הושבה · הדגמת זרימה
            </p>
            <h2
              id="lux-v2-seating"
              className={`mt-4 text-[34px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[48px] ${
                p > 0.4 ? "text-[#F5EEE8]" : "text-[#42182F]"
              }`}
            >
              {story.title}
            </h2>
            <p
              className={`mt-4 max-w-md text-lg leading-8 ${
                p > 0.4 ? "text-[#F5EEE8]/85" : "text-[#6B5360]"
              }`}
            >
              {story.body}
            </p>

            <div
              className={`mt-8 inline-flex items-baseline gap-3 border px-4 py-3 ${
                p > 0.4
                  ? "border-[#C5A582]/50 bg-[#42182F]/40 text-[#F5EEE8]"
                  : "border-[#C5A582]/50 bg-white/70 text-[#42182F]"
              }`}
              aria-live="polite"
            >
              <span className="text-3xl font-black tabular-nums">{seatedTotal}</span>
              <span className="text-sm font-bold">אורחים משובצים על המפה</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedCtaLink
                href="/seating-explained"
                location="lux_v2_seating"
                className={p > 0.4 ? luxBtnPrimaryOnDark : luxBtnPlum}
              >
                סידורי הושבה לחתונה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/try/dashboard/seating"
                location="lux_v2_seating_demo"
                className={luxBtnGhostLight}
              >
                לפתוח דמו הושבה
              </TrackedCtaLink>
            </div>
            <p
              className={`mt-4 text-[11px] font-medium ${
                p > 0.4 ? "text-[#F5EEE8]/65" : "text-[#6B5360]"
              }`}
            >
              אנימציית הדגמה של הזרימה במערכת · לא ממשק חי
            </p>
          </div>

          <div className="relative mx-auto aspect-[5/4] w-full max-w-[640px]">
            {/* Guest list layer */}
            <div
              className="absolute inset-y-[8%] end-0 z-20 w-[46%] overflow-hidden border border-[#C5A582]/40 bg-[#FFFBFA]/95 shadow-[0_24px_60px_rgba(66,24,47,0.1)]"
              style={{ opacity: listOpacity }}
            >
              <div className="border-b border-[#C5A582]/30 px-4 py-3">
                <p className="text-xs font-bold tracking-[0.16em] text-[#842B4C]">מוזמנים</p>
                <p className="text-sm font-extrabold text-[#42182F]">החתונה של מאיה ואיתי</p>
              </div>
              <ul>
                {GUESTS.map((g) => (
                  <li
                    key={g.id}
                    className={`flex items-center justify-between border-b border-[#C5A582]/20 px-4 py-2.5 text-sm ${
                      g.id === "g3" && stage >= 2 ? "bg-[#E8CFD8]/50" : ""
                    }`}
                  >
                    <span className="font-bold text-[#42182F]">{g.name}</span>
                    <span className="text-xs text-[#6B5360]">
                      {g.party} · {g.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Map layer */}
            <div
              className="absolute inset-0 z-10 overflow-hidden border border-[#C5A582]/35 bg-[#2A1A22]"
              style={{
                opacity: mapOpacity,
                transform: `scale(${mapScale})`,
                transformOrigin: "center",
              }}
            >
              <img
                src="/images/seating/seating-map.webp"
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-35"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(197,165,130,0.2),transparent_55%)]" />

              {TABLES.map((t) => {
                const filled =
                  t.filled + (t.id === "t3" ? (stage >= 2 ? 2 : 0) + fillBoost : 0);
                const active = t.id === "t3" && stage >= 2;
                return (
                  <div
                    key={t.id}
                    className="absolute flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 md:h-[88px] md:w-[88px]"
                    style={{
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      borderColor: active ? "#C5A582" : "rgba(197,165,130,0.45)",
                      background: active ? "rgba(132,43,76,0.85)" : "rgba(66,24,47,0.75)",
                      boxShadow: active ? "0 0 0 6px rgba(197,165,130,0.25)" : undefined,
                    }}
                  >
                    <span className="text-lg font-black text-[#F5EEE8]">{t.label}</span>
                    <span className="text-[10px] font-bold text-[#C5A582]">
                      {Math.min(filled, t.seats)}/{t.seats}
                    </span>
                  </div>
                );
              })}

              {/* Flying guest chip */}
              <div
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-[#C5A582] bg-[#F5EEE8] px-3 py-1.5 text-xs font-black text-[#42182F] shadow-lg"
                style={{
                  left: `${chipX}%`,
                  top: `${chipY}%`,
                  opacity: stage >= 1 ? Math.min(1, 0.2 + chipProgress * 1.2) : 0,
                  transform: `translate(-50%, -50%) scale(${0.9 + chipProgress * 0.15})`,
                }}
              >
                מיכל אברהם · 2
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
