"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

/* ============================================================
   Register → Display only
   מחיר סגור מגיע מ־Pricing
============================================================ */

function RegisterFormInner() {
  const params = useSearchParams();

  /* ================= QUERY PARAMS ================= */

  const price = Number(params.get("price"));
  const priceKey = params.get("priceKey");

  /* ================= STATE ================= */

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= HANDLERS ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      alert("יש לאשר את תקנון השימוש ומדיניות הפרטיות");
      return;
    }

    if (!price || !priceKey) {
      alert("נתוני תשלום חסרים, נא לבחור חבילה מחדש");
      return;
    }

    setLoading(true);

    try {
      /* 1️⃣ יצירת משתמש */
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok || registerData?.success === false) {
        alert(registerData?.error || "שגיאה בהרשמה");
        return;
      }

      /* 2️⃣ Stripe Checkout – מחיר סגור */
      const checkoutRes = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            priceKey,
            price,
            email: form.email,
          }),
        }
      );

      const checkoutData = await checkoutRes.json();

      if (checkoutRes.ok && checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        alert(checkoutData?.error || "שגיאה ביצירת תשלום");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-xl mx-auto pt-20 pb-28 px-5">
      <h1 className="text-4xl font-serif font-bold text-[#5c4632] mb-6 text-center">
        הרשמה
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[32px] border border-[#e6dccd] p-8 space-y-6 shadow"
      >
        {/* Inputs */}
        {["name", "email", "phone", "password"].map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-sm text-[#5c4632]">
              {field === "name"
                ? "שם מלא"
                : field === "email"
                ? "אימייל"
                : field === "phone"
                ? "טלפון"
                : "סיסמה"}
            </label>
            <input
              name={field}
              type={field === "password" ? "password" : "text"}
              value={(form as any)[field]}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-[#d9c8b5]"
              required
            />
          </div>
        ))}

        {/* מחיר – תצוגה בלבד */}
        <div className="text-center text-lg font-semibold text-[#5c4632]">
          סכום לתשלום: {price} ₪
        </div>

        {/* תקנון */}
        <div className="flex items-start gap-3 text-sm text-[#5c4632]">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            הנני מאשר/ת את{" "}
            <Link href="/terms" className="underline">
              תקנון השימוש
            </Link>{" "}
            ו{" "}
            <Link href="/privacy" className="underline">
              מדיניות הפרטיות
            </Link>
          </span>
        </div>

        {/* כפתור */}
        <button
          type="submit"
          disabled={loading || !price || !priceKey || !acceptedTerms}
          className="btn-primary w-full py-3 text-lg rounded-full disabled:opacity-50"
        >
          {loading ? "מבצעת הרשמה..." : "הרשמה"}
        </button>

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

/* ================= Suspense ================= */

export default function RegisterForm() {
  return (
    <Suspense fallback={null}>
      <RegisterFormInner />
    </Suspense>
  );
}
