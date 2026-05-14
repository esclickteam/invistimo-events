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
      className="
        relative min-h-screen overflow-hidden
        bg-[#F7EFE6]
        text-[#3E2D20]
      "
    >
      {/* רקע עדין */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_right,#fffaf3_0%,#f7efe6_38%,#eadbc9_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.15] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* עיטורים עדינים */}
      <div className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full bg-[#D8B16A]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#B8896B]/20 blur-3xl" />

      {/* Header */}
      <header
        className="
          relative z-10 flex items-center justify-between
          border-b border-[#E8D8C3]/80 bg-[#FFFDF9]/65
          px-5 py-5 backdrop-blur-xl
          md:px-12
        "
      >
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C7A46A]/50 bg-white/70 text-[#B88945] shadow-sm">
            ✦
          </span>

          <div className="leading-none">
            <p className="font-serif text-2xl tracking-[0.28em] text-[#7A5630]">
              INVISTIMO
            </p>
            <p className="mt-1 text-xs tracking-[0.18em] text-[#9B7A54]">
              EVENT MANAGEMENT
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#6F5338] md:flex">
          <Link href="/pricing" className="transition hover:text-[#B88945]">
            חבילות
          </Link>
          <Link href="/contact" className="transition hover:text-[#B88945]">
            צור קשר
          </Link>
        </nav>
      </header>

      {/* Main layout */}
      <section
        className="
          relative z-10 mx-auto grid min-h-[calc(100vh-82px)]
          w-full max-w-7xl items-center gap-10
          px-5 py-10
          lg:grid-cols-[1.05fr_0.95fr]
          lg:px-10
        "
      >
        {/* צד השראה */}
        <motion.div
          initial={{ opacity: 0, x: 45 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="
            relative hidden min-h-[620px] overflow-hidden rounded-[42px]
            border border-[#E7D6BF]
            bg-[#FFFDF9]
            shadow-[0_24px_70px_rgba(89,61,31,0.12)]
            lg:block
          "
        >
          {/* תמונת אווירה */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=85')",
            }}
          />

          {/* שכבת ריכוך */}
          <div className="absolute inset-0 bg-gradient-to-l from-[#FFF8EE]/96 via-[#FFF8EE]/82 to-[#FFF8EE]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3E2D20]/20 via-transparent to-transparent" />

          <div className="relative flex h-full flex-col justify-center px-12 py-14">
            <div className="mb-7 h-px w-32 bg-gradient-to-l from-[#C7A46A] to-transparent" />

            <h2
              className="
                max-w-md font-serif text-5xl leading-[1.35]
                tracking-[0.04em] text-[#6A4B2A]
              "
            >
              כל האירוע שלכם —
              <br />
              במקום אחד
            </h2>

            <p className="mt-7 max-w-md text-lg leading-9 text-[#5F4A38]">
              אישורי הגעה, הודעות WhatsApp / SMS, הושבה, שולחנות וניהול
              מוזמנים — במערכת אחת אלגנטית וחכמה.
            </p>

            <div className="mt-10 grid max-w-md gap-5">
              <FeatureItem icon="👥" title="ניהול מוזמנים" />
              <FeatureItem icon="💌" title="אישורי הגעה חכמים" />
              <FeatureItem icon="🍽️" title="הושבה ושולחנות" />
            </div>
          </div>
        </motion.div>

        {/* כרטיס התחברות */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="
            mx-auto w-full max-w-[560px]
            rounded-[38px]
            border border-[#DCC5A7]
            bg-[#FFFDF9]/92
            p-6
            shadow-[0_24px_80px_rgba(83,58,33,0.13)]
            backdrop-blur-xl
            sm:p-9
            lg:p-11
          "
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#D8B16A]/60 bg-[#FFF7E9] text-[#B88945] shadow-sm">
              ✦
            </div>

            <p className="font-serif text-4xl tracking-[0.24em] text-[#7A5630]">
              INVISTIMO
            </p>

            <p className="mt-3 text-sm text-[#8B6A45]">
              ניהול אירועים והזמנות במקום אחד
            </p>

            <h1 className="mt-8 text-4xl font-black tracking-tight text-[#3E2D20]">
              ברוכים השבים
            </h1>

            <p className="mt-3 text-base leading-7 text-[#7B6754]">
              התחברו לחשבון שלכם והמשיכו לנהל את האירוע שלכם.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* אימייל */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#4A3524]">
                אימייל
              </label>

              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full rounded-2xl
                    border border-[#DDCDB9]
                    bg-white/75
                    px-5 py-4 pl-12
                    text-[#3E2D20]
                    shadow-sm
                    outline-none
                    transition
                    placeholder:text-[#B3A392]
                    focus:border-[#C7A46A]
                    focus:ring-4 focus:ring-[#D8B16A]/18
                  "
                  placeholder="הזינו את כתובת האימייל שלכם"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A78B6D]">
                  ✉️
                </span>
              </div>
            </div>

            {/* סיסמה */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#4A3524]">
                סיסמה
              </label>

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="
                    w-full rounded-2xl
                    border border-[#DDCDB9]
                    bg-white/75
                    px-5 py-4 pl-14
                    text-[#3E2D20]
                    shadow-sm
                    outline-none
                    transition
                    placeholder:text-[#B3A392]
                    focus:border-[#C7A46A]
                    focus:ring-4 focus:ring-[#D8B16A]/18
                  "
                  placeholder="הזינו את הסיסמה שלכם"
                />

                <button
                  type="button"
                  onClick={() => setShowPass((prev) => !prev)}
                  className="
                    absolute left-4 top-1/2 -translate-y-1/2
                    text-sm font-bold text-[#9A7750]
                    transition hover:text-[#7A5630]
                  "
                >
                  {showPass ? "הסתר" : "הצג"}
                </button>
              </div>
            </div>

            {/* זכור אותי + שכחתי סיסמה */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6F5338]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="
                    h-4 w-4 rounded
                    border-[#CBB79E]
                    accent-[#B88945]
                  "
                />
                זכור אותי
              </label>

              <Link
                href="/forgot-password"
                className="
                  text-sm font-semibold text-[#9A6B33]
                  underline-offset-4 transition hover:underline
                "
              >
                שכחת סיסמה?
              </Link>
            </div>

            {/* כפתור התחברות */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-3 w-full rounded-2xl
                bg-gradient-to-l from-[#A66F2E] via-[#C08A42] to-[#D4A85E]
                px-6 py-4
                text-lg font-black text-white
                shadow-[0_18px_35px_rgba(166,111,46,0.28)]
                transition
                hover:-translate-y-0.5
                hover:shadow-[0_22px_42px_rgba(166,111,46,0.35)]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? "מתחבר..." : "התחברות"}
            </button>
          </form>

          {/* הרשמה */}
          <p className="mt-7 text-center text-sm text-[#7B6754]">
            אין לכם חשבון?
            <Link
              href="/pricing"
              className="
                mr-1 font-black text-[#A66F2E]
                underline-offset-4 transition hover:underline
              "
            >
              צפו בחבילות
            </Link>
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="
          relative z-10 border-t border-[#E8D8C3]/80
          bg-[#FFFDF9]/55 px-5 py-5 text-center
          text-sm text-[#7B6754] backdrop-blur-xl
        "
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <p>© {new Date().getFullYear()} Invistimo. כל הזכויות שמורות.</p>

          <div className="flex items-center gap-5">
            <Link href="/terms" className="transition hover:text-[#A66F2E]">
              תנאי שימוש
            </Link>
            <Link href="/privacy" className="transition hover:text-[#A66F2E]">
              מדיניות פרטיות
            </Link>
            <Link href="/contact" className="transition hover:text-[#A66F2E]">
              צור קשר
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureItem({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      className="
        flex items-center justify-between gap-5
        rounded-3xl border border-[#E5D3BC]/80
        bg-white/62 px-5 py-4
        shadow-[0_12px_30px_rgba(89,61,31,0.08)]
        backdrop-blur
      "
    >
      <p className="text-lg font-bold text-[#5A3E25]">{title}</p>

      <span
        className="
          flex h-12 w-12 items-center justify-center
          rounded-full border border-[#D8B16A]/35
          bg-[#FFF8EA]
          text-xl
          shadow-sm
        "
      >
        {icon}
      </span>
    </div>
  );
}