"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TryEntryPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "choice">("intro");
  const [busy, setBusy] = useState(false);

  async function start(mode: "guided" | "free") {
    setBusy(true);
    await fetch("/api/demo/interactive", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, restart: true }),
    });
    router.push("/try/dashboard");
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff8ec_0%,#f6f1ea_45%,#efe6da_100%)] px-4 py-10"
    >
      <section className="w-full max-w-2xl rounded-[36px] border border-[#E7D3B0] bg-[#FFFDF8]/90 p-8 text-right shadow-[0_30px_80px_rgba(43,33,24,0.12)] sm:p-10">
        <p className="text-xs font-black tracking-[0.18em] text-[#9A6E24]">INVISTIMO</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-[#2B2118] sm:text-5xl">
          החתונה של מאיה ואיתי
        </h1>
        <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[#6B5A48]">
          התנסו במערכת שבעל האירוע מקבל: מוזמנים, הזמנה דיגיטלית, אישורי הגעה, שיחות, הושבה וכניסה לאירוע. בלי הרשמה ובלי השפעה על נתונים אמיתיים.
        </p>

        {phase === "intro" ? (
          <button
            type="button"
            onClick={() => setPhase("choice")}
            className="mt-8 rounded-full bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220] px-8 py-4 text-lg font-black text-white shadow-[0_16px_36px_rgba(184,134,45,0.28)]"
          >
            בואו נתחיל
          </button>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void start("guided")}
              className="rounded-[24px] bg-[#2B2118] px-5 py-5 text-right text-white disabled:opacity-60"
            >
              <span className="block text-lg font-black">סיור מודרך</span>
              <span className="mt-1 block text-sm font-semibold text-white/80">
                נעבור יחד על הפעולות החשובות
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void start("free")}
              className="rounded-[24px] border border-[#E7D3B0] bg-white px-5 py-5 text-right disabled:opacity-60"
            >
              <span className="block text-lg font-black text-[#2B2118]">התנסות חופשית</span>
              <span className="mt-1 block text-sm font-semibold text-[#6B5A48]">
                להיכנס למערכת ולנסות לבד
              </span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
