"use client";

import { useCallback, useEffect, useState } from "react";

type VendorRow = {
  id: string;
  name: string;
  price: string;
  included: string;
  extras: string;
  payment: string;
  cancel: string;
  availability: string;
  notes: string;
};

const EMPTY: VendorRow = {
  id: "",
  name: "",
  price: "",
  included: "",
  extras: "",
  payment: "",
  cancel: "",
  availability: "",
  notes: "",
};

function blankRows(count: number): VendorRow[] {
  return Array.from({ length: count }, (_, i) => ({
    ...EMPTY,
    id: `v-${i + 1}`,
  }));
}

const STORAGE_KEY = "invistimo-vendor-compare-v1";
const COLUMNS: { key: keyof Omit<VendorRow, "id">; label: string }[] = [
  { key: "name", label: "שם" },
  { key: "price", label: "מחיר כולל" },
  { key: "included", label: "מה כלול" },
  { key: "extras", label: "תוספות" },
  { key: "payment", label: "תנאי תשלום" },
  { key: "cancel", label: "ביטול" },
  { key: "availability", label: "זמינות" },
  { key: "notes", label: "הערות" },
];

export default function VendorCompareTable() {
  const [rows, setRows] = useState<VendorRow[]>(() => blankRows(4));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as VendorRow[];
      if (Array.isArray(parsed) && parsed.length) setRows(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const save = useCallback((next: VendorRow[]) => {
    setRows(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const update = (id: string, key: keyof Omit<VendorRow, "id">, value: string) => {
    save(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const downloadFilledCsv = () => {
    const header = COLUMNS.map((c) => c.label).join(",");
    const body = rows
      .map((row) =>
        COLUMNS.map((c) => `"${String(row[c.key]).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${header}\n${body}`], {
      type: "text/csv;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "invistimo-vendor-comparison.csv";
    a.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div
      id="vendor-compare"
      className="scroll-mt-24 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-4 shadow-[0_18px_44px_rgba(58,39,20,0.08)] md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black tracking-[0.12em] text-[#8A642E]">כלי השוואה</p>
          <h3 className="mt-2 text-2xl font-black text-[#2C241C]">טבלת השוואת ספקים</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5C4A3A] md:text-base">
            השוו הצעות לפי היקף השירות, לא רק לפי המחיר הסופי. הנתונים נשמרים במכשיר זה בלבד.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <a
            href="/downloads/guides/wedding-vendor-comparison.csv"
            download
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            הורדת תבנית CSV
          </a>
          <button
            type="button"
            onClick={downloadFilledCsv}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            הורדת הטבלה שלי
          </button>
          <button
            type="button"
            onClick={() => save([...rows, ...blankRows(1).map((r, i) => ({ ...r, id: `v-${Date.now()}-${i}` }))])}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            הוספת שורה
          </button>
          <button
            type="button"
            onClick={() => save(blankRows(4))}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
          >
            איפוס
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-sm">
          <caption className="sr-only">השוואת הצעות מחיר מספקי חתונה</caption>
          <thead>
            <tr className="border-b border-[#E6D2AA] text-right text-[#7A5530]">
              {COLUMNS.map((col) => (
                <th key={col.key} scope="col" className="px-2 py-3 font-black">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#F0E4D0] align-top">
                {COLUMNS.map((col) => (
                  <td key={col.key} className="px-2 py-2">
                    <textarea
                      rows={col.key === "name" || col.key === "price" ? 1 : 2}
                      value={row[col.key]}
                      onChange={(e) => update(row.id, col.key, e.target.value)}
                      aria-label={`${col.label} לשורה`}
                      className="w-full min-w-[7.5rem] resize-y rounded-xl border border-[#EADDC8] bg-white px-2.5 py-2 outline-none focus:border-[#C7A56B]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
