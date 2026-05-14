"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setSent(true);
    } catch (err) {
      console.error("❌ Forgot password error:", err);
      alert("אירעה שגיאה בשליחת קישור האיפוס");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6]"
    >
      {/* רקע */}
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* כתמי אור */}
      <div className="pointer-events-none absolute -top-20 right-[10%] h-64 w-64 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-40px] left-[8%] h-72 w-72 rounded-full bg-[#CDA37D]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />

      {/* עיטורים */}
      <div className="pointer-events-none absolute top-10 left-10 h-24 w-24 rounded-full border border-[#D8B98D]/25" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-20 w-20 rounded-full border border-[#D8B98D]/20" />
      <div className="pointer-events-none absolute top-24 right-16 h-px w-28 bg-gradient-to-l from-[#C9A46A] to-transparent" />
      <div className="pointer-events-none absolute bottom-24 left-16 h-px w-28 bg-gradient-to-r from-[#C9A46A] to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="
            relative w-full max-w-[520px]
            overflow-hidden rounded-[34px]
            border border-[#D9C0A0]
            bg-[#FFFDF9]/94
            p-5 shadow-[0_24px_70px_rgba(91,64,35,0.13)]
            backdrop-blur-xl
            sm:p-7
            md:max-w-[540px]
            md:p-8
          "
        >
          {/* glow inner */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.25))]" />
          <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[#F2DEC4]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#EED7BC]/25 blur-3xl" />

          <div className="relative z-10">
            {/* כותרת */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#D8B98D] bg-[#FFF8EE] shadow-[0_8px_24px_rgba(186,140,76,0.12)]">
                <span className="text-xl text-[#B88945]">✦</span>
              </div>

              <p className="font-serif text-[28px] tracking-[0.20em] text-[#8A6338] sm:text-[34px]">
                INVISTIMO
              </p>

              <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />

              <p className="mt-3 text-[11px] tracking-[0.16em] text-[#A07C52] uppercase sm:text-xs">
                Password Recovery
              </p>

              <h1 className="mt-6 text-3xl font-black text-[#3E2D20] sm:text-[40px]">
                איפוס סיסמה
              </h1>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7B6754] sm:text-[15px]">
                הזינו את כתובת האימייל שלכם, ואם החשבון קיים במערכת — נשלח
                אליכם קישור לאיפוס הסיסמה.
              </p>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="
                  rounded-[26px]
                  border border-[#D8B98D]/70
                  bg-[#FFF8EE]/90
                  px-5 py-7
                  text-center
                  shadow-[0_14px_35px_rgba(91,64,35,0.08)]
                "
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F0DEC4] text-2xl font-black text-[#A86F2B] shadow-sm">
                  ✓
                </div>

                <h2 className="text-xl font-black text-[#3E2D20]">
                  הבקשה נשלחה בהצלחה
                </h2>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7B6754]">
                  אם האימייל קיים במערכת, נשלחה אליו הודעה עם קישור לאיפוס
                  הסיסמה.
                </p>

                <Link
                  href="/login"
                  className="
                    mt-6 inline-flex items-center justify-center
                    rounded-[18px]
                    bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                    px-7 py-3
                    text-sm font-black text-white
                    shadow-[0_16px_32px_rgba(168,111,43,0.22)]
                    transition
                    hover:-translate-y-0.5
                  "
                >
                  חזרה להתחברות
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {/* אימייל */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#4C3724]">
                    אימייל
                  </label>

                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="הזינו את כתובת האימייל שלכם"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="
                        w-full rounded-[18px] border border-[#DDCBB3]
                        bg-white/90 px-4 py-3.5 pl-11
                        text-[#3E2D20] shadow-sm outline-none transition
                        placeholder:text-[#AF9B87]
                        focus:border-[#C9A46A]
                        focus:ring-4 focus:ring-[#D8B16A]/15
                      "
                    />

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#B18B60]">
                      ✉
                    </span>
                  </div>
                </div>

                {/* כפתור */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full rounded-[20px]
                    bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                    px-6 py-3.5 text-base font-black text-white
                    shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                    transition duration-200
                    hover:-translate-y-0.5
                    hover:shadow-[0_20px_38px_rgba(168,111,43,0.3)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {loading ? "שולח..." : "שליחת קישור איפוס"}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-[#A27038] underline-offset-4 transition hover:underline"
                  >
                    חזרה להתחברות
                  </Link>
                </div>
              </form>
            )}

            {/* טקסט תחתון */}
            <div className="mt-7">
              <div className="mx-auto h-px w-full max-w-[180px] bg-gradient-to-l from-transparent via-[#D8C2A6] to-transparent" />
              <p className="mt-3 text-center text-[11px] leading-5 text-[#9C866D] sm:text-xs">
                ניהול אירועים, אישורי הגעה, הושבה ושליחת הודעות במקום אחד
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}