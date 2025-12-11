"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

/* ============================================================
   עמוד הרשמה — עם מחיר אוטומטי לפי סוג החבילה
============================================================ */
export default function RegisterForm() {
  const params = useSearchParams();
  const plan = params.get("plan") || "basic";
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  /* ============================================================
     קביעת מחיר אוטומטי לפי סוג החבילה
  ============================================================ */
  const price =
    plan === "premium"
      ? "בחר לפי מספר האורחים בעמוד הקודם"
      : plan === "basic"
      ? 49
      : 0;

  /* ============================================================
     שינוי שדות בטופס
  ============================================================ */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ============================================================
     שליחת הרשמה לשרת
  ============================================================ */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          plan,
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "שגיאה בהרשמה");
        return;
      }

      router.push("/payment");
    } catch (error) {
      alert("שגיאה בהתחברות לשרת");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     תוכן הדף
  ============================================================ */
  return (
    <div className="max-w-xl mx-auto pt-20 pb-28 px-5">
      <h1 className="text-4xl font-serif font-bold text-[#5c4632] mb-3 text-center">
        עמוד הרשמה לחבילת {plan === "premium" ? "פרימיום" : "בסיס"}
      </h1>

      <p className="text-center text-[#7b6754] mb-10 leading-relaxed">
        הרשמ/י ל־Invistimo כדי להתחיל לנהל את האירוע שלך: יצירת הזמנה דיגיטלית,
        איסוף אישורי הגעה והמשך להגדרות הושבה – הכול במקום אחד.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[32px] shadow-[0_12px_32px_rgba(0,0,0,0.07)]
                   border border-[#e6dccd] p-8 space-y-6"
      >
        {/* שם מלא */}
        <div>
          <label className="block text-sm text-[#5c4632] mb-1">שם מלא</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5] bg-white focus:ring-2 focus:ring-[#d4b28c]"
            required
          />
        </div>

        {/* אימייל */}
        <div>
          <label className="block text-sm text-[#5c4632] mb-1">אימייל</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5] bg-white focus:ring-2 focus:ring-[#d4b28c]"
            required
          />
        </div>

        {/* טלפון */}
        <div>
          <label className="block text-sm text-[#5c4632] mb-1">טלפון</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5] bg-white focus:ring-2 focus:ring-[#d4b28c]"
            required
          />
        </div>

        {/* סיסמה */}
        <div>
          <label className="block text-sm text-[#5c4632] mb-1">סיסמה</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-[#d9c8b5] bg-white focus:ring-2 focus:ring-[#d4b28c]"
            required
          />
        </div>

        {/* סכום לתשלום */}
        <div className="text-center text-lg font-semibold text-[#5c4632]">
          סכום לתשלום:{" "}
          <span>
            {plan === "premium"
              ? "לפי מספר האורחים"
              : `${price} ₪`}
          </span>
        </div>

        {/* כפתור המשך */}
        <button
          type="submit"
          className="btn-primary w-full py-3 text-lg rounded-full"
          disabled={loading}
        >
          {loading ? "מבצעת הרשמה..." : "המשך לתשלום"}
        </button>

        {/* קישור להתחברות */}
        <div className="text-center text-sm text-[#7b6754] mt-2">
          כבר יש לך חשבון?{" "}
          <Link href="/login" className="text-[#5c4632] underline">
            התחברות
          </Link>
        </div>
      </form>
    </div>
  );
}
