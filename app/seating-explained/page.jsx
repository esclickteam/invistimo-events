"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function SeatingExplainedPage() {
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
          סידורי הושבה חכמים
          <span className="block text-[#c9b48f] mt-4">
            תכנון מדויק, שיבוץ מהיר, ושליחה לאורחים
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-3xl mx-auto text-xl leading-relaxed text-[#6b5f55]"
        >
          בונים מפת אולם עם או בלי סקיצה, משבצים אורחים בגרירה בזמן אמת,
          מנהלים הכל מהדשבורד – ובסוף שולחים הודעה אישית לכל אורח עם מספר השולחן.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <Link
            href="/pricing"
            className="
              inline-flex px-12 py-5 rounded-full
              bg-[#4a413a] text-white text-lg font-semibold
              shadow-[0_18px_45px_rgba(0,0,0,0.25)]
              hover:scale-[1.05]
              transition
            "
          >
            התחילו לבנות הושבה
          </Link>
        </motion.div>
      </section>

      {/* ================= סקיצה / הוספת שולחן ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              בונים את מפת האולם בדרך שלכם
            </h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              אפשר להתחיל בלי כלום – פשוט מוסיפים שולחנות וממקמים.
              ואם יש לכם סקיצה מהאולם, מעלים אותה כרקע ועובדים עליה בדיוק מושלם.
            </p>

            <ul className="space-y-4 text-lg">
              <li>הוספת שולחנות לפי סוג וצורה</li>
              <li>בחירת מספר כסאות לכל שולחן</li>
              <li>גרירה ומיקום חופשי או לפי סקיצה</li>
              <li>בנייה מדויקת ונוחה לשינויים</li>
            </ul>
          </motion.div>

          {/* IMAGE – רחב יותר, בלי מסגרת שחורה */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-[28px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
          >
            <img
              src="/sit1.png"
              alt="בניית מפת אולם והוספת שולחנות"
              className="w-full h-[520px] md:h-[580px] object-contain"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* ================= שיבוץ בזמן אמת ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* VIDEO – רחב יותר */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-[28px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
          >
            <video
              src="/videos/sit2.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-[520px] md:h-[580px] object-contain"
            />
          </motion.div>

          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              שיבוץ אורחים בגרירה – בזמן אמת
            </h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              גוררים את האורח מהצד לשולחן הרצוי או משבצים ישירות.
              כל שינוי מתעדכן מיידית בתפריט ובדשבורד.
            </p>

            <ul className="space-y-4 text-lg">
              <li>גרירה פשוטה ואינטואיטיבית</li>
              <li>עדכון בזמן אמת בכל המערכת</li>
              <li>עובד בצורה חלקה גם באירועים גדולים</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ================= הושבה אישית מהדשבורד ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              הושבה אישית מהדשבורד
            </h2>
            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              לכל אורח יש כפתור "הושבה אישית" – בלחיצה אחת רואים בדיוק היכן הוא יושב,
              וניתן להזיז אותו בקלות במידת הצורך.
            </p>
          </motion.div>

          {/* IMAGE – רחבה יותר */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-[28px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
          >
            <img
              src="/sit3.png"
              alt="הושבה אישית מדשבורד"
              className="w-full h-[520px] md:h-[580px] object-contain"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* ================= הודעות לאורחים ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* VIDEO – אחרון, יותר ארוך */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-[28px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
          >
            <video
              src="/videos/sit4.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-[700px] md:h-[760px] object-contain"
            />
          </motion.div>

          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              שולחים לכל אורח הודעה אישית עם מספר השולחן
            </h2>
            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              לאחר שההושבה מוכנה, שולחים הודעות אוטומטיות עם מספר השולחן –
              חוסך שאלות, עושה סדר ומוסיף טאץ’ מקצועי.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-28 px-6 bg-white text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-4xl font-bold mb-10"
        >
          מוכנים לבנות הושבה ברמה של אירוע?
        </motion.h2>
        <p className="text-xl text-[#6b5f55] max-w-2xl mx-auto">
          תכנון, שיבוץ, ניהול והודעות – הכל במערכת אחת שעובדת בשבילכם.
        </p>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: 0.25 }}
          className="mt-16"
        >
          <Link
            href="/pricing"
            className="
              inline-flex px-14 py-6 rounded-full
              bg-gradient-to-br from-[#4a413a] to-[#3f3730]
              text-white text-xl font-semibold
              shadow-[0_22px_60px_rgba(0,0,0,0.35)]
              hover:scale-[1.06]
              transition
            "
          >
            התחילו לבנות הושבה
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
