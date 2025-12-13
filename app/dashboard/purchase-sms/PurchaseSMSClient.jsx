"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ============================================================
   חבילות הודעות – תצוגה בלבד (חייב להתאים ל-Stripe)
============================================================ */
const SMS_PACKAGES = {
  extra_messages_500: { messages: 500, price: 50 },
  extra_messages_750: { messages: 750, price: 75 },
  extra_messages_1000: { messages: 1000, price: 100 },
  extra_messages_1250: { messages: 1250, price: 125 },
  extra_messages_1500: { messages: 1500, price: 150 },
  extra_messages_1750: { messages: 1750, price: 175 },
  extra_messages_2000: { messages: 2000, price: 200 },
  extra_messages_2500: { messages: 2500, price: 250 },
  extra_messages_3000: { messages: 3000, price: 300 },
  extra_messages_4000: { messages: 4000, price: 400 },
  extra_messages_5000: { messages: 5000, price: 500 },
};

function PurchaseSMSInner() {
  const params = useSearchParams();

  // ברירת מחדל – 750 הודעות
  const priceKey =
    params.get("priceKey") || "extra_messages_750";

  const pkg = SMS_PACKAGES[priceKey];

  const [loading, setLoading] = useState(false);

  if (!pkg) {
    return (
      <p className="text-center text-red-600">
        חבילת הודעות לא תקינה
      </p>
    );
  }

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/create-sms-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceKey,   // 🔑 חייב להתאים ל-lookup_key
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("שגיאה ביצירת התשלום");
        console.error(data);
      }
    } catch (err) {
      console.error(err);
      alert("בעיה ביצירת התשלום");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center bg-gradient-to-b from-[#fdfaf6] to-[#f7efe5]">
      <div className="bg-white shadow-xl border border-[#e2d6c8] rounded-3xl p-10 w-[90%] max-w-md text-center">
        <h1 className="text-3xl font-semibold text-[#4a413a] mb-6">
          💬 רכישת הודעות נוספות
        </h1>

        <div className="bg-[#f9f3ec] rounded-xl py-4 mb-6 border border-[#e2d6c8]">
          <p className="text-[#4a413a] text-lg">
            <b>{pkg.messages}</b> הודעות נוספות
          </p>
          <p className="text-[#7a6c5c] mt-1">
            מחיר לתשלום: <b>{pkg.price} ₪</b>
          </p>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-[#71c48e] hover:bg-[#5fb97d] text-white py-4 rounded-xl text-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? "מעביר לתשלום..." : "💳 מעבר לתשלום מאובטח"}
        </button>

        <p className="text-sm text-[#a79b8f] mt-4">
          ניתן לרכוש הודעות נוספות בכל שלב ובכל חבילה.
        </p>
      </div>
    </div>
  );
}

export default function PurchaseSMSClient() {
  return (
    <Suspense fallback={null}>
      <PurchaseSMSInner />
    </Suspense>
  );
}
