"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

/* ============================================================
   עמוד הרשמה מלא — עם סכום תשלום אוטומטי לפי החבילה
============================================================ */
export default function RegisterForm() {
  const params = useSearchParams();
  const plan = params.get("plan") || "basic";
  const price = params.get("price") || "0";
  const guests = params.get("guests") || "";

  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  /* ============================================================
     שינוי שדות טופס
  ============================================================ */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ============================================================
     שליחת טופס הרשמה
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
          guests,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "שגיאה בהרשמה");
        return;
      }

      // ניתוב לאחר הרשמה מוצלחת
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
      {/* כותרת עמוד */}
      <h1 className="text-4xl font-serif font-bold text-[#5c4632] mb-3 text-center">
        עמוד הרשמה לחבילת {plan === "premium" ? "פרימיום" : "בסיס"}
      </h1>

      {/* תיאור קצר */}
      <p className="text-center text-[#7b6754] mb-10 leading-relaxed">
        הרשמ/י ל־Invistimo כדי להתחיל לנהל את האירוע שלך: יצירת הזמנה דיגיטלית,
        איסוף אישורי הגעה והמשך להגדרת הושבה – הכול במקום אחד.
      </p>

      {/* טופס הרשמה */}
      <form
        onSubmit={handleSubmit}
        className="
          bg-white
          rounded-[32px]
          shadow-[0_12px_32px_rgba(0,0,0,0.07)]
          border border-[#e6dccd]
          p-8
          space-y-6
        "
      >
        {/* שם מלא */}
        <div>
          <label className="block text-sm text-[#5c4632] mb-1">שם מלא</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="
              w-full
              p-3
              rounded-xl
              border border-[#d9c8b5]
              bg-white
              focus:ring-2 focus:ring-[#d4b28c]
              outline-none
            "
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
            className="
              w-full
              p-3
              rounded-xl
              border border-[#d9c8b5]
              bg-[#f6f9ff]
              focus:ring-2 focus:ring-[#d4b28c]
              outline-none
            "
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
            className="
              w-full
              p-3
              rounded-xl
              border border-[#d9c8b5]
              bg-white
              focus:ring-2 focus:ring-[#d4b28c]
              outline-none
            "
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
            className="
              w-full
              p-3
              rounded-xl
              border border-[#d9c8b5]
              bg-[#f6f9ff]
              focus:ring-2 focus:ring-[#d4b28c]
              outline-none
            "
            required
          />
        </div>

        {/* סכום לתשלום */}
        <div className="text-center text-lg font-semibold text-[#5c4632]">
          סכום לתשלום: <span>{price} ₪</span>
        </div>

        {/* כפתור הרשמה */}
        <button
          type="submit"
          className="
            w-full
            py-3
            text-lg
            rounded-full
            bg-[#c8ae8c]
            text-white
            font-semibold
            shadow-md
            hover:bg-[#bda380]
            hover:shadow-lg
            transition-all
          "
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
