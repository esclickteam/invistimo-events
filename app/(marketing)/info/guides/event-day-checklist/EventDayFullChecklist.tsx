"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Printer, RotateCcw } from "lucide-react";
import {
  ALL_ITEM_IDS,
  CHECKLIST_STORAGE_KEY,
  FULL_CHECKLIST,
  type ChecklistCategory,
} from "./checklistData";

type Filter = "all" | "open" | "done";

function loadChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export default function EventDayFullChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    setChecked(loadChecked());
    setReady(true);
  }, []);

  const persist = useCallback((next: Record<string, boolean>) => {
    setChecked(next);
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  const total = ALL_ITEM_IDS.length;
  const doneCount = useMemo(
    () => ALL_ITEM_IDS.reduce((sum, id) => sum + (checked[id] ? 1 : 0), 0),
    [checked]
  );
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const categories = useMemo(() => {
    return FULL_CHECKLIST.map((cat) => {
      const items = cat.items.filter((item) => {
        const isDone = Boolean(checked[item.id]);
        if (filter === "open" && isDone) return false;
        if (filter === "done" && !isDone) return false;
        return true;
      });
      return { ...cat, items };
    }).filter((cat) => {
      if (categoryFilter !== "all" && cat.id !== categoryFilter) return false;
      return cat.items.length > 0 || filter === "all";
    });
  }, [checked, filter, categoryFilter]);

  const toggle = (id: string) => {
    persist({ ...checked, [id]: !checked[id] });
  };

  const reset = () => {
    if (!window.confirm("לאפס את כל הסימונים בצ׳קליסט? הפעולה אינה ניתנת לביטול.")) return;
    persist({});
  };

  const printChecklist = () => {
    window.print();
  };

  return (
    <div
      id="interactive-checklist"
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">צ׳קליסט אינטראקטיבי</h3>
          <p className="mt-1 text-sm font-semibold text-[#7A6042]">
            {ready ? `${doneCount} מתוך ${total} הושלמו · ${percent}%` : "טוען…"} · נשמר במכשיר זה בלבד
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={printChecklist}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            הדפסה / PDF
          </button>
          <button
            type="button"
            onClick={reset}
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
          className="h-full rounded-full bg-gradient-to-l from-[#C7A56B] to-[#8A642E] transition-[width] motion-safe:duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-6 text-[#7A6042] print:hidden">
        השמירה מקומית בדפדפן בלבד ואינה מסתנכרנת בין מכשירים. אין צורך בהתחברות. להורדת PDF — בחרו
        «הדפסה / PDF» ובשמירה בחרו «שמירה כ־PDF».
      </p>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden" role="group" aria-label="סינון משימות">
        {(
          [
            ["all", "הכול"],
            ["open", "לא הושלם"],
            ["done", "הושלם"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              filter === key
                ? "border-[#C7A56B] bg-[#FFF8EA] text-[#5E4735]"
                : "border-[#EADDC8] bg-white text-[#7A6042]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 print:hidden">
        <label htmlFor="checklist-cat" className="sr-only">
          סינון לפי קטגוריה
        </label>
        <select
          id="checklist-cat"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-[#EADDC8] bg-white px-4 py-2.5 text-sm font-semibold text-[#3F3025]"
        >
          <option value="all">כל הקטגוריות</option>
          {FULL_CHECKLIST.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-6">
        {categories.map((cat) => (
          <CategoryBlock
            key={cat.id}
            category={cat}
            checked={checked}
            expanded={expanded}
            onToggle={toggle}
            onExpand={(id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
          />
        ))}
        {categories.every((c) => c.items.length === 0) ? (
          <p className="text-sm font-semibold text-[#7A6042]">אין משימות בתצוגה הנוכחית.</p>
        ) : null}
      </div>
    </div>
  );
}

function CategoryBlock({
  category,
  checked,
  expanded,
  onToggle,
  onExpand,
}: {
  category: ChecklistCategory;
  checked: Record<string, boolean>;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const catDone = category.items.filter((i) => checked[i.id]).length;
  return (
    <section aria-labelledby={`cat-${category.id}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 id={`cat-${category.id}`} className="text-lg font-black text-[#2C241C]">
          {category.title}
        </h4>
        <span className="text-xs font-bold text-[#8A642E]">
          {catDone}/{category.items.length}
        </span>
      </div>
      <ul className="space-y-2.5">
        {category.items.map((item) => {
          const isOn = Boolean(checked[item.id]);
          const isOpen = Boolean(expanded[item.id]);
          return (
            <li key={item.id}>
              <div
                className={`rounded-2xl border bg-white/90 transition ${
                  isOn ? "border-[#C7A56B] bg-[#FFF8EA]/70" : "border-[#EADDC8]"
                }`}
              >
                <div className="flex items-start gap-2 px-3 py-2.5 md:px-4 md:py-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => onToggle(item.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#8A642E]"
                    />
                    <span
                      className={`text-sm leading-7 md:text-base ${
                        isOn ? "text-[#7A6042] line-through" : "text-[#3F3025]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </label>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`detail-${item.id}`}
                    onClick={() => onExpand(item.id)}
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EADDC8] text-[#8A642E] print:hidden"
                    aria-label={isOpen ? "סגירת הסבר" : "פתיחת הסבר"}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition motion-safe:duration-200 ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                </div>
                <div
                  id={`detail-${item.id}`}
                  hidden={!isOpen}
                  className={isOpen ? "border-t border-[#EADDC8] px-4 py-3 text-sm leading-7 text-[#5C4A3A]" : undefined}
                >
                  {isOpen ? item.detail : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
