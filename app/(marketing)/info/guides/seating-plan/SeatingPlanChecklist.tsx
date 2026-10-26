"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, RotateCcw } from "lucide-react";

const STORAGE_KEY = "invistimo-seating-plan-checklist-v1";

export const FINAL_CHECKLIST_ITEMS = [
  "רשימת המוזמנים מעודכנת",
  "אישורי ההגעה נבדקו",
  "מספר האנשים חושב",
  "התקבלה סקיצה מהאולם",
  "קיבולת השולחנות נבדקה",
  "האורחים חולקו לקבוצות",
  "כל המגיעים שובצו",
  "אין כפילויות",
  "אין חריגות קיבולת",
  "נבדקו בקשות מיוחדות",
  "רזרבות תואמו",
  "המפה אושרה מול האולם",
  "הודעות השולחן נבדקו",
  "צוות הקבלה קיבל גרסה מעודכנת",
] as const;

type Props = {
  id?: string;
  title?: string;
};

export default function SeatingPlanChecklist({
  id = "final-checklist",
  title = "רשימת בדיקה לפני שסוגרים את ההושבה",
}: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<number, boolean>);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Record<number, boolean>) => {
    setChecked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const total = FINAL_CHECKLIST_ITEMS.length;
  const done = useMemo(
    () => FINAL_CHECKLIST_ITEMS.reduce((sum, _, i) => sum + (checked[i] ? 1 : 0), 0),
    [checked]
  );
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div
      id={id}
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-[#7A6042]">
            {ready ? `${done} מתוך ${total} · ${percent}%` : "טוען…"} · נשמר במכשיר זה בלבד
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            הדפסה
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("לאפס את כל הסימונים?")) persist({});
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            איפוס
          </button>
        </div>
      </div>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EADDC8]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="התקדמות הצ׳קליסט"
      >
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#C7A56B] to-[#8A642E] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2.5">
        {FINAL_CHECKLIST_ITEMS.map((item, index) => {
          const isOn = Boolean(checked[index]);
          return (
            <li key={`${index}-${item}`}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 transition hover:border-[#C7A56B]">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => persist({ ...checked, [index]: !isOn })}
                  className="mt-1 h-4 w-4 accent-[#8A642E]"
                />
                <span
                  className={`text-sm leading-7 md:text-base ${
                    isOn ? "text-[#7A6042] line-through" : "text-[#3F3025]"
                  }`}
                >
                  {item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
