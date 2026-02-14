"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

/* ============================================================
   Register → Stripe Checkout
   חבילות חדשות בלבד + אפסיילים
============================================================ */

function RegisterFormInner() {
  const params = useSearchParams();

  /* ================= QUERY PARAMS ================= */

  const plan = params.get("plan") || "";
  const guests = Number(params.get("guests") || 0);

  // מחיר בסיס שמגיע מדף התמחור (אמת מוחלטת)
  const basePrice = Number(params.get("price") || 0);

  // אפסיילים
  const includeCalls = params.get("calls") === "1";
  const includeCreditGifts = params.get("creditGifts") === "1";

  /* ================= STATE ================= */

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const [price, setPrice] = useState(basePrice);
  const [priceKey, setPriceKey] = useState("");

  const [callsAddonPrice, setCallsAddonPrice] = useState(0);
  const [creditGiftsAddonPrice, setCreditGiftsAddonPrice] = useState(0);

  /* ================= PRICE + ADDONS ================= */

  useEffect(() => {
    // BASIC – חבילה חדשה
    if (plan === "basic") {
      setCallsAddonPrice(0);
      setCreditGiftsAddonPrice(0);
      setPrice(basePrice);
      setPriceKey("basic_plan_49");
      return;
    }

    // PREMIUM – חבילה חדשה
    if (plan === "premium") {
      const CREDIT_GIFTS_PRICE = 150;

      const callsAddon =
        includeCalls && guests > 0 ? guests * 1 : 0;

      const creditGiftsAddon =
        includeCreditGifts ? CREDIT_GIFTS_PRICE : 0;

      setCallsAddonPrice(callsAddon);
      setCreditGiftsAddonPrice(creditGiftsAddon);

      setPrice(basePrice + callsAddon + creditGiftsAddon);

      const priceKeyMap: Record<number, string> = {
        100: "premium_100_v2",
        200: "premium_200_v2",
        300: "premium_300",
        400: "premium_400",
        500: "premium_500",
        600: "premium_600",
        700: "premium_700",
        800: "premium_800",
        1000: "premium_1000",
      };

      setPriceKey(priceKeyMap[guests] || "");
      return;
    }

    // fallback
    setPrice(0);
    setPriceKey("");
  }, [plan, guests, includeCalls, includeCreditGifts, basePrice]);

  /* ================= HANDLERS ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      alert("יש לאשר את תקנון השימוש ומדיניות הפרטיות");
      return;
    }

    if (!priceKey) {
      alert("חבילה לא תקינה — נסי לבחור שוב");
      return;
    }

    setLoading(true);

    try {
      /* הרשמה */
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          plan,
          guests,
          price,
          includeCalls,
          includeCreditGifts,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok || registerData?.success === false) {
        alert(registerData?.error || "שגיאה בהרשמה");
        return;
      }

      /* Stripe Checkout */
      const checkoutRes = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            priceKey,
            email: form.email,
            quantity: 1,
            includeCalls,
            callsAddonPrice,
            includeCreditGifts,
            creditGiftsAddonPrice,
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
      <h1 className="text-4xl font-serif font-bold text-[#5c4632] mb-3 text-center">
        הרשמה לחבילת {plan === "premium" ? "פרימיום" : "בסיס"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[32px] border border-[#e6dccd] p-8 space-y-6 shadow"
      >
        {/* inputs */}
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

        {/* סכום */}
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
          disabled={loading || price === 0 || !priceKey || !acceptedTerms}
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
