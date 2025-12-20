"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!password || password.length < 6) {
      setErr("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (password !== confirm) {
      setErr("הסיסמאות לא תואמות");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        setErr(data?.error || "קישור לא תקין או שפג תוקף");
        return;
      }

      setMsg("✅ הסיסמה עודכנה בהצלחה. מעבירה להתחברות…");
      setTimeout(() => router.push("/login"), 1200);
    } catch (e) {
      console.error(e);
      setErr("שגיאת שרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#faf7f3] via-[#f3ebe2] to-[#e6dacb]" />
      <div className="absolute inset-0 -z-20 opacity-[0.18] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]
                   border border-[#e8dfd4] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

        <h1 className="text-3xl font-bold text-center text-[var(--brown-dark)] mb-3">
          איפוס סיסמה
        </h1>

        <p className="text-center text-[var(--brown-soft)] mb-8">
          בחרי סיסמה חדשה לחשבון שלך.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[var(--brown-dark)] font-semibold text-sm">
              סיסמה חדשה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#dacfc3] bg-white/70
                         focus:outline-none focus:ring-2 focus:ring-[var(--champagne)]
                         text-[var(--brown-dark)]"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[var(--brown-dark)] font-semibold text-sm">
              אימות סיסמה
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#dacfc3] bg-white/70
                         focus:outline-none focus:ring-2 focus:ring-[var(--champagne)]
                         text-[var(--brown-dark)]"
              placeholder="••••••••"
              required
            />
          </div>

          {err && (
            <div className="text-sm text-red-600 text-right">{err}</div>
          )}

          {msg && (
            <div className="text-sm text-green-600 text-right">{msg}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-center py-3 text-lg mt-2 disabled:opacity-60"
          >
            {loading ? "מעדכנת..." : "עדכן סיסמה"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--brown-soft)]">
          <Link href="/login" className="hover:underline">
            חזרה להתחברות
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
