"use client";

import { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentPaid: number;      // כמה כבר שולם בפועל
  impersonated?: boolean;   // מצב התחזות
};

/* =======================
   Constants
======================= */
const FULL_PREMIUM_PRICE = 779;

const PRICE_TABLE: Record<number, number> = {
  100: 149,
  200: 239,
  300: 299,
  400: 379,
  500: 429,
  600: 489,
  700: 539,
  800: 599,
  1000: 699,
};

export default function UpgradePlanModal({
  isOpen,
  onClose,
  currentPaid,
  impersonated = false,
}: Props) {
  const [guests, setGuests] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  /* =======================
     Guards – אל תציגי מודאל
  ======================= */
  if (
    !isOpen ||
    impersonated ||
    currentPaid >= FULL_PREMIUM_PRICE
  ) {
    return null;
  }

  const fullPrice = PRICE_TABLE[guests];
  const amountToPay = Math.max(fullPrice - currentPaid, 0);

  async function handleUpgrade() {
    if (amountToPay <= 0) return;

    try {
      setLoading(true);

      const res = await fetch("/api/stripe/upgrade-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data?.error || "שגיאה ביצירת תשלום");
        return;
      }

      // 🔁 מעבר ל־Stripe
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("שגיאה בתהליך השדרוג");
    } finally {
      setLoading(false);
    }
  }

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
          בחרי כמות אורחים
        </label>

        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full border rounded-lg px-3 py-2 mb-4"
        >
          {Object.keys(PRICE_TABLE).map((g) => (
            <option key={g} value={g}>
              עד {g} אורחים — {PRICE_TABLE[Number(g)]} ₪
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
