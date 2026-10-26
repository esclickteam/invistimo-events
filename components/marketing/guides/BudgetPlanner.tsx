"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  category: string;
  planned: number;
  agreed: number;
  paid: number;
};

const DEFAULT_ROWS: Row[] = [
  { id: "venue", category: "אולם וקייטרינג", planned: 0, agreed: 0, paid: 0 },
  { id: "bar", category: "בר ואלכוהול", planned: 0, agreed: 0, paid: 0 },
  { id: "photo", category: "צילום סטילס", planned: 0, agreed: 0, paid: 0 },
  { id: "video", category: "צילום וידאו", planned: 0, agreed: 0, paid: 0 },
  { id: "dj", category: "תקליטן ומוזיקה", planned: 0, agreed: 0, paid: 0 },
  { id: "dress", category: "שמלת כלה", planned: 0, agreed: 0, paid: 0 },
  { id: "suit", category: "חליפת חתן", planned: 0, agreed: 0, paid: 0 },
  { id: "beauty", category: "איפור ושיער", planned: 0, agreed: 0, paid: 0 },
  { id: "design", category: "עיצוב ופרחים", planned: 0, agreed: 0, paid: 0 },
  { id: "rings", category: "טבעות", planned: 0, agreed: 0, paid: 0 },
  { id: "ceremony", category: "חופה ורב / עורך טקס", planned: 0, agreed: 0, paid: 0 },
  { id: "invites", category: "הזמנות ואישורי הגעה", planned: 0, agreed: 0, paid: 0 },
  { id: "seating", category: "סידורי הושבה", planned: 0, agreed: 0, paid: 0 },
  { id: "manager", category: "ניהול אירוע חיצוני", planned: 0, agreed: 0, paid: 0 },
  { id: "transport", category: "הסעות ולינה", planned: 0, agreed: 0, paid: 0 },
  { id: "extras", category: "טיפים, תוספות ושעות נוספות", planned: 0, agreed: 0, paid: 0 },
  { id: "reserve", category: "רזרבה בלתי צפויה", planned: 0, agreed: 0, paid: 0 },
];

const STORAGE_KEY = "invistimo-wedding-budget-v1";

function money(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export default function BudgetPlanner() {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Row[];
      if (Array.isArray(parsed) && parsed.length) setRows(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const save = useCallback((next: Row[]) => {
    setRows(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const update = (id: string, field: keyof Omit<Row, "id" | "category">, value: string) => {
    const num = value === "" ? 0 : Number(value.replace(/[^\d.]/g, ""));
    save(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: Number.isFinite(num) ? num : 0 } : row
      )
    );
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        planned: acc.planned + row.planned,
        agreed: acc.agreed + row.agreed,
        paid: acc.paid + row.paid,
        balance: acc.balance + (row.agreed - row.paid),
      }),
      { planned: 0, agreed: 0, paid: 0, balance: 0 }
    );
  }, [rows]);

  const reserveHint = totals.planned > 0 ? Math.round(totals.planned * 0.075) : 0;

  return (
    <div
      id="budget-planner"
      className="scroll-mt-24 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-4 shadow-[0_18px_44px_rgba(58,39,20,0.08)] md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black tracking-[0.12em] text-[#8A642E]">כלי תכנון</p>
          <h3 className="mt-2 text-2xl font-black text-[#2C241C]">טבלת תקציב חתונה</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5C4A3A] md:text-base">
            הזינו סכומים לכל קטגוריה. היתרה מחושבת אוטומטית כ־מחיר שסוכם פחות שולם. הנתונים נשמרים
            במכשיר זה בלבד ואינם נשלחים לשרת.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <a
            href="/downloads/guides/wedding-budget-template.csv"
            download
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            הורדת תבנית CSV
          </a>
          <button
            type="button"
            onClick={() => save(DEFAULT_ROWS)}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            איפוס טבלה
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "תקציב מתוכנן", value: totals.planned },
          { label: "סוכם", value: totals.agreed },
          { label: "שולם", value: totals.paid },
          { label: "יתרה לתשלום", value: totals.balance },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3"
          >
            <p className="text-xs font-bold text-[#8A642E]">{card.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">
              {money(card.value)}
            </p>
          </div>
        ))}
      </div>

      {reserveHint > 0 ? (
        <p className="mt-4 text-sm leading-7 text-[#5C4A3A]">
          רזרבה מומלצת לתכנון (כ־5%–10% מהתקציב המתוכנן): בסביבות {money(reserveHint)} כטווח
          אפשרי — לא כחובה.
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-sm">
          <caption className="sr-only">טבלת תקציב חתונה לפי קטגוריות</caption>
          <thead>
            <tr className="border-b border-[#E6D2AA] text-right text-[#7A5530]">
              <th scope="col" className="px-2 py-3 font-black">
                קטגוריה
              </th>
              <th scope="col" className="px-2 py-3 font-black">
                תקציב מתוכנן
              </th>
              <th scope="col" className="px-2 py-3 font-black">
                מחיר שסוכם
              </th>
              <th scope="col" className="px-2 py-3 font-black">
                שולם
              </th>
              <th scope="col" className="px-2 py-3 font-black">
                יתרה
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#F0E4D0]">
                <th scope="row" className="px-2 py-2.5 text-right font-bold text-[#2C241C]">
                  {row.category}
                </th>
                {(["planned", "agreed", "paid"] as const).map((field) => (
                  <td key={field} className="px-2 py-2">
                    <input
                      inputMode="numeric"
                      aria-label={`${row.category} — ${field}`}
                      value={row[field] || ""}
                      onChange={(e) => update(row.id, field, e.target.value)}
                      className="w-28 rounded-xl border border-[#EADDC8] bg-white px-2.5 py-2 text-left tabular-nums outline-none focus:border-[#C7A56B]"
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 font-bold tabular-nums text-[#3F3025]">
                  {money(row.agreed - row.paid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
