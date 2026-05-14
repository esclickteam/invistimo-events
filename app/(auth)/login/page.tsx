"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, pass);
    } catch (err) {
      console.error("❌ Login error:", err);
      alert("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6]"
    >
      {/* רקע יוקרתי */}
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.10] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* כתמי אור */}
      <div className="pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-[#DAB273]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-60px] left-[10%] h-80 w-80 rounded-full bg-[#CDA37D]/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />

      {/* עיטורים */}
      <div className="pointer-events-none absolute top-10 left-10 h-32 w-32 rounded-full border border-[#D8B98D]/30" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-24 w-24 rounded-full border border-[#D8B98D]/25" />
      <div className="pointer-events-none absolute top-24 right-16 h-px w-28 bg-gradient-to-l from-[#C9A46A] to-transparent" />
      <div className="pointer-events-none absolute bottom-24 left-16 h-px w-28 bg-gradient-to-r from-[#C9A46A] to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="
            relative w-full max-w-[620px]
            overflow-hidden rounded-[42px]
            border border-[#D9C0A0]
            bg-[#FFFDF9]/92
            p-6 shadow-[0_30px_90px_rgba(91,64,35,0.15)]
            backdrop-blur-xl
            sm:p-10
          "
        >
          {/* glow inner */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.2))]" />
          <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-[#F2DEC4]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#EED7BC]/30 blur-3xl" />

          <div className="relative z-10">
            {/* לוגו/כותרת */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#D8B98D] bg-[#FFF8EE] shadow-[0_10px_30px_rgba(186,140,76,0.15)]">
                <span className="text-2xl text-[#B88945]">✦</span>
              </div>

              <p className="font-serif text-[36px] tracking-[0.24em] text-[#8A6338] sm:text-[44px]">
                INVISTIMO
              </p>

              <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />

              <p className="mt-4 text-sm tracking-[0.18em] text-[#A07C52] uppercase">
                Event Management
              </p>

              <h1 className="mt-8 text-4xl font-black text-[#3E2D20] sm:text-5xl">
                ברוכים השבים
              </h1>

              <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-[#7B6754] sm:text-base">
                התחברו לחשבון שלכם והמשיכו לנהל את האירוע, אישורי ההגעה,
                ההושבה וההודעות שלכם במקום אחד.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* אימייל */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#4C3724]">
                  אימייל
                </label>

                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הזינו את כתובת האימייל שלכם"
                    className="
                      w-full rounded-[20px] border border-[#DDCBB3]
                      bg-white/90 px-5 py-4 pr-5 pl-12
                      text-[#3E2D20] shadow-sm outline-none transition
                      placeholder:text-[#AF9B87]
                      focus:border-[#C9A46A]
                      focus:ring-4 focus:ring-[#D8B16A]/15
                    "
                  />

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#B18B60]">
                    ✉
                  </span>
                </div>
              </div>

              {/* סיסמה */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#4C3724]">
                  סיסמה
                </label>

                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="הזינו את הסיסמה שלכם"
                    className="
                      w-full rounded-[20px] border border-[#DDCBB3]
                      bg-white/90 px-5 py-4 pr-5 pl-16
                      text-[#3E2D20] shadow-sm outline-none transition
                      placeholder:text-[#AF9B87]
                      focus:border-[#C9A46A]
                      focus:ring-4 focus:ring-[#D8B16A]/15
                    "
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass((prev) => !prev)}
                    className="
                      absolute left-4 top-1/2 -translate-y-1/2
                      text-sm font-bold text-[#9C7545]
                      transition hover:text-[#7E5A30]
                    "
                  >
                    {showPass ? "הסתר" : "הצג"}
                  </button>
                </div>
              </div>

              {/* זכור אותי / שכחתי */}
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6F5338]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CDB99C] accent-[#B88945]"
                  />
                  זכור אותי
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#A27038] underline-offset-4 transition hover:underline"
                >
                  שכחת סיסמה?
                </Link>
              </div>

              {/* כפתור התחברות */}
              <button
                type="submit"
                disabled={loading}
                className="
                  mt-3 w-full rounded-[22px]
                  bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                  px-6 py-4 text-lg font-black text-white
                  shadow-[0_20px_40px_rgba(168,111,43,0.28)]
                  transition duration-200
                  hover:-translate-y-0.5
                  hover:shadow-[0_25px_48px_rgba(168,111,43,0.33)]
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {loading ? "מתחבר..." : "התחברות"}
              </button>
            </form>

            {/* הרשמה */}
            <div className="mt-8 text-center">
              <p className="text-sm text-[#7B6754]">
                אין לכם חשבון?
                <Link
                  href="/pricing"
                  className="mr-1 font-black text-[#A86F2B] underline-offset-4 transition hover:underline"
                >
                  צפו בחבילות
                </Link>
              </p>
            </div>

            {/* טקסט תחתון קטן */}
            <div className="mt-8">
              <div className="mx-auto h-px w-full max-w-[220px] bg-gradient-to-l from-transparent via-[#D8C2A6] to-transparent" />
              <p className="mt-4 text-center text-xs leading-6 text-[#9C866D]">
                מערכת חכמה לניהול אירועים, אישורי הגעה, הושבה ושליחת הודעות
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}