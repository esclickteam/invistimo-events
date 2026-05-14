"use client";

import Link from "next/link";

export default function SupportBot({ onClose }) {
  const whatsappNumber = "972555039072";

  const whatsappText = encodeURIComponent(
  "היי, אשמח לקבל עזרה עם Invistimo ✨\nרוצה להבין איזו חבילה מתאימה לאירוע שלי."
);

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`;

  return (
    <div
      dir="rtl"
      className="
        fixed bottom-24 right-6 z-[9999]
        w-[calc(100vw-32px)] max-w-[390px]
      "
    >
      <div
        className="
          relative overflow-hidden
          rounded-[30px]
          border border-[#E4D0B6]
          bg-[#FFFDF9]/95
          shadow-[0_26px_80px_rgba(78,52,29,0.22)]
          backdrop-blur-xl
        "
      >
        {/* רקע פנימי */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#FFF4E2_0%,transparent_44%)]" />
        <div className="pointer-events-none absolute -top-20 -left-16 h-44 w-44 rounded-full bg-[#D8B16A]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-44 w-44 rounded-full bg-[#B8896B]/16 blur-3xl" />

        <div className="relative z-10 p-5">
          {/* כותרת */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div
                className="
                  mb-3 flex h-12 w-12 items-center justify-center
                  rounded-full border border-[#D8B16A]/50
                  bg-[#FFF8EE]
                  text-xl shadow-sm
                "
              >
                💬
              </div>

              <h3 className="text-xl font-black text-[#3E2D20]">
                צריכים עזרה?
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#7B6754]">
                אנחנו כאן כדי לעזור לכם עם הרשמה, חבילות, אישורי הגעה וניהול
                האירוע.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="סגירת חלון תמיכה"
              className="
                flex h-9 w-9 shrink-0 items-center justify-center
                rounded-full
                border border-[#E6D6C4]
                bg-white/80
                text-lg text-[#8B6A45]
                transition hover:bg-[#FFF3E3]
              "
            >
              ×
            </button>
          </div>

          {/* שעות פעילות */}
          <div
            className="
              mb-5 rounded-[22px]
              border border-[#E7D7C3]
              bg-white/70
              px-4 py-3
              text-center
              shadow-[0_10px_26px_rgba(91,64,35,0.06)]
            "
          >
            <p className="text-sm font-black text-[#5A3E25]">
              שעות פעילות נציגים
            </p>

            <p className="mt-1 text-sm text-[#7B6754]">
              ימים א׳–ה׳: 09:00–18:00
            </p>

            <p className="text-sm text-[#7B6754]">
              שישי וערבי חג: 09:00–12:00
            </p>
          </div>

          {/* 3 כפתורים בלבד */}
          <div className="space-y-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex w-full items-center justify-center gap-2
                rounded-[18px]
                bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                px-5 py-3.5
                text-sm font-black text-white
                shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                transition
                hover:-translate-y-0.5
                hover:shadow-[0_20px_38px_rgba(168,111,43,0.3)]
              "
            >
              <span>💬</span>
              מעבר לוואטסאפ עם נציג
            </a>

            <Link
              href="/pricing"
              onClick={onClose}
              className="
                flex w-full items-center justify-center gap-2
                rounded-[18px]
                border border-[#D8B98D]
                bg-white/80
                px-5 py-3.5
                text-sm font-black text-[#6B4A2D]
                transition
                hover:bg-[#FFF6EA]
              "
            >
              <span>💎</span>
              צפייה בחבילות
            </Link>

            <Link
              href="/login"
              onClick={onClose}
              className="
                flex w-full items-center justify-center gap-2
                rounded-[18px]
                border border-[#E7D7C3]
                bg-[#FFF8EE]/80
                px-5 py-3.5
                text-sm font-black text-[#7A5630]
                transition
                hover:bg-[#FFF1DC]
              "
            >
              <span>🔐</span>
              התחברות למערכת
            </Link>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-[#9C866D]">
            מענה בוואטסאפ ניתן בשעות הפעילות.
          </p>
        </div>
      </div>
    </div>
  );
}