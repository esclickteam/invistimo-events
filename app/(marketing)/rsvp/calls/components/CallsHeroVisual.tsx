"use client";

import { useReducedMotion } from "framer-motion";
import { HERO_STATUSES } from "../content";

const ROWS = [
  { name: "נועה לוי", status: "אישר הגעה", tone: "yes" as const },
  { name: "יוסי כהן", status: "לא ענה", tone: "wait" as const },
  { name: "משפחת אברהם", status: "מתלבט", tone: "maybe" as const },
  { name: "דנה שמש", status: "לא מגיע", tone: "no" as const },
];

const toneClass = {
  yes: "bg-[#E8F3E8] text-[#2F5D34] border-[#B7D6B8]",
  no: "bg-[#F8EAEA] text-[#7A3A3A] border-[#E0BDBD]",
  wait: "bg-[#F7F0E4] text-[#7A6042] border-[#E6D2AA]",
  maybe: "bg-[#EEF1F8] text-[#3A4A6A] border-[#C5CEE0]",
  live: "bg-[#EAF4F0] text-[#2A5C48] border-[#B5D4C6]",
} as const;

export default function CallsHeroVisual() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden={false}>
      <div
        className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(circle_at_30%_20%,rgba(232,201,136,0.45),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(58,43,34,0.08),transparent_50%)] blur-2xl"
        aria-hidden
      />

      <div className="relative grid gap-4 sm:grid-cols-[0.85fr_1.15fr] sm:items-end">
        {/* Incoming call phone */}
        <div className="relative mx-auto w-[min(100%,200px)]">
          <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#1C1612] shadow-[0_28px_60px_rgba(40,28,16,0.28)]">
            <div className="relative aspect-[9/16] bg-gradient-to-b from-[#2A211A] via-[#3A2B22] to-[#1C1612] px-4 pb-6 pt-8 text-center text-[#F7EDDF]">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#E8C988]">שיחה נכנסת</p>
              <p className="mt-6 text-lg font-black">Invistimo</p>
              <p className="mt-1 text-xs text-[#C9B8A4]">אישור הגעה לאירוע</p>
              <div
                className={`mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A45C]/20 ring-1 ring-[#E8C988]/40 ${
                  reduce ? "" : "animate-pulse"
                }`}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7.5 3.5c.6-.6 1.6-.5 2.1.2l1.5 2.2c.4.6.3 1.4-.2 1.9l-1 1c1.2 2.2 2.9 3.9 5.1 5.1l1-1c.5-.5 1.3-.6 1.9-.2l2.2 1.5c.7.5.8 1.5.2 2.1l-1.3 1.3c-.6.6-1.5.9-2.3.7-2.7-.6-5.5-2.5-8.1-5.1S4.4 9.3 3.8 6.6c-.2-.8.1-1.7.7-2.3L7.5 3.5Z"
                    fill="#E8C988"
                  />
                </svg>
              </div>
              <div className="mt-10 flex justify-center gap-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C45C5C] text-xs font-black">
                  דחה
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3F8F5A] text-xs font-black">
                  ענה
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard mock */}
        <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-4 shadow-[0_24px_50px_rgba(40,28,16,0.14)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#EFE3CF] pb-3">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">מעקב אישורי הגעה</p>
              <p className="mt-0.5 text-sm font-black text-[#2A211A]">שיחות · סבב פעיל</p>
            </div>
            <span className="rounded-full border border-[#E6D2AA] bg-[#F7EDDF] px-2.5 py-1 text-[11px] font-bold text-[#5C4A3A]">
              דמו
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {HERO_STATUSES.map((s) => (
              <span
                key={s.label}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass[s.tone]}`}
              >
                {s.label}
              </span>
            ))}
          </div>

          <ul className="mt-3 space-y-2">
            {ROWS.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#EFE3CF] bg-white px-3 py-2.5"
              >
                <span className="text-sm font-bold text-[#2A211A]">{row.name}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${toneClass[row.tone]}`}>
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-[#7A6042]">
            שמות ומספרים להמחשה בלבד. הסטטוסים תואמים תוצאות שמערכת השיחות שומרת בפועל.
          </p>
        </div>
      </div>
    </div>
  );
}
