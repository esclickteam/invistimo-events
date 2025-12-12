"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/* ============================================================
   עמוד הרשמה → תשלום Stripe
============================================================ */
export default function RegisterForm() {
  const params = useSearchParams();
  const plan = params.get("plan") || "basic";
  const guests = params.get("guests");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [priceKey, setPriceKey] = useState<string>("basic");

  /* ============================================================
     חישוב מחיר + priceKey
  ============================================================ */
  useEffect(() => {
    if (plan === "basic") {
      setPrice(49);
      setPriceKey("basic");
    }

    if (plan === "premium") {
      switch (guests) {
        case "עד 100 אורחים":
          setPrice(149);
          setPriceKey("premium_100");
          break;
        case "עד 300 אורחים":
          setPrice(249);
          setPriceKey("premium_300");
          break;
        case "עד 500 אורחים":
          setPrice(399);
          setPriceKey("premium_500");
          break;
        case "עד 1000 אורחים":
          setPrice(699);
          setPriceKey("premium_1000");
          break;
      }
    }
  }, [plan, guests]);

  /* ============================================================
     שינוי שדות
  ============================================================ */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ============================================================
     הרשמה → Checkout
  ============================================================ */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      /* 1️⃣ הרשמה */
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plan,
          guests,
          priceKey,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        alert(registerData.error || "שגיאה בהרשמה");
        return;
      }

      /* 2️⃣ יצירת Checkout Session */
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceKey,
          email: form.email,
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        window.location.href = checkoutData.url; // 🚀 מעבר ל-Stripe
      } else {
        alert("שגיאה ביצירת תשלום");
      }
    } catch (err) {
      alert("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="max-w-xl mx-auto pt-20 pb-28 px-5">
      <h1 className="text-4xl font-serif font-bold text-[#5c4632] mb-3 text-center">
        הרשמה לחבילת {plan === "premium" ? "פרימיום" : "בסיס"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[32px] shadow border p-8 space-y-6"
      >
        <input name="name" placeholder="שם מלא" onChange={handleChange} required />
        <input name="email" type="email" placeholder="אימייל" onChange={handleChange} required />
        <input name="phone" placeholder="טלפון" onChange={handleChange} required />
        <input name="password" type="password" placeholder="סיסמה" onChange={handleChange} required />

        <div className="text-center font-semibold">
          סכום לתשלום: {price} ₪
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 rounded-full"
        >
          {loading ? "מעבירה לתשלום..." : "המשך לתשלום"}
        </button>

        <div className="text-center text-sm">
          כבר רשום? <Link href="/login">התחברות</Link>
        </div>
      </form>
    </div>
  );
}
