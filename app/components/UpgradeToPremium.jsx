"use client";

import { useState } from "react";

const PREMIUM_PACKAGES = [
  { guests: 100, fullPrice: 149 },
  { guests: 300, fullPrice: 249 },
  { guests: 500, fullPrice: 399 },
  { guests: 1000, fullPrice: 699 },
];

export default function UpgradeToPremium({ paidAmount }) {
  const [selectedGuests, setSelectedGuests] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedPackage = PREMIUM_PACKAGES.find(
    (p) => p.guests === selectedGuests
  );

  const amountToPay = selectedPackage
    ? selectedPackage.fullPrice - paidAmount
    : 0;

  const handleUpgrade = async () => {
    if (!selectedGuests) return;

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
    } catch (err) {
      alert("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 shadow space-y-6">
      <h2 className="text-2xl font-bold text-center">
        שדרוג לחבילת פרימיום
      </h2>

      <p className="text-center text-gray-600">
        שילמת עד כה: <strong>{paidAmount} ₪</strong>
      </p>

      {/* בחירת חבילה */}
      <div className="space-y-3">
        {PREMIUM_PACKAGES.map((pkg) => {
          const diff = pkg.fullPrice - paidAmount;

          return (
            <button
              key={pkg.guests}
              onClick={() => setSelectedGuests(pkg.guests)}
              className={`w-full border rounded-xl p-4 flex justify-between items-center transition ${
                selectedGuests === pkg.guests
                  ? "border-[#c9a86a] bg-[#c9a86a]/10"
                  : "border-gray-300 hover:border-[#c9a86a]"
              }`}
            >
              <span>עד {pkg.guests} אורחים</span>
              <span className="font-semibold">לתשלום: {diff} ₪</span>
            </button>
          );
        })}
      </div>

      {/* סיכום */}
      {selectedPackage && (
        <div className="text-center space-y-1">
          <p>מחיר מלא: {selectedPackage.fullPrice} ₪</p>
          <p>
            לתשלום עכשיו:{" "}
            <strong className="text-lg">{amountToPay} ₪</strong>
          </p>
        </div>
      )}

      {/* כפתור */}
      <button
        disabled={!selectedGuests || loading}
        onClick={handleUpgrade}
        className="btn-primary w-full py-3 text-lg rounded-full disabled:opacity-50"
      >
        {loading ? "מעבירה לתשלום…" : "שדרוג ותשלום"}
      </button>
    </div>
  );
}
