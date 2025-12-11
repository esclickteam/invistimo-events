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

/* ✅ טיפוסי TypeScript כדי למנוע שגיאה */
type GuestOption =
  | "עד 100 אורחים"
  | "עד 300 אורחים"
  | "עד 500 אורחים"
  | "עד 1000 אורחים";

export default function HomePage() {
  const [selectedGuests, setSelectedGuests] = useState<GuestOption | "">("");

  const prices: Record<GuestOption, string> = {
    "עד 100 אורחים": "149 ₪",
    "עד 300 אורחים": "249 ₪",
    "עד 500 אורחים": "399 ₪",
    "עד 1000 אורחים": "699 ₪",
  };

  // 💡 אם נבחרה כמות אורחים – נעביר אותה ל־register כ־query param
  const premiumHref = selectedGuests
    ? `/register?plan=premium&guests=${encodeURIComponent(selectedGuests)}`
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
        <h1 className="text-5xl md:text-7xl font-bold text-[#5c4632] leading-tight drop-shadow-sm">
          הזמנות דיגיטליות יוקרתיות
          <br /> ואישורי הגעה חכמים לכל אירוע
        </h1>

        <p className="text-lg md:text-2xl text-[#7b6754] max-w-3xl mx-auto leading-relaxed">
          פלטפורמה מעוצבת וחדשנית לניהול אירועים ב־<strong>Invistimo</strong>:
          הזמנות, אישורי הגעה, הושבה ותזכורות — הכול במקום אחד חכם ואלגנטי.
        </p>

        <div className="flex justify-center mt-10">
          <a
            href="#packages"
            className="px-10 py-4 rounded-full text-lg font-semibold border-2 border-[#c7a17a] text-[#6a5440] hover:bg-[#f5e8dd] transition shadow-md hover:shadow-lg active:scale-95"
          >
            צפייה בחבילות
          </a>
        </div>

        {/* תגיות אירועים */}
        <div className="mt-10 space-y-3">
          <h3 className="text-base text-[#857766] font-semibold">
            מתאים לכל סוגי האירועים:
          </h3>

          <div className="flex flex-wrap justify-center gap-3">
            {EVENT_TYPES.map((t) => (
              <motion.span
                key={t}
                whileHover={{ scale: 1.1, y: -3 }}
                className="px-5 py-3 text-sm md:text-base rounded-full bg-white/90 border border-[#d8c7b8] text-[#6f5b4a] shadow-sm"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ========= איך זה עובד ========= */}
      <section id="how" className="max-w-6xl mx-auto px-6 space-y-16">
        <h2 className="text-4xl font-bold text-center text-[#5c4632]">
          איך זה עובד בפועל
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              t: "נרשמים למערכת",
              d: "יוצרים חשבון ובוחרים את החבילה המתאימה לכם.",
            },
            {
              t: "יוצרים הזמנה ושולחים",
              d: "מעצבים הזמנה יוקרתית ושולחים אותה ב־SMS או וואטסאפ.",
            },
            {
              t: "מנהלים הכול במקום אחד",
              d: "אישורי הגעה, תזכורות והושבה — הכול אוטומטי ומסונכרן.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              className="bg-white rounded-3xl p-10 shadow-lg border border-[#eadfce] hover:shadow-xl hover:-translate-y-2 transition-all"
            >
              <h3 className="text-xl font-bold text-[#5c4632]">{item.t}</h3>
              <p className="text-[#7b6754] mt-3 leading-relaxed">{item.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========= חבילות ========= */}
      <section id="packages" className="max-w-6xl mx-auto px-6 space-y-16">
        <h2 className="text-4xl font-bold text-center text-[#5c4632]">
          החבילות שלנו
        </h2>

        <div className="grid md:grid-cols-2 gap-14 max-w-5xl mx-auto">
          {/* BASIC PACKAGE */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="bg-white p-10 rounded-3xl shadow-lg border border-[#eadfce] hover:-translate-y-2 hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-8 h-8 text-[#c7a17a]" />
              <h3 className="text-3xl font-bold text-[#5c4632]">חבילת בסיס</h3>
            </div>
            <p className="text-[#7b6754] text-xl font-semibold mb-6">
              49₪ בלבד
            </p>

            <ul className="space-y-3 text-[#7b6754] leading-relaxed text-base">
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />{" "}
                גישה לעורך ההזמנות לעיצוב אישי
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />{" "}
                הזמנה דיגיטלית מעוצבת ומוכנה לשליחה
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />{" "}
                שליחה ידנית ב־WhatsApp לכל אורח
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />{" "}
                קישור אישי עם כפתור לאישור הגעה
              </li>
              <li>
                <CheckCircle2 className="inline w-5 h-5 text-[#c7a17a] mr-1" />{" "}
                עדכון בזמן אמת מי אישר ומי לא
              </li>
            </ul>

            <Link
              href="/register?plan=basic"
              className="block mt-10 text-center px-10 py-4 rounded-full border-2 border-[#c7a17a] text-[#6a5440] font-semibold hover:bg-[#f5e8dd] transition shadow-md hover:shadow-lg"
            >
              הרשמה ותשלום לחבילת בסיס
            </Link>
          </motion.div>

          {/* PREMIUM PACKAGE */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="p-10 rounded-3xl shadow-xl bg-gradient-to-br from-[#d2b08c] to-[#c19c78] text-white hover:-translate-y-2 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-8 h-8 text-white" />
              <h3 className="text-3xl font-bold">
                חבילת פרימיום — אישורי הגעה + הושבה חכמה
              </h3>
            </div>

            <ul className="space-y-3 text-white/90 leading-relaxed text-base mb-8">
              <li>
                <CheckCircle2 className="inline w-5 h-5 mr-1 text-white" />{" "}
                הזמנה דיגיטלית מעוצבת + גישה לעורך ההזמנות
              </li>
              <li>
                <MessageCircle className="inline w-5 h-5 mr-1 text-white" />{" "}
                שליחה אוטומטית ב־SMS לאישור הגעה + תזכורת למי שלא אישר
              </li>
              <li>
                <Users className="inline w-5 h-5 mr-1 text-white" /> עדכון בזמן
                אמת מי אישר הגעה
              </li>
              <li>
                <Map className="inline w-5 h-5 mr-1 text-white" /> ניהול הושבה –
                העלאת מפת אולם ועריכת שולחנות
              </li>
              <li>
                <MessageCircle className="inline w-5 h-5 mr-1 text-white" />{" "}
                תזכורת לפני האירוע + מספר שולחן בהודעה אחת
              </li>
            </ul>

            {/* בחירה לפי כמות אורחים */}
            <div className="bg-white/15 p-5 rounded-2xl text-sm text-center">
              <p className="font-semibold mb-3 text-white">בחרו כמות אורחים:</p>

              <select
                className="
                  w-full
                  bg-white
                  text-[#5c4632]
                  font-medium
                  px-4 py-3
                  rounded-xl
                  text-center
                  outline-none
                  border border-[#e9d8c5]
                  shadow-sm
                  hover:border-[#d6b98d]
                  focus:border-[#c19c78]
                  transition
                "
                value={selectedGuests}
                onChange={(e) =>
                  setSelectedGuests(e.target.value as GuestOption)
                }
              >
                <option value="">בחרו...</option>
                {Object.keys(prices).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>

              {selectedGuests && (
                <p className="mt-4 text-white/90 text-lg font-semibold">
                  מחיר: {prices[selectedGuests]}
                </p>
              )}
            </div>

            <Link
              href={premiumHref}
              className="block mt-10 text-center px-10 py-4 rounded-full bg-white text-[#6a5440] font-bold hover:bg-[#f0e9e4] transition shadow-lg"
            >
              הרשמה ותשלום לחבילת פרימיום
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
