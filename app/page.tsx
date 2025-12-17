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
    <main className="bg-[#faf8f4] text-[#3f3a34] overflow-x-hidden">

      {/* ================= HERO ================= */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] via-[#f3ede4] to-[#ece4d8]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.9 }}
          className="relative z-10 max-w-5xl text-center"
        >
          <div className="text-xs tracking-[0.4em] text-[#b29a72] mb-6">
            INVISTIMO
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold leading-tight mb-6">
            ניהול אירועים
            <br />
            <span className="text-[#b29a72]">בלי כאב ראש</span>
          </h1>

          <p className="text-lg md:text-xl text-[#6b5f55] max-w-2xl mx-auto mb-10">
            הזמנות דיגיטליות, אישורי הגעה וסידורי הושבה —
            הכל במקום אחד, בצורה חכמה ומכובדת.
          </p>

          <div className="flex items-center justify-center gap-6">
            <Link
              href={PRICING_URL}
              className="px-10 py-4 bg-[#3f3a34] text-[#faf8f4] rounded-full text-sm tracking-wide hover:opacity-90 transition"
            >
              לצפייה בחבילות
            </Link>

            <span className="text-sm text-[#6b5f55]">
              בלי התחייבות · מוכן תוך דקות
            </span>
          </div>
        </motion.div>
      </section>

      {/* ================= למי זה מתאים ================= */}
      <section className="py-28 px-6 bg-[#f6f2ec]">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-semibold text-center mb-16"
          >
            מתאים לכל מי שמארגן אירוע
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "חתונות ואירועים פרטיים",
                text: "שליחה מסודרת, אישורי הגעה בזמן אמת ושקט נפשי.",
              },
              {
                title: "אירועי חברה",
                text: "מעקב מדויק, רשימות מסודרות וניהול חכם.",
              },
              {
                title: "בר / בת מצווה",
                text: "בלי הודעות מבולגנות ובלי טלפונים מיותרים.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="bg-[#faf8f4] border border-[#e5dccf] p-10 rounded-3xl"
              >
                <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                <p className="text-[#6b5f55] leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= הבעיה ================= */}
      <section className="py-28 px-6 bg-[#ffffff]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-semibold mb-8"
          >
            נמאס לרדוף אחרי אורחים?
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.15 }}
            className="text-lg text-[#6b5f55] leading-relaxed"
          >
            הודעות, טלפונים, רשימות אקסל,
            שינויים של הרגע האחרון —
            כל זה נגמר.
            <br />
            מי שמגיע מאשר.
            מי שלא — פשוט לא.
          </motion.p>
        </div>
      </section>

      {/* ================= איך זה עובד ================= */}
      <section className="py-28 px-6 bg-[#f6f2ec]">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-semibold text-center mb-20"
          >
            איך זה עובד
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "יוצרים הזמנה",
                text: "עיצוב אלגנטי ומוכן לשליחה.",
              },
              {
                step: "02",
                title: "שולחים לאורחים",
                text: "קישור אישי לכל אורח.",
              },
              {
                step: "03",
                title: "עוקבים ומנהלים",
                text: "אישורי הגעה, הושבה וסטטוס בזמן אמת.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="relative p-10 bg-[#faf8f4] rounded-3xl border border-[#e5dccf]"
              >
                <div className="text-5xl font-semibold text-[#b29a72] mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                <p className="text-[#6b5f55] leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA תחתון ================= */}
      <section className="py-28 px-6 bg-[#3f3a34] text-[#faf8f4] text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-4xl md:text-5xl font-semibold mb-8"
        >
          מוכנים להפסיק להתעסק
          <br />
          ולהתחיל ליהנות מהאירוע?
        </motion.h2>

        <Link
          href={PRICING_URL}
          className="inline-block mt-6 px-12 py-4 bg-[#faf8f4] text-[#3f3a34] rounded-full text-sm tracking-wide hover:opacity-90 transition"
        >
          לצפייה בחבילות
        </Link>
      </section>

    </main>
  );
}
