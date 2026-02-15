"use client";

import { useMemo, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentPaid: number;
  impersonated?: boolean;
};

/* =======================
   מדרגות מחיר – כמו PricingPage
======================= */

const plan3Rates: [number, number][] = [
  [50, 3.75],
  [100, 3.22],
  [150, 2.98],
  [200, 2.76],
  [250, 2.65],
  [300, 2.52],
  [350, 2.43],
  [400, 2.35],
  [450, 2.28],
  [500, 2.21],
  [550, 2.14],
  [600, 2.07],
  [650, 2.06],
  [700, 2.05],
  [750, 2.04],
  [800, 2.03],
];

function getRate(records: number) {
  for (const [limit, rate] of plan3Rates) {
    if (records <= limit) return rate;
  }
  return plan3Rates[plan3Rates.length - 1][1];
}

function calculateBase(records: number) {
  return Math.round(records * getRate(records));
}

/* =======================
   Component
======================= */

export default function UpgradePlanModal({
  isOpen,
  onClose,
  currentPaid,
  impersonated = false,
}: Props) {
  const [records, setRecords] = useState<number>(200);
  const [loading, setLoading] = useState(false);

  if (!isOpen || impersonated) return null;

  const fullPrice = useMemo(
    () => calculateBase(records),
    [records]
  );

  const amountToPay = Math.max(fullPrice - currentPaid, 0);

  async function handleUpgrade() {
    if (amountToPay <= 0) return;

    try {
      setLoading(true);

      const res = await fetch("/api/stripe/upgrade-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data?.error || "שגיאה ביצירת תשלום");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("שגיאה בתהליך השדרוג");
    } finally {
      setLoading(false);
    }
  }

  const options = Array.from({ length: 16 }, (_, i) => (i + 1) * 50);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[420px] p-6 shadow-xl text-right">
        <h2 className="text-xl font-semibold mb-4">
          שדרוג חבילה
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          כבר שילמת: <strong>{currentPaid} ₪</strong>
        </p>

        <label className="block text-sm mb-2">
          בחרי כמות רשומות
        </label>

        <select
          value={records}
          onChange={(e) => setRecords(Number(e.target.value))}
          className="w-full border rounded-lg px-3 py-2 mb-4"
        >
          {options.map((num) => (
            <option key={num} value={num}>
              עד {num} רשומות
            </option>
          ))}
        </select>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <div className="flex justify-between mb-1">
            <span>מחיר מלא:</span>
            <span>{fullPrice} ₪</span>
          </div>

          <div className="flex justify-between mb-1">
            <span>שולם:</span>
            <span>-{currentPaid} ₪</span>
          </div>

          <div className="flex justify-between font-semibold text-green-700">
            <span>לתשלום עכשיו:</span>
            <span>{amountToPay} ₪</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border"
            disabled={loading}
          >
            ביטול
          </button>

          <button
            onClick={handleUpgrade}
            disabled={loading || amountToPay <= 0}
            className="flex-1 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          >
            {loading ? "מעבירה לתשלום..." : "שדרוג עכשיו"}
          </button>
        </div>
      </div>
    </div>
  );
}
