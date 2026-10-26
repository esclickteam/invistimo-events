"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  storageKey: string;
  title: string;
  items: string[];
  id?: string;
};

export default function InteractiveChecklist({ storageKey, title, items, id }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw) as Record<number, boolean>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<number, boolean>) => {
      setChecked(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const done = useMemo(
    () => items.reduce((sum, _, i) => sum + (checked[i] ? 1 : 0), 0),
    [checked, items]
  );

  return (
    <div
      id={id}
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-[#7A6042]">
            {done} מתוך {items.length} סומנו · נשמר במכשיר זה בלבד
          </p>
        </div>
        <button
          type="button"
          onClick={() => persist({})}
          className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735] print:hidden"
        >
          איפוס
        </button>
      </div>
      <ul className="mt-5 space-y-2.5">
        {items.map((item, index) => {
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
