"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PurchaseSMSInner() {
  const params = useSearchParams();

  // כמה חבילות של 500 (ברירת מחדל: 1)
  const quantity = Number(params.get("quantity") || "1");

  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/create-sms-session", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceKey: "extra_messages_500", // 🔑 חד-משמעי
          quantity,                       // 1 = 500 הודעות
          // שדות שה-API שלך כבר יודע לקרוא:
          email: params.get("email"),
           invitationId: params.get("invitationId"),
        }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url; // Stripe Checkout
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
            <b>{quantity * 500}</b> הודעות נוספות
          </p>
          <p className="text-[#7a6c5c] mt-1">
            מחיר לתשלום: <b>{quantity * 50} ₪</b>
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
