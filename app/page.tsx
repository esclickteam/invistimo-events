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

const EVENT_TYPES = [
  "ברית / בריתה",
  "בר / בת מצווה",
  "חתונה קטנה וגדולה",
  "חינה ושבת חתן",
  "אירועי חברה וכנסים",
  "כל אירוע אחר",
];

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
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />
                גישה לעורך ההזמנות לעיצוב אישי
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />
                הזמנה דיגיטלית מעוצבת ומוכנה לשליחה
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />
                שליחה ידנית ב־WhatsApp לכל אורח
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />
                קישור אישי עם טופס לאישור הגעה
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />
                ניהול אישורי הגעה – עד <strong>50 אישורים</strong>
              </li>
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
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-8 h-8 text-white" />
              <h3 className="text-3xl font-bold">חבילת פרימיום</h3>
            </div>

            <p className="text-white/90 mb-6">
              ניהול מלא של אישורי הגעה — ללא הגבלה
            </p>

            <ul className="space-y-3 text-white/90 mb-8">
              <li>
                <CheckCircle2 className="inline w-5 h-5 mr-1" />
                תזכורות והודעות אוטומטיות
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 mr-1" />
                הושבה חכמה וניהול שולחנות
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 mr-1" />
                עיצוב הזמנה מתקדם ועריכה חופשית
              </li>
              <li>
                <Users className="inline w-5 h-5 mr-1" />
                שליטה מלאה ברשימת המוזמנים
              </li>
              <li>
                <MessageCircle className="inline w-5 h-5 mr-1" />
                עדכונים וסטטיסטיקות בזמן אמת
              </li>
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
