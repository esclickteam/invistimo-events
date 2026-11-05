"use client";

import { useEffect, useState, type Ref } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import {
  luxBtnGhostLight,
  luxBtnPlum,
  luxBtnPrimaryOnDark,
} from "@/lib/ui/luxuryButtonClasses";
import RoundTableMark from "@/components/marketing/seating/RoundTableMark";
import { segment, useScrollProgress } from "./useScrollProgress";

const GUESTS = [
  { id: "g1", name: "נועה כהן", party: 2, status: "מגיעה" },
  { id: "g2", name: "יוסי לוי", party: 1, status: "מגיע" },
  { id: "g3", name: "מיכל אברהם", party: 2, status: "ממתינה" },
  { id: "g4", name: "דניאל שמש", party: 3, status: "מגיע" },
  { id: "g5", name: "שירה גולן", party: 2, status: "מגיעה" },
] as const;

const TABLES = [
  { id: "t1", label: "1", x: 22, y: 36, seats: 10, filled: 4 },
  { id: "t2", label: "2", x: 78, y: 36, seats: 10, filled: 2 },
  { id: "t3", label: "3", x: 50, y: 74, seats: 8, filled: 0 },
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

function useWideScreen() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return wide;
}

/**
 * Seating demo you can use: pick a guest, then a table.
 * Scroll still moves the editorial title on large screens, briefly.
 */
export default function LuxV2SeatingStory() {
  const { ref, progress, reduceMotion } = useScrollProgress();
  const wide = useWideScreen();
  const p = reduceMotion || !wide ? 0 : progress;
  const stage = p < 0.22 ? 0 : p < 0.48 ? 1 : p < 0.74 ? 2 : 3;
  const story = STORY[stage];
  const onDark = p > 0.4;

  const [selected, setSelected] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [hint, setHint] = useState("שלב 1: בחרו אורח מהרשימה.");
  const [flash, setFlash] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const seatedExtra = Object.entries(assignments).reduce((sum, [guestId]) => {
    const guest = GUESTS.find((item) => item.id === guestId);
    return sum + (guest?.party ?? 0);
  }, 0);

  const assign = (tableId: string) => {
    if (!selected) {
      setHint("בחרו קודם אורח מהרשימה.");
      return;
    }
    const guest = GUESTS.find((item) => item.id === selected);
    const table = TABLES.find((item) => item.id === tableId);
    if (!guest || !table) return;
    const used = Object.entries(assignments).reduce((sum, [guestId, assigned]) => {
      if (assigned !== tableId || guestId === guest.id) return sum;
      return sum + (GUESTS.find((item) => item.id === guestId)?.party ?? 0);
    }, 0);
    if (table.filled + used + guest.party > table.seats) {
      setHint(`שולחן ${table.label} מלא מדי לקבוצה הזו.`);
      return;
    }
    setAssignments((prev) => ({ ...prev, [guest.id]: tableId }));
    setHint(`${guest.name} שובץ בשולחן ${table.label}. אפשר לבחור אורח נוסף.`);
    setFlash(tableId);
    setPulse(true);
    window.setTimeout(() => setFlash((current) => (current === tableId ? null : current)), 700);
    window.setTimeout(() => setPulse(false), 700);
  };

  const resetDemo = () => {
    setSelected(null);
    setAssignments({});
    setHint("שלב 1: בחרו אורח מהרשימה.");
    setFlash(null);
    setPulse(false);
  };

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      dir="rtl"
      aria-labelledby="lux-v2-seating"
      className="relative bg-[#F5EEE8] lg:pb-[10vh]"
    >
      <div className="flex items-start overflow-x-clip lg:sticky lg:top-0">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            opacity: segment(p, 0.35, 0.7),
            background:
              "radial-gradient(ellipse at 70% 40%, rgba(66,24,47,0.55), transparent 55%), linear-gradient(180deg, #F5EEE8 0%, #42182F 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-16 bg-gradient-to-b from-[#842B4C] to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-10">
          <div>
            <p className={`text-xs font-bold tracking-[0.28em] ${onDark ? "text-[#C5A582]" : "text-[#842B4C]"}`}>
              סידורי הושבה · הדגמת זרימה
            </p>
            <h2
              id="lux-v2-seating"
              className={`mt-4 text-[34px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[48px] ${
                onDark ? "text-[#F5EEE8]" : "text-[#42182F]"
              }`}
            >
              {story.title}
            </h2>
            <p className={`mt-4 max-w-md text-lg leading-8 ${onDark ? "text-[#F5EEE8]/85" : "text-[#6B5360]"}`}>
              {story.body}
            </p>

            <div
              className={`mt-8 inline-flex items-baseline gap-3 border px-4 py-3 ${
                pulse ? "lux-seat-flash" : ""
              } ${
                onDark
                  ? "border-[#C5A582]/50 bg-[#42182F]/40 text-[#F5EEE8]"
                  : "border-[#C5A582]/50 bg-white/70 text-[#42182F]"
              }`}
              aria-live="polite"
            >
              <span className="text-3xl font-black tabular-nums">{6 + seatedExtra}</span>
              <span className="text-sm font-bold">אורחים משובצים על המפה</span>
            </div>

            <ol className={`mt-4 space-y-1 text-sm font-bold ${onDark ? "text-[#F5EEE8]" : "text-[#42182F]"}`}>
              <li className={selected ? "text-[#C5A582]" : undefined}>1. בחרו אורח מהרשימה</li>
              <li>2. לחצו על שולחן כדי לשבץ את הקבוצה</li>
            </ol>
            <p className={`mt-3 text-sm font-bold ${onDark ? "text-[#F5EEE8]" : "text-[#42182F]"}`} role="status">
              {hint}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedCtaLink
                href="/seating-explained"
                location="lux_v2_seating"
                className={onDark ? luxBtnPrimaryOnDark : luxBtnPlum}
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
              <button
                type="button"
                onClick={resetDemo}
                className={luxBtnGhostLight}
              >
                איפוס ההדגמה
              </button>
            </div>
            <div className={`mt-4 grid gap-2 text-[12px] leading-5 sm:grid-cols-2 ${onDark ? "text-[#F5EEE8]/80" : "text-[#6B5360]"}`}>
              <p className="border border-[#C5A582]/40 px-3 py-2">
                <span className="font-black">תכנון:</span> זו ההדגמה — משבצים אורח לשולחן מראש.
              </p>
              <p className="border border-[#C5A582]/40 px-3 py-2">
                <span className="font-black">ניהול LIVE:</span> ביום האירוע עוקבים אחרי מי שהגיע. שירות נפרד, לא חלק מההדגמה.
              </p>
            </div>
          </div>

          <div className="grid items-stretch gap-3 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="overflow-hidden border border-[#C5A582]/40 bg-[#FFFBFA]/95">
              <div className="border-b border-[#C5A582]/30 px-4 py-3">
                <p className="text-xs font-bold tracking-[0.16em] text-[#842B4C]">מוזמנים</p>
                <p className="text-sm font-extrabold text-[#42182F]">החתונה של מאיה ואיתי</p>
              </div>
              <ul>
                {GUESTS.map((guest) => {
                  const table = TABLES.find((item) => item.id === assignments[guest.id]);
                  const on = selected === guest.id;
                  return (
                    <li key={guest.id} className="border-b border-[#C5A582]/20">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(guest.id);
                          setHint(
                            table
                              ? `${guest.name} בשולחן ${table.label}. אפשר להעביר.`
                              : `${guest.name} סומן. בחרו שולחן.`
                          );
                        }}
                        aria-pressed={on}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-right text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C5A582] ${
                          on ? "bg-[#E8CFD8]" : "hover:bg-[#F5EEE8]"
                        }`}
                      >
                        <span className="font-bold text-[#42182F]">{guest.name}</span>
                        <span className="text-xs text-[#6B5360]">
                          {guest.party} · {table ? `שולחן ${table.label}` : guest.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="relative h-full min-h-[520px] overflow-hidden border border-[#C5A582]/35 bg-[#2A0F1D] sm:min-h-[560px]">
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 42%, rgba(197,165,130,0.28), transparent 46%), radial-gradient(ellipse at 50% 100%, rgba(66,24,47,0.55), transparent 42%), linear-gradient(180deg, #42182F 0%, #2A0F1D 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[46%] h-[58%] w-[76%] -translate-x-1/2 -translate-y-1/2 border border-[#C5A582]/30"
                style={{ borderRadius: "50%" }}
                aria-hidden
              />
              {TABLES.map((table) => {
                const extra = Object.entries(assignments).reduce((sum, [guestId, assigned]) => {
                  if (assigned !== table.id) return sum;
                  return sum + (GUESTS.find((item) => item.id === guestId)?.party ?? 0);
                }, 0);
                const filled = Math.min(table.seats, table.filled + extra);
                const names = GUESTS.filter((guest) => assignments[guest.id] === table.id).map(
                  (guest) => guest.name
                );
                return (
                  <div
                    key={table.id}
                    className="absolute w-[6.7rem] -translate-x-1/2 -translate-y-1/2 sm:w-[9.25rem] xl:w-[10.5rem]"
                    style={{ left: `${table.x}%`, top: `${table.y}%` }}
                  >
                    <RoundTableMark
                      label={table.label}
                      seats={table.seats}
                      filled={filled}
                      tone="dark"
                      flash={flash === table.id}
                      onClick={() => assign(table.id)}
                    />
                    {names.length > 0 ? (
                      <p className="pointer-events-none absolute left-1/2 top-[calc(100%-0.4rem)] w-max max-w-[11rem] -translate-x-1/2 border border-[#C5A582] bg-[#F5EEE8] px-2 py-1 text-center text-[10px] font-black leading-4 text-[#42182F]">
                        {names.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
