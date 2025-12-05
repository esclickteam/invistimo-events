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
    <div className="relative space-y-28 pb-32">

      {/* רקע תלת שכבתי */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#faf7f3] via-[#f3ebe2] to-[#e6dacb]"></div>
      <div className="absolute inset-0 -z-20 opacity-[0.18] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="max-w-4xl mx-auto pt-24 px-4 text-center space-y-6"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-[#5c4632] leading-snug">
          הזמנות דיגיטליות יוקרתיות  
          <br /> ואישורי הגעה חכמים לכל אירוע
        </h1>

        <p className="text-lg md:text-xl text-[#7b6754] max-w-2xl mx-auto leading-relaxed">
          Invity מאפשרת לכם ליצור הזמנה דיגיטלית פרימיום, לנהל אישורי הגעה בזמן אמת,
          הושבה, תזכורות ועוד — הכול בעיצוב אלגנטי ברמה גבוהה.
        </p>

        {/* 🔗 כפתורי פעולה */}
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/login" className="btn-primary">
            התחברות
          </Link>
          <a href="#packages" className="btn-outline">
            צפייה בחבילות
          </a>
        </div>

        <div className="mt-8 space-y-2">
          <h3 className="text-sm text-[#857766] font-semibold">מתאים לכל סוגי האירועים:</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {EVENT_TYPES.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 text-xs rounded-full bg-white/90 border border-[#d9c8b5] text-[#7d6b59]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* איך זה עובד */}
      <section id="how" className="max-w-6xl mx-auto px-4 space-y-10">
        <h2 className="text-3xl font-bold text-center text-[#5c4632]">
          איך זה עובד בפועל
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              t: "נרשמים למערכת",
              d: "נכנסים לחשבון שלכם כדי להתחיל לנהל את האירוע בקלות.",
            },
            {
              t: "שולחים למוזמנים",
              d: "רשימת מוזמנים + שליחה ב-SMS/וואטסאפ. הכל מתעדכן אוטומטית.",
            },
            {
              t: "מנהלים הכול במקום אחד",
              d: "אישורי הגעה, הושבה, תזכורות — הכול אוטומטי ונוח.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              className="card"
            >
              <h3 className="text-xl font-semibold text-[#5c4632] mb-2">{item.t}</h3>
              <p className="text-[#7b6754] text-sm leading-relaxed">{item.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* חבילות */}
      <section id="packages" className="max-w-6xl mx-auto px-4 space-y-10">
        <h2 className="text-3xl font-bold text-center text-[#5c4632]">
          חבילות Invity
        </h2>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {["basic", "full"].map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`card p-8 ${
                plan === "full"
                  ? "bg-[#d4b28c] text-white shadow-xl"
                  : "bg-white shadow-md"
              }`}
            >
              {plan === "basic" ? (
                <>
                  <h3 className="text-xl font-bold text-[#5c4632]">חבילת בסיס</h3>
                  <p className="text-sm text-[#7b6754] mt-2 leading-relaxed">
                    הזמנה מעוצבת + אישורי הגעה אונליין.
                  </p>
                  <ul className="mt-4 text-sm text-[#7b6754] space-y-1">
                    <li>• הזמנה אחת</li>
                    <li>• אישורי הגעה מלאים</li>
                    <li>• טבלת מוזמנים מסודרת</li>
                  </ul>
                  <Link href="/plans?plan=basic" className="btn-outline mt-6">
                    המשך לחבילת בסיס
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-[#6d5e4f]">
                    חבילת ניהול אירוע מלאה
                  </h3>

                  <p className="text-[#6d5e4f] text-sm mt-2 leading-relaxed">
                    כולל הכל — אישורים, הושבה, תזכורות, עיצוב יוקרתי.
                  </p>

                  <ul className="mt-4 text-sm text-[#6d5e4f] space-y-1">
                    <li>• הזמנה יוקרתית</li>
                    <li>• ניהול אישורי הגעה</li>
                    <li>• הושבה לשולחנות</li>
                    <li>• תזכורות אוטומטיות</li>
                  </ul>

                  <Link href="/plans?plan=full" className="btn-primary mt-6">
                    המשך לחבילה מלאה
                  </Link>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
