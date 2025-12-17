"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const PRICING_URL = "https://www.invistimo.com/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div className="bg-[#faf8f4] text-[#4a413a] overflow-hidden">

      {/* ================= HERO – WOW INVITATION ================= */}
      <section className="relative min-h-screen px-6 flex items-center">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center w-full">

          {/* TEXT */}
          <div className="text-center md:text-right">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
            >
              ניהול אירוע חכם
              <span className="block text-[#c9b48f] mt-4">
                בלי לרדוף אחרי אף אחד
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-xl leading-relaxed text-[#6b5f55] max-w-xl mx-auto md:mx-0"
            >
              הזמנה דיגיטלית, אישורי הגעה וניהול אורחים —
              הכל מתרחש במקום אחד, רגוע, מדויק,
              ומעודכן בזמן אמת.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.4 }}
              className="mt-12"
            >
              <Link
                href={PRICING_URL}
                className="
                  inline-flex px-14 py-6 rounded-full
                  bg-[#4a413a] text-white text-xl font-semibold
                  shadow-[0_22px_60px_rgba(0,0,0,0.35)]
                  hover:shadow-[0_30px_75px_rgba(0,0,0,0.45)]
                  hover:scale-[1.06]
                  transition
                "
              >
                לצפייה בחבילות
              </Link>
            </motion.div>
          </div>

          {/* INVITATION VIDEO CARD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            whileHover={{ rotateX: 2, rotateY: -2 }}
            className="
              mx-auto
              w-[320px] sm:w-[360px]
              rounded-[40px]
              p-[14px]
              bg-gradient-to-br from-[#efe8dc] to-[#f8f5ef]
              shadow-[0_60px_140px_rgba(0,0,0,0.25)]
            "
          >
            <div className="rounded-[30px] overflow-hidden bg-white">

              {/* VIDEO PLACEHOLDER */}
              <div className="aspect-[9/16] bg-[#e6ddd2] flex items-center justify-center text-[#9a8f82] text-sm">
                כאן ייכנס וידאו הזמנה
              </div>

              {/* INVITE FOOTER */}
              <div className="p-6 text-center space-y-3">
                <div className="text-xs tracking-[0.3em] text-[#b89b6d]">
                  INVISTIMO
                </div>
                <p className="text-sm text-[#6b5f55]">
                  הזמנה דיגיטלית חיה · אישורי הגעה חכמים
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ================= BLOCK 1 – PHILOSOPHY ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-4xl font-bold mb-8"
          >
            הגישה שלנו לניהול אירועים
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.15 }}
            className="text-xl text-[#6b5f55] leading-relaxed max-w-3xl mx-auto"
          >
            אנחנו לא עובדים עם סבבי טלפונים,
            לא רודפים אחרי אורחים
            ולא מבזבזים זמן וכסף מיותרים.
          </motion.p>

          <p className="mt-10 text-xl text-[#6b5f55] max-w-2xl mx-auto">
            מי שרוצה להגיע — מאשר לבד.
            מי שלא — לא צריך שיציקו לו.
            הכל מתעדכן אוטומטית במערכת.
          </p>
        </div>
      </section>

      {/* ================= BLOCK 2 – SYSTEM PREVIEW ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              כל האירוע במקום אחד
            </h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              מרגע שליחת ההזמנה ועד יום האירוע —
              הכל מנוהל דרך מערכת אחת ברורה,
              בלי ניחושים ובלי חוסר ודאות.
            </p>

            <ul className="space-y-4 text-lg">
              <li>שליטה מלאה ברשימת האורחים</li>
              <li>אישורי הגעה בזמן אמת</li>
              <li>נתונים תמיד מדויקים</li>
              <li>אין צורך לרדוף אחרי אף אחד</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="
              rounded-[36px]
              p-[14px]
              bg-gradient-to-br from-[#efe8dc] to-[#f8f5ef]
              shadow-[0_25px_60px_rgba(0,0,0,0.15)]
            "
          >
            <div className="rounded-[26px] aspect-[16/10] bg-[#e6ddd2]" />
          </motion.div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-28 px-6 bg-white text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-4xl font-bold mb-10"
        >
          מוכנים לנהל אירוע רגוע באמת?
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: 0.2 }}
        >
          <Link
            href={PRICING_URL}
            className="
              inline-flex px-16 py-6 rounded-full
              bg-gradient-to-br from-[#4a413a] to-[#3f3730]
              text-white text-xl font-semibold
              shadow-[0_22px_60px_rgba(0,0,0,0.35)]
              hover:shadow-[0_30px_75px_rgba(0,0,0,0.45)]
              hover:scale-[1.06]
              transition
            "
          >
            לצפייה בחבילות
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
