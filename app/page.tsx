"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Star,
  Smartphone,
  Users,
  MessageCircle,
  Map,
} from "lucide-react";

/* 🔢 עובדים עם מספרים – לא טקסט */
type GuestOption = 100 | 300 | 500 | 1000;

export default function HomePage() {
  const [selectedGuests, setSelectedGuests] = useState<GuestOption | "">("");

  const prices: Record<GuestOption, string> = {
    100: "149 ₪",
    300: "249 ₪",
    500: "399 ₪",
    1000: "699 ₪",
  };

  const premiumHref =
    selectedGuests !== ""
      ? `/register?plan=premium&guests=${selectedGuests}`
      : "/register?plan=premium";

  return (
    <div className="relative space-y-40 pb-40 overflow-hidden">
      {/* ========= רקע ========= */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#f7f3ee] via-[#efe7dd] to-[#e7d9ca]" />
      <div className="absolute inset-0 -z-10 opacity-[0.15] bg-[url('/noise.png')]" />

      {/* ========= HERO ========= */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="max-w-5xl mx-auto pt-24 md:pt-32 px-6 text-center space-y-8"
      >
        <h1 className="text-5xl md:text-7xl font-bold text-[#5c4632] leading-tight">
          הזמנות דיגיטליות יוקרתיות
          <br /> ואישורי הגעה חכמים לכל אירוע
        </h1>

        <p className="text-lg md:text-2xl text-[#7b6754] max-w-3xl mx-auto">
          פלטפורמה מעוצבת וחדשנית לניהול אירועים ב־<strong>Invistimo</strong>:
          הזמנות, אישורי הגעה והושבה — הכול במקום אחד.
        </p>

        <div className="flex justify-center mt-10">
          <a
            href="#packages"
            className="px-10 py-4 rounded-full text-lg font-semibold border-2 border-[#c7a17a] text-[#6a5440]"
          >
            צפייה בחבילות
          </a>
        </div>
      </motion.section>

      {/* ========= חבילות ========= */}
      <section id="packages" className="max-w-6xl mx-auto px-6 space-y-16">
        <h2 className="text-4xl font-bold text-center text-[#5c4632]">
          החבילות שלנו
        </h2>

        <div className="grid md:grid-cols-2 gap-14 max-w-5xl mx-auto">
          {/* ===== BASIC ===== */}
          <motion.div className="bg-white p-10 rounded-3xl shadow-lg border border-[#eadfce]">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-8 h-8 text-[#c7a17a]" />
              <h3 className="text-3xl font-bold text-[#5c4632]">חבילת בסיס</h3>
            </div>

            <p className="text-[#7b6754] text-xl font-semibold mb-6">
              49₪ בלבד
            </p>

            <ul className="space-y-3 text-[#7b6754]">
              {[
                "גישה לעורך ההזמנות לעיצוב אישי",
                "הזמנה דיגיטלית מעוצבת ומוכנה לשליחה",
                "שליחה ידנית ב־WhatsApp לכל אורח",
                "קישור אישי עם טופס לאישור הגעה",
                "ניהול אישורי הגעה – עד 50 אישורים",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#c7a17a] mt-0.5 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register?plan=basic"
              className="block mt-10 text-center px-10 py-4 rounded-full border-2 border-[#c7a17a] text-[#6a5440] font-semibold"
            >
              הרשמה ותשלום לחבילת בסיס
            </Link>
          </motion.div>

          {/* ===== PREMIUM ===== */}
          <motion.div className="p-10 rounded-3xl shadow-xl bg-gradient-to-br from-[#d2b08c] to-[#c19c78] text-white">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-8 h-8 text-white" />
              <h3 className="text-3xl font-bold">חבילת פרימיום</h3>
            </div>

            <ul className="space-y-3 text-white/90 mb-8">
              {[
                "תזכורות והודעות אוטומטיות",
                "הושבה חכמה וניהול שולחנות",
                "עיצוב הזמנה מתקדם ועריכה חופשית",
                "שליטה מלאה ברשימת המוזמנים",
                "עדכונים וסטטיסטיקות בזמן אמת",
                "ניהול מלא של אישורי הגעה – ללא הגבלה",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-white mt-0.5 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {/* בחירה לפי כמות אורחים */}
            <div className="bg-white/15 p-5 rounded-2xl text-center">
              <p className="font-semibold mb-3">בחרו כמות אורחים:</p>

              <select
                className="w-full bg-white text-[#5c4632] px-4 py-3 rounded-xl text-center"
                value={selectedGuests}
                onChange={(e) =>
                  setSelectedGuests(
                    e.target.value
                      ? (Number(e.target.value) as GuestOption)
                      : ""
                  )
                }
              >
                <option value="">בחרו...</option>
                <option value="100">עד 100 אורחים</option>
                <option value="300">עד 300 אורחים</option>
                <option value="500">עד 500 אורחים</option>
                <option value="1000">עד 1000 אורחים</option>
              </select>

              {selectedGuests && (
                <p className="mt-4 text-lg font-semibold">
                  מחיר: {prices[selectedGuests]}
                </p>
              )}
            </div>

            <Link
              href={premiumHref}
              className="block mt-10 text-center px-10 py-4 rounded-full bg-white text-[#6a5440] font-bold"
            >
              הרשמה ותשלום לחבילת פרימיום
            </Link>

            <p className="mt-4 text-center text-white/80 text-sm">
              תשלום חד־פעמי · ללא מנוי
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
