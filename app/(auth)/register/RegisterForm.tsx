"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type FieldKey = keyof FormState;

function RegisterFormInner() {
  const params = useSearchParams();

  /* ================= QUERY PARAM ================= */

  const venueInviteToken = String(params.get("venueInviteToken") || "").trim();
  const isVenueClientRegistration = Boolean(venueInviteToken);

  const guests = Number(params.get("guests") || 0);
  const plan = String(params.get("plan") || "plan1").trim();

  const seating = params.get("seating") === "true";
  const credit = params.get("credit") === "true";
  const system = params.get("system") === "true";
  const design = params.get("design") === "true";

  /* ================= STATE ================= */

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fields = useMemo<
    {
      key: FieldKey;
      label: string;
      type: string;
      placeholder: string;
      autoComplete?: string;
    }[]
  >(
    () => [
      {
        key: "name",
        label: "שם מלא",
        type: "text",
        placeholder: "הזינו את השם המלא שלכם",
        autoComplete: "name",
      },
      {
        key: "email",
        label: "אימייל",
        type: "email",
        placeholder: "הזינו את כתובת האימייל שלכם",
        autoComplete: "email",
      },
      {
        key: "phone",
        label: "טלפון",
        type: "text",
        placeholder: "הזינו את מספר הטלפון שלכם",
        autoComplete: "tel",
      },
      {
        key: "password",
        label: "סיסמה",
        type: "password",
        placeholder: "צרו סיסמה לחשבון שלכם",
        autoComplete: "new-password",
      },
    ],
    []
  );

  /* ================= HANDLERS ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as FieldKey;

    setForm((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!acceptedTerms) {
      alert("יש לאשר את תקנון השימוש ומדיניות הפרטיות");
      return;
    }

    /*
      הרשמה רגילה בלבד:
      אם אין venueInviteToken — חייבים plan + guests כמו היום.
    */
    if (!isVenueClientRegistration) {
      if (!guests || guests <= 0) {
        alert("כמות רשומות לא תקינה, נא לבחור חבילה מחדש");
        return;
      }

      if (!plan) {
        alert("תוכנית לא תקינה, נא לבחור חבילה מחדש");
        return;
      }
    }

    setLoading(true);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      /* 1️⃣ יצירת משתמש רגיל במודל User של Invistimo */
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          email: normalizedEmail,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok || registerData?.success === false) {
        alert(registerData?.error || "שגיאה בהרשמה");
        return;
      }

      const userId = String(registerData?.userId || "").trim();

      if (!userId) {
        alert("Missing userId");
        return;
      }

      /*
        2️⃣ אם הגיע מקישור אולם:
        לא ממשיכים ל-Stripe הרגיל.
        מעבירים לעמוד חבילות מיוחד לאולם.
      */
      if (isVenueClientRegistration) {
        const packageUrl = `/venue-client/packages?venueInviteToken=${encodeURIComponent(
          venueInviteToken
        )}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(
          normalizedEmail
        )}`;

        window.location.href = packageUrl;
        return;
      }

      /*
        3️⃣ הרשמה רגילה:
        ממשיך ל-Stripe Checkout כמו היום.
      */
      const checkoutRes = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          userId,
          guests,
          plan,
          seating,
          credit,
          system,
          design,
        }),
      });

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
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6]"
    >
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="pointer-events-none absolute -top-20 right-[10%] h-64 w-64 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-40px] left-[8%] h-72 w-72 rounded-full bg-[#CDA37D]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />

      <div className="pointer-events-none absolute top-10 left-10 h-24 w-24 rounded-full border border-[#D8B98D]/25" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-20 w-20 rounded-full border border-[#D8B98D]/20" />

      <section className="relative z-10 flex min-h-[calc(100vh-90px)] items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="
            relative w-full max-w-[560px]
            overflow-hidden rounded-[34px]
            border border-[#D9C0A0]
            bg-[#FFFDF9]/94
            p-5 shadow-[0_24px_70px_rgba(91,64,35,0.13)]
            backdrop-blur-xl
            sm:p-7
            md:max-w-[580px]
            md:p-8
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.25))]" />
          <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[#F2DEC4]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#EED7BC]/25 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-6 text-center sm:mb-7">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#D8B98D] bg-[#FFF8EE] shadow-[0_8px_24px_rgba(186,140,76,0.12)]">
                <span className="text-xl text-[#B88945]">✦</span>
              </div>

              <p className="font-serif text-[28px] tracking-[0.20em] text-[#8A6338] sm:text-[34px]">
                INVISTIMO
              </p>

              <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />

              <p className="mt-3 text-[11px] tracking-[0.16em] text-[#A07C52] uppercase sm:text-xs">
                Event Management
              </p>

              <h1 className="mt-6 text-3xl font-black text-[#3E2D20] sm:text-[42px]">
                {isVenueClientRegistration ? "הרשמה דרך אולם" : "הרשמה"}
              </h1>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7B6754] sm:text-[15px]">
                {isVenueClientRegistration
                  ? "האולם פתח עבורך גישה אישית ל־Invistimo. אחרי ההרשמה תועברו לבחירת חבילה מותאמת ללקוחות שמגיעים דרך אולם."
                  : "צרו חשבון חדש והמשיכו לתשלום בצורה מסודרת, יוקרתית ומהירה."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => {
                const isPassword = field.key === "password";

                return (
                  <div key={field.key} className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#4C3724]">
                      {field.label}
                    </label>

                    <div className="relative">
                      <input
                        name={field.key}
                        type={
                          isPassword
                            ? showPass
                              ? "text"
                              : "password"
                            : field.type
                        }
                        value={form[field.key]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        autoComplete={field.autoComplete}
                        required
                        className="
                          w-full rounded-[18px] border border-[#DDCBB3]
                          bg-white/90 px-4 py-3.5
                          text-[#3E2D20] shadow-sm outline-none transition
                          placeholder:text-[#AF9B87]
                          focus:border-[#C9A46A]
                          focus:ring-4 focus:ring-[#D8B16A]/15
                        "
                      />

                      {isPassword && (
                        <button
                          type="button"
                          onClick={() => setShowPass((prev) => !prev)}
                          className="
                            absolute left-4 top-1/2 -translate-y-1/2
                            text-xs font-bold text-[#9C7545]
                            transition hover:text-[#7E5A30]
                          "
                        >
                          {showPass ? "הסתר" : "הצג"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {isVenueClientRegistration ? (
                <div
                  className="
                    rounded-[20px] border border-[#E5D7C5]
                    bg-[#FFF8EE]/75 px-4 py-4 text-center
                    text-[#6B533C]
                  "
                >
                  <p className="text-sm font-bold text-[#4C3724]">
                    הרשמה דרך אולם
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    לאחר ההרשמה תועברו לבחירת חבילה: הושבה בלבד, הושבה +
                    אישורי הגעה, או חבילה מלאה עם ניהול ספקים ותקציב.
                  </p>
                </div>
              ) : (
                <div
                  className="
                    rounded-[20px] border border-[#E5D7C5]
                    bg-[#FFF8EE]/75 px-4 py-4 text-center
                    text-[#6B533C]
                  "
                >
                  <p className="text-sm">
                    <span className="font-bold">חבילה:</span> {plan}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-bold">כמות רשומות:</span> {guests}
                  </p>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#E7DACB] bg-white/60 px-4 py-3 text-sm text-[#5C4632]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#CDB99C] accent-[#B88945]"
                />
                <span className="leading-6">
                  הנני מאשר/ת את{" "}
                  <Link
                    href="/terms"
                    className="font-semibold text-[#A27038] underline underline-offset-4"
                  >
                    תקנון השימוש
                  </Link>{" "}
                  ו{" "}
                  <Link
                    href="/privacy"
                    className="font-semibold text-[#A27038] underline underline-offset-4"
                  >
                    מדיניות הפרטיות
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={
                  loading ||
                  !acceptedTerms ||
                  (!isVenueClientRegistration && !guests)
                }
                className="
                  mt-2 w-full rounded-[20px]
                  bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                  px-6 py-3.5 text-base font-black text-white
                  shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                  transition duration-200
                  hover:-translate-y-0.5
                  hover:shadow-[0_20px_38px_rgba(168,111,43,0.3)]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {loading
                  ? "מבצעת הרשמה..."
                  : isVenueClientRegistration
                    ? "הרשמה והמשך לבחירת חבילה"
                    : "הרשמה והמשך לתשלום"}
              </button>

              <div className="text-center">
                <p className="text-sm text-[#7B6754]">
                  כבר רשומים?
                  <Link
                    href="/login"
                    className="mr-1 font-black text-[#A86F2B] underline-offset-4 transition hover:underline"
                  >
                    התחברות
                  </Link>
                </p>
              </div>
            </form>

            <div className="mt-6">
              <div className="mx-auto h-px w-full max-w-[180px] bg-gradient-to-l from-transparent via-[#D8C2A6] to-transparent" />
              <p className="mt-3 text-center text-[11px] leading-5 text-[#9C866D] sm:text-xs">
                מערכת חכמה לניהול אירועים, אישורי הגעה, הושבה ושליחת הודעות
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
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