"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/* ============================================================
   עמוד הרשמה → תשלום Stripe (FINAL)
============================================================ */
export default function RegisterForm() {
  const params = useSearchParams();

  const plan = params.get("plan") || "basic";

  // ✅ guests עם fallback חכם
  const guestsParam = params.get("guests");
  const guests =
    plan === "premium"
      ? Number(guestsParam) || 300 // ⭐ ברירת מחדל לפרימיום
      : 0;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [priceKey, setPriceKey] = useState<string>("");

  /* ============================================================
     חישוב מחיר + priceKey (יציב ובטוח)
  ============================================================ */
  useEffect(() => {
    if (plan === "basic") {
      setPrice(49);
      setPriceKey("basic");
      return;
    }

    if (plan === "premium") {
      switch (guests) {
        case 100:
          setPrice(149);
          setPriceKey("premium_100");
          break;
        case 300:
          setPrice(249);
          setPriceKey("premium_300");
          break;
        case 500:
          setPrice(399);
          setPriceKey("premium_500");
          break;
        case 1000:
          setPrice(699);
          setPriceKey("premium_1000");
          break;
        default:
          // fallback בטיחותי
          setPrice(249);
          setPriceKey("premium_300");
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
     הרשמה → Checkout
  ============================================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!priceKey) {
      alert("חבילה לא תקינה");
      return;
    }

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
        window.location.href = checkoutData.url;
      } else {
        alert("שגיאה ביצירת תשלום");
      }
    } catch (error) {
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
          disabled={loading}
          className="btn-primary w-full py-3 text-lg rounded-full"
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
