"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

/* ============================================================
   Register → Stripe Checkout (with optional Phone Calls add-on)
   ✅ calls=1 adds: 1₪ לכל אורח (לפי guests)
============================================================ */

function RegisterFormInner() {
  const params = useSearchParams();

  const plan = params.get("plan") || "basic";

  // guests מגיע כמספר (100 / 200 / ... / 1000)
  const guestsParam = params.get("guests");
  const guests = plan === "premium" && guestsParam ? Number(guestsParam) : 0;

  // ✅ תוספת: האם המשתמש בחר שירות שיחות (מהדף הקודם)
  const callsParam = params.get("calls");
  const includeCalls = plan === "premium" && callsParam === "1";

  const creditGiftsParam = params.get("creditGifts");
  const includeCreditGifts =
  plan === "premium" && creditGiftsParam === "1";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  // ✅ מחיר סופי שמוצג למשתמש (כולל תוספת אם יש)
  const [price, setPrice] = useState<number>(0);

  // 🔑 priceKey אחיד ל-Stripe (המחיר של החבילה עצמה)
  const [priceKey, setPriceKey] = useState<string>("");

  // ✅ תוספת לשיחות (1₪ לכל אורח) – נשמר לצורך תצוגה + שליחה לשרת
  const [callsAddonPrice, setCallsAddonPrice] = useState<number>(0);
  const [creditGiftsAddonPrice, setCreditGiftsAddonPrice] = useState<number>(0);


  /* ============================================================
     חישוב מחיר + priceKey
     ✅ price = base + (includeCalls ? guests*1 : 0)
  ============================================================ */
  useEffect(() => {
    // ------------------------
    // BASIC
    // ------------------------
    if (plan === "basic") {
      setCallsAddonPrice(0);
      setPrice(49);
      setPriceKey("basic_plan_49"); // ✅ תואם לשרת שלך
      return;
    }

    // ------------------------
    // PREMIUM
    // ------------------------
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

      const CREDIT_GIFTS_PRICE = 150;

      const base = guests in priceMap ? priceMap[guests] : 0;
      const key = guests in keyMap ? keyMap[guests] : "";

      // ✅ תוספת: 1₪ לכל אורח רק אם includeCalls
      const callsAddon = includeCalls && guests > 0 ? guests * 1 : 0;
const creditGiftsAddon =
  includeCreditGifts && !includeCalls ? CREDIT_GIFTS_PRICE : 0;

setCallsAddonPrice(callsAddon);
setCreditGiftsAddonPrice(creditGiftsAddon);
setPrice(base + callsAddon + creditGiftsAddon);
setPriceKey(key);

return;
    }

    // ------------------------
    // Fallback
    // ------------------------
    setCallsAddonPrice(0);
    setPrice(0);
    setPriceKey("");
  }, [plan, guests, includeCalls, includeCreditGifts]);


  /* ============================================================
     שינוי שדות
  ============================================================ */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ============================================================
     הרשמה → Stripe Checkout
     ✅ שולחים includeCalls + callsAddonPrice לשרת, והוא יחשב בפועל
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
          includeCalls, // ✅ שומר אצלך DB אם תרצי
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok || registerData?.success === false) {
        alert(registerData?.error || "שגיאה בהרשמה");
        return;
      }

      /* 2️⃣ יצירת Checkout Session (תשלום ראשון) */
      const checkoutRes = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceKey, // ✅ מחיר החבילה
          email: form.email, // ✅ חובה
          invitationId: "", // ✅ אופציונלי אצלך כרגע
          quantity: 1,

          // ✅ תוספת שירות שיחות:
          includeCalls,
          // לא חובה לשלוח מחיר, אבל עוזר לתצוגה/לוגים.
          // השרת עדיין חייב לחשב בעצמו לפי maxGuests כדי למנוע זיופים.
          callsAddonPrice,
          includeCreditGifts,
          creditGiftsAddonPrice,

        }),
      });

      const checkoutData = await checkoutRes.json();


      if (checkoutRes.ok && checkoutData?.url) {
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

        {/* ✅ פירוט תשלום (רק לפרימיום) */}
        {plan === "premium" && guests > 0 && (
  <div className="rounded-2xl border border-[#e6dccd] bg-[#fbf8f4] p-4 space-y-2">
    
    {/* כמות אורחים */}
    <div className="flex items-center justify-between text-[#5c4632]">
      <span className="text-sm">כמות אורחים</span>
      <span className="font-semibold">{guests}</span>
    </div>

    {/* מחיר חבילה – תמיד מחיר בסיס */}
    <div className="flex items-center justify-between text-[#5c4632]">
      <span className="text-sm">מחיר חבילה</span>
      <span className="font-semibold">
        {price - callsAddonPrice - creditGiftsAddonPrice} ₪
      </span>
    </div>

    {/* אישורי הגעה טלפוניים */}
    <div className="flex items-center justify-between text-[#5c4632]">
      <span className="text-sm">אישורי הגעה טלפוניים (3 סבבים)</span>
      <span className="font-semibold">
        {includeCalls ? `${callsAddonPrice} ₪` : "לא נבחר"}
      </span>
    </div>

    {/* מתנות באשראי */}
    <div className="flex items-center justify-between text-[#5c4632]">
      <span className="text-sm">מתנות באשראי</span>
      <span className="font-semibold">
        {includeCreditGifts ? (
          includeCalls ? "כלול ללא עלות" : `${creditGiftsAddonPrice} ₪`
        ) : (
          "לא נבחר"
        )}
      </span>
    </div>

  </div>
)}


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
