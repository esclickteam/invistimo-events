"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleLogin(e: any) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "שגיאה בהתחברות");
        return;
      }

      // הצלחה → מפנה לדשבורד
      router.push("/dashboard");
    } catch (err) {
      alert("חיבור לשרת נכשל");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#faf7f3] via-[#f3ebe2] to-[#e6dacb]"></div>
      <div className="absolute inset-0 -z-20 opacity-[0.18] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]
                   border border-[#e8dfd4] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

        <h1 className="text-3xl font-bold text-center text-[var(--brown-dark)] mb-4">
          התחברות לחשבון
        </h1>

        <p className="text-center text-[var(--brown-soft)] mb-8">
          התחברי כדי לנהל את האירוע שלך, אישורי ההגעה וההזמנה.
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[var(--brown-dark)] font-semibold text-sm">אימייל</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#dacfc3] bg-white/70
                         focus:outline-none focus:ring-2 focus:ring-[var(--champagne)]
                         text-[var(--brown-dark)]"
              placeholder="name@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[var(--brown-dark)] font-semibold text-sm">סיסמה</label>
            <input
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#dacfc3] bg-white/70
                         focus:outline-none focus:ring-2 focus:ring-[var(--champagne)]
                         text-[var(--brown-dark)]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-center py-3 text-lg mt-4"
          >
            {loading ? "מתחבר..." : "התחברות"}
          </button>
        </form>

        <p className="text-center text-[var(--brown-soft)] mt-6 text-sm">
          אין לך חשבון?
          <Link
            href="/register"
            className="text-[var(--champagne-dark)] font-semibold hover:underline mr-1"
          >
            הרשמה
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
