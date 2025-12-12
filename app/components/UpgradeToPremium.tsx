"use client";

import { useState } from "react";

/* =======================
   Props
======================= */
type UpgradeToPremiumProps = {
  paidAmount: number;
};

const PREMIUM_PACKAGES = [
  { guests: 100, fullPrice: 149 },
  { guests: 300, fullPrice: 249 },
  { guests: 500, fullPrice: 399 },
  { guests: 1000, fullPrice: 699 },
];

export default function UpgradeToPremium({
  paidAmount,
}: UpgradeToPremiumProps) {
  const [selectedGuests, setSelectedGuests] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedPackage = PREMIUM_PACKAGES.find(
    (p) => p.guests === selectedGuests
  );

  const amountToPay =
    selectedPackage && selectedPackage.fullPrice > paidAmount
      ? selectedPackage.fullPrice - paidAmount
      : 0;

  const canUpgrade = amountToPay > 0;

  const handleUpgrade = async () => {
    if (!selectedGuests || !canUpgrade) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/upgrade-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: selectedGuests }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "שגיאה ביצירת תשלום");
      }
    } catch {
      alert("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 shadow space-y-6">
      <h2 className="text-2xl font-bold text-center">
        שדרוג לחבילת Premium
      </h2>

      <p className="text-center text-gray-600">
        שילמת עד כה: <strong>{paidAmount} ₪</strong>
      </p>

      <div className="space-y-3">
        {PREMIUM_PACKAGES.map((pkg) => {
          const diff = pkg.fullPrice - paidAmount;
          const disabled = diff <= 0;

          return (
            <button
              key={pkg.guests}
              disabled={disabled}
              onClick={() => setSelectedGuests(pkg.guests)}
              className={`w-full border rounded-xl p-4 flex justify-between items-center transition ${
                disabled
                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : selectedGuests === pkg.guests
                  ? "border-[#c9a86a] bg-[#c9a86a]/10"
                  : "border-gray-300 hover:border-[#c9a86a]"
              }`}
            >
              <span>עד {pkg.guests} אורחים</span>
              <span className="font-semibold">
                {disabled ? "כבר כלול" : `לתשלום: ${diff} ₪`}
              </span>
            </button>
          );
        })}
      </div>

      {selectedPackage && (
        <div className="text-center space-y-1">
          <p>מחיר מלא: {selectedPackage.fullPrice} ₪</p>
          <p>
            לתשלום עכשיו:{" "}
            <strong className="text-lg">{amountToPay} ₪</strong>
          </p>
        </div>
      )}

      <button
        disabled={!canUpgrade || loading}
        onClick={handleUpgrade}
        className="btn-primary w-full py-3 text-lg rounded-full disabled:opacity-50"
      >
        {loading ? "מעבירה לתשלום…" : "שדרוג ותשלום"}
      </button>
    </div>
  );
}
