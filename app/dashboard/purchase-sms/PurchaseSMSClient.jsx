"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);

export default function PurchaseSMSClient() {
  const params = useSearchParams();
  const count = params.get("count") || "0";
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const table = {
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
    try {
      setLoading(true);
      const stripe = await stripePromise;
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, price }),
      });

      const data = await res.json();
      if (data?.id) await stripe.redirectToCheckout({ sessionId: data.id });
      else alert("שגיאה ביצירת תשלום");
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
            <b>{count}</b> הודעות נוספות
          </p>
          <p className="text-[#7a6c5c] mt-1">
            מחיר לתשלום: <b>{price} ₪</b>
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
