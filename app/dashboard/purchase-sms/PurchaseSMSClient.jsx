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
    setLoading(true);
    const stripe = await stripePromise;

    // יצירת session לתשלום
    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, price }),
    });

    const data = await res.json();

    if (data?.id) {
      await stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      alert("שגיאה בהפניה לתשלום");
    }

    setLoading(false);
  };

  return (
    <div className="p-10 text-center" dir="rtl">
      <h1 className="text-2xl font-semibold mb-4">רכישת הודעות נוספות 💳</h1>
      <p className="text-lg mb-2">
        כמות הודעות: <b>{count}</b>
      </p>
      <p className="text-lg mb-6">
        מחיר לתשלום: <b>{price} ₪</b>
      </p>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {loading ? "מעביר לתשלום..." : "💳 מעבר לתשלום מאובטח"}
      </button>
    </div>
  );
}
