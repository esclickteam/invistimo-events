"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Group = {
  id: string;
  title: string;
  items: string[];
};

const GROUPS: Group[] = [
  {
    id: "std",
    title: "לפני Save the Date",
    items: [
      "התאריך סופי",
      "שמות בני הזוג נכונים",
      "נוסח ההודעה נבדק",
      "העיצוב קריא במסך קטן",
      "רשימת הנמענים מעודכנת",
    ],
  },
  {
    id: "invite",
    title: "לפני ההזמנה המלאה",
    items: [
      "שם האולם נכון",
      "הכתובת נכונה",
      "השעות נכונות",
      "קישור הניווט עובד",
      "פרטי האירוע תואמים ל־Save the Date",
      "הקישור האישי עובד",
      "אפשרות אישור ההגעה נבדקה",
      "רשימת המוזמנים מעודכנת",
      "לא נשלחות הודעות כפולות",
    ],
  },
];

const STORAGE_KEY = "invistimo-std-vs-invite-checklist-v1";

export default function SendChecklist() {
  const flat = useMemo(
    () => GROUPS.flatMap((g) => g.items.map((item, i) => ({ key: `${g.id}-${i}`, group: g.id, item }))),
    []
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Record<string, boolean>) => {
    setChecked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const done = flat.reduce((sum, row) => sum + (checked[row.key] ? 1 : 0), 0);
  const total = flat.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">צ׳קליסט לפני שליחה</h3>
          <p className="mt-1 text-sm font-semibold text-[#7A6042]">
            {done} מתוך {total} · נשמר במכשיר זה בלבד
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            הדפסה
          </button>
          <button
            type="button"
            onClick={() => persist({})}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            איפוס
          </button>
        </div>
      </div>

      <div className="mt-5" aria-hidden>
        <div className="h-2 overflow-hidden rounded-full bg-[#EADDC8]">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#8A642E] to-[#C9A45C] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-[#A77A38]">{pct}% הושלמו</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.id}>
            <h4 className="text-lg font-black text-[#2C241C]">{group.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {group.items.map((item, index) => {
                const key = `${group.id}-${index}`;
                const isOn = Boolean(checked[key]);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 transition hover:border-[#C7A56B]">
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => persist({ ...checked, [key]: !isOn })}
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
        ))}
      </div>
    </div>
  );
}
