"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export default function PurchaseSMSPage() {
  const params = useSearchParams();
  const count = params.get("count") || "0";
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  /* 🎯 מחשבים מחיר לפי count (כמו מחירון) */
  useEffect(() => {
    const table: Record<string, number> = {
      "500": 50,
      "750": 75,
      "1000": 100,
      "1250": 125,
      "1500": 150,
      "1750": 175,
      "2000": 200,
      "2500": 250,
      "3000": 300,
      "4000": 400,
      "5000": 500,
    };
    setPrice(table[count] || 0);
  }, [count]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const stripe = await stripePromise;
      const res = await fetch("/api/stripe/create-sms-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, price }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // מפנה ל־Stripe Checkout
      } else {
        alert("❌ שגיאה ביצירת תשלום");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה ביצירת תשלום");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center bg-[#fffaf5] p-10"
    >
      <div className="bg-white border border-[#e2d6c8] rounded-2xl shadow-md p-10 w-[90%] md:w-[500px] text-center">
        <h1 className="text-2xl font-semibold text-[#4a413a] mb-4">
          רכישת חבילת הודעות SMS 💬
        </h1>

        <p className="text-[#6b5e52] mb-6">
          אתם עומדים לרכוש{" "}
          <span className="font-bold text-[#4a413a]">{count}</span> הודעות SMS
          במחיר של{" "}
          <span className="font-bold text-[#4a413a]">{price} ₪</span>.
        </p>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-4 bg-[#c9a46a] hover:bg-[#b99255] text-white rounded-xl text-lg font-semibold disabled:opacity-50"
        >
          {loading ? "יוצר תשלום..." : "💳 מעבר לתשלום מאובטח"}
        </button>
      </div>
    </div>
  );
}
