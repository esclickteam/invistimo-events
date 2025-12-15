"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function RSVPPage() {
  return (
    <div className="bg-[#faf8f4] text-[#4a413a] overflow-hidden">

      {/* ================= HERO ================= */}
      <section className="relative py-28 px-6 text-center">
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-bold mb-6"
        >
          אישורי הגעה חכמים  
          <span className="block text-[#c9b48f] mt-3">
            שליטה מלאה באירוע שלך
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-3xl mx-auto text-xl leading-relaxed text-[#6b5f55]"
        >
          מערכת אישורי ההגעה של Invistimo מחוברת להזמנה הדיגיטלית,
          מעדכנת את לוח הבקרה בזמן אמת
          ונותנת לך תמונת מצב מדויקת — בלי מאמץ.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.4 }}
          className="mt-10"
        >
          <Link
            href="/create-invite"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full
            bg-[#4a413a] text-white text-lg font-semibold
            shadow-lg hover:shadow-xl hover:scale-[1.03] transition"
          >
            התחילו לנהל אישורי הגעה
          </Link>
        </motion.div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

          {[
            {
              title: "שליחת הזמנה דיגיטלית",
              text: "כל מוזמן מקבל קישור אישי להזמנה – דרך WhatsApp או SMS.",
              icon: "📩",
            },
            {
              title: "אישור הגעה בלחיצה",
              text: "בחירת סטטוס הגעה ומספר משתתפים – פשוט, מהיר וברור.",
              icon: "✅",
            },
            {
              title: "עדכון מיידי בדשבורד",
              text: "כל שינוי מתעדכן אוטומטית בלוח הבקרה שלך.",
              icon: "📊",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.15 }}
              className="
                bg-[#faf8f4]
                rounded-3xl p-8
                shadow-sm hover:shadow-xl
                transition
              "
            >
              <div className="text-4xl mb-5">{item.icon}</div>
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-[#6b5f55] leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= LIVE DASHBOARD ================= */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              הכל מתעדכן בזמן אמת
            </h2>

            <p className="text-lg text-[#6b5f55] leading-relaxed mb-6">
              לוח הבקרה של Invistimo מציג בכל רגע נתון
              את מצב אישורי ההגעה,
              בצורה ברורה, מדויקת ונוחה לעבודה.
            </p>

            <ul className="space-y-4 text-lg">
              <li>✔ סטטוס הגעה לכל מוזמן</li>
              <li>✔ חישוב אוטומטי של סך המשתתפים</li>
              <li>✔ זיהוי מוזמנים שעדיין לא השיבו</li>
              <li>✔ חיבור ישיר לסידורי הושבה</li>
            </ul>
          </motion.div>

          {/* Fake dashboard card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="
              relative
              bg-gradient-to-br from-[#1c1c1c] to-[#2b2b2b]
              rounded-3xl p-8 text-white
              shadow-2xl
            "
          >
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "מגיעים", value: "128" },
                { label: "לא מגיעים", value: "34" },
                { label: "ממתינים", value: "19" },
                { label: "סה״כ משתתפים", value: "287" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="
                    bg-white/10 rounded-xl p-5
                    text-center backdrop-blur
                  "
                >
                  <div className="text-3xl font-bold mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm opacity-80">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= WHY IT MATTERS ================= */}
      <section className="py-24 bg-white px-6 text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-4xl font-bold mb-6"
        >
          למה זה משנה באמת?
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: 0.15 }}
          className="max-w-3xl mx-auto text-xl text-[#6b5f55]"
        >
          כי אירוע טוב מנוהל על בסיס נתונים מדויקים,
          לא לפי תחושת בטן.
          Invistimo מרכז עבורך את כל המידע
          למקום אחד ברור ונוח.
        </motion.p>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 px-6 text-center bg-[#4a413a] text-white">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-4xl font-bold mb-6"
        >
          מוכנים לנהל אישורי הגעה בצורה חכמה?
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/create-invite"
            className="
              inline-flex px-10 py-4 rounded-full
              bg-[#c9b48f] text-[#4a413a]
              text-lg font-semibold
              hover:scale-[1.05]
              transition shadow-xl
            "
          >
            התחילו עכשיו עם Invistimo
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
