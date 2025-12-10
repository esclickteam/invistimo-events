"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const EVENT_TYPES = [
  "ברית / בריתה",
  "בר / בת מצווה",
  "חתונה קטנה וגדולה",
  "חינה ושבת חתן",
  "אירועי חברה וכנסים",
  "כל אירוע אחר",
];

export default function HomePage() {
  return (
    <div className="relative space-y-40 pb-40">

      {/* ========= רקע שכבות יוקרתי ========= */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#f7f3ee] via-[#efe7dd] to-[#e7d9ca]" />
      <div className="absolute inset-0 -z-10 opacity-[0.15] bg-[url('/noise.png')]" />

      {/* ========= HERO ========= */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="max-w-5xl mx-auto pt-36 px-6 text-center space-y-8"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9 }}
          className="text-5xl md:text-7xl font-bold text-[#5c4632] leading-tight drop-shadow-sm"
        >
          הזמנות דיגיטליות יוקרתיות  
          <br /> ואישורי הגעה חכמים לכל אירוע
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9 }}
          className="text-lg md:text-2xl text-[#7b6754] max-w-3xl mx-auto leading-relaxed"
        >
          פלטפורמה מעוצבת וחדשנית לניהול אירוע ב־<strong>invistimo</strong>:
          הזמנות, אישורי הגעה, הושבה, תזכורות — הכול במקום אחד חכם ויוקרתי.
        </motion.p>

        {/* כפתור יחיד — צפייה בחבילות */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="flex justify-center mt-10"
        >
          <a
            href="#packages"
            className="px-10 py-4 rounded-full text-lg font-semibold border-2 border-[#c7a17a] text-[#6a5440] hover:bg-[#f5e8dd] transition shadow-md hover:shadow-lg active:scale-95"
          >
            צפייה בחבילות
          </a>
        </motion.div>

        {/* תגיות אירועים */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 space-y-3"
        >
          <h3 className="text-sm text-[#857766] font-semibold">
            מתאים לכל סוגי האירועים:
          </h3>

          <div className="flex flex-wrap justify-center gap-2">
            {EVENT_TYPES.map((t) => (
              <motion.span
                key={t}
                whileHover={{ scale: 1.1, y: -3 }}
                className="px-4 py-2 text-xs rounded-full bg-white/90 border border-[#d6c5b5] text-[#7d6b59] shadow-sm"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </motion.div>
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
              d: "יוצרים חשבון — ובוחרים את החבילה שהכי מתאימה לכם."
            },
            {
              t: "יוצרים הזמנה ושולחים",
              d: "מעצבים הזמנה יוקרתית ושולחים ב־SMS/וואטסאפ לכל המוזמנים."
            },
            {
              t: "מנהלים הכול במקום אחד",
              d: "אישורי הגעה, תזכורות, הושבה — הכול אוטומטי ומסונכרן."
            }
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

          {/* BASIC */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="bg-white p-10 rounded-3xl shadow-lg border border-[#eadfce] hover:-translate-y-2 hover:shadow-xl transition-all"
          >
            <h3 className="text-3xl font-bold text-[#5c4632]">חבילת בסיס</h3>
            <p className="text-[#7b6754] mt-3 text-lg">
              הזמנה מעוצבת + ניהול מלא של אישורי הגעה.
            </p>

            <ul className="mt-6 space-y-2 text-[#7b6754]">
              <li>• הזמנה מעוצבת אחת</li>
              <li>• אישורי הגעה חכמים</li>
              <li>• טבלת מוזמנים מלאה</li>
            </ul>

            <Link
              href="/plans?plan=basic"
              className="block mt-8 text-center px-8 py-4 rounded-full border-2 border-[#c7a17a] text-[#6a5440] font-semibold hover:bg-[#f5e8dd] transition shadow-md hover:shadow-lg"
            >
              בחרו חבילת בסיס
            </Link>
          </motion.div>

          {/* FULL */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="p-10 rounded-3xl shadow-xl bg-gradient-to-br from-[#d2b08c] to-[#c19c78] text-white hover:-translate-y-2 hover:shadow-2xl transition-all"
          >
            <h3 className="text-3xl font-bold">חבילת פרימיום מלאה</h3>
            <p className="mt-3 text-lg text-white/90">
              הזמנה יוקרתית + הושבה + תזכורות + אפליקציית מוזמנים.
            </p>

            <ul className="mt-6 space-y-2 text-white/90">
              <li>• הזמנה פרימיום</li>
              <li>• ניהול מלא של אישורי הגעה</li>
              <li>• מערכת הושבה חכמה</li>
              <li>• תזכורות אוטומטיות</li>
            </ul>

            <Link
              href="/plans?plan=full"
              className="block mt-8 text-center px-8 py-4 rounded-full bg-white text-[#6a5440] font-bold hover:bg-[#f0e9e4] transition shadow-lg"
            >
              בחרו חבילה מלאה
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
