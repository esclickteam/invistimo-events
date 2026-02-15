"use client";

import { useState } from "react";

type Plan = "plan1" | "plan2" | "plan3";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentPaid: number;
  currentPlan: Plan;          // ⭐ חדש
  impersonated?: boolean;
};

/* =======================
   מחיר שדרוג לפי חבילה בלבד
======================= */

function getUpgradePrice(plan: Plan) {
  if (plan === "plan1") return 100;
  if (plan === "plan2") return 80;
  return 0; // plan3 כבר כולל הושבה
}

/* =======================
   Component
======================= */

export default function UpgradePlanModal({
  isOpen,
  onClose,
  currentPaid,
  currentPlan,
  impersonated = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || impersonated) return null;

  const fullPrice = getUpgradePrice(currentPlan);
  const amountToPay = Math.max(fullPrice, 0);

  if (fullPrice === 0) return null; // plan3 לא צריך שדרוג

  async function handleUpgrade() {
    if (amountToPay <= 0) return;

    try {
      setLoading(true);

      const res = await fetch("/api/stripe/upgrade-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // לא צריך רשומות יותר
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[420px] p-6 shadow-xl text-right">
        <h2 className="text-xl font-semibold mb-4">
          שדרוג להושבה דיגיטלית
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          החבילה הנוכחית שלך: <strong>{currentPlan}</strong>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
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
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          >
            {loading ? "מעבירה לתשלום..." : "שדרוג עכשיו"}
          </button>
        </div>
      </div>
    </div>
  );
}
