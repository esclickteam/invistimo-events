"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

/* ============================================================
   Register → Stripe Checkout
============================================================ */

function RegisterFormInner() {
  const params = useSearchParams();

  const plan = params.get("plan") || "basic";

  // guests מגיע כמספר (100 / 300 / 500 / 1000)
  const guestsParam = params.get("guests");
  const guests = plan === "premium" && guestsParam ? Number(guestsParam) : 0;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number>(0);

  // 🔑 priceKey אחיד ל-Stripe
  const [priceKey, setPriceKey] = useState<string>("");

  /* ============================================================
     חישוב מחיר + priceKey
  ============================================================ */
  useEffect(() => {
    if (plan === "basic") {
      setPrice(49);
      setPriceKey("basic_plan_49");
      return;
    }

    if (plan === "premium") {
      const priceMap: Record<number, number> = {
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

      const keyMap: Record<number, string> = {
        100: "premium_100",
        300: "premium_300",
        500: "premium_500",
        1000: "premium_1000",
      };

      if (guests in priceMap) {
        setPrice(priceMap[guests]);
        setPriceKey(keyMap[guests]);
      } else {
        setPrice(0);
        setPriceKey("");
      }
    }
  }, [plan, guests]);

  /* ============================================================
     שינוי שדות
  ============================================================ */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ============================================================
     הרשמה → Stripe Checkout
  ============================================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!priceKey) {
      alert("חבילה לא תקינה — נסי לבחור שוב");
      return;
    }

    setLoading(true);

    try {
      /* 1️⃣ הרשמה (יוצרת משתמש + Cookie) */
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          plan,
          guests,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok || registerData?.success === false) {
        alert(registerData?.error || "שגיאה בהרשמה");
        return;
      }

      /* 2️⃣ יצירת Checkout Session (תשלום ראשון) */
      const checkoutRes = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            priceKey,
          }),
        }
      );

      const checkoutData = await checkoutRes.json();

      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        alert(checkoutData?.error || "שגיאה ביצירת תשלום");
      }
    } catch (err) {
      console.error("❌ handleSubmit error:", err);
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
        className="
          bg-white
          rounded-[32px]
          shadow-[0_12px_32px_rgba(0,0,0,0.07)]
          border border-[#e6dccd]
          p-8
          flex
          flex-col
          space-y-6
        "
      >
        {/* שם מלא */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#5c4632]">שם מלא</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5]"
            required
          />
        </div>

        {/* אימייל */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#5c4632]">אימייל</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5]"
            required
          />
        </div>

        {/* טלפון */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#5c4632]">טלפון</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5]"
            required
          />
        </div>

        {/* סיסמה */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#5c4632]">סיסמה</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5]"
            required
          />
        </div>

        {/* סכום */}
        <div className="text-center text-lg font-semibold text-[#5c4632]">
          סכום לתשלום: {price} ₪
        </div>

        {/* כפתור */}
        <button
          type="submit"
          disabled={loading || price === 0 || !priceKey}
          className="btn-primary w-full py-3 text-lg rounded-full disabled:opacity-50"
        >
          {loading ? "מעבירה לתשלום..." : "המשך לתשלום"}
        </button>

        {/* התחברות */}
        <div className="text-center text-sm text-[#7b6754]">
          כבר רשום?{" "}
          <Link href="/login" className="underline text-[#5c4632]">
            התחברות
          </Link>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   Suspense wrapper (חובה ל-useSearchParams)
============================================================ */
export default function RegisterForm() {
  return (
    <Suspense fallback={null}>
      <RegisterFormInner />
    </Suspense>
  );
}
