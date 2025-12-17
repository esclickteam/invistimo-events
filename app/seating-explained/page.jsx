"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function SeatingExplainedPage() {
  // פינות מעוגלות ומסגרת עדינה בלבד
  const mediaFrame =
    "rounded-[30px] overflow-hidden border border-[#d7c6aa]";

  // מדיה גדולה מאוד לרוחב (בלי חיתוך)
  const wideMedia =
    "w-full h-[760px] md:h-[980px] object-contain bg-transparent";

  // האחרון מעט גבוה יותר
  const tallLastMedia =
    "w-full h-[860px] md:h-[1120px] object-contain bg-transparent";

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
          בונים מפת אולם, משבצים אורחים בגרירה בזמן אמת, מנהלים הושבה מהדשבורד —
          ומסיימים בשליחת הודעה עם מספר השולחן לכל אורח.
        </motion.p>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.28, duration: 0.8 }}
          className="max-w-3xl mx-auto text-lg leading-relaxed text-[#6b5f55] mt-4"
        >
          אפשר לעבוד חופשי בלי סקיצה — ואם יש סקיצה מהאולם, פשוט מעלים אותה כרקע לדיוק מושלם.
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
              hover:shadow-[0_26px_60px_rgba(0,0,0,0.35)]
              hover:scale-[1.05]
              transition
            "
          >
            התחילו לבנות הושבה
          </Link>
        </motion.div>
      </section>

      {/* ================= SECTION 1 ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-[1700px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              בונים את מפת האולם בדרך שנוחה לכם
            </h2>
            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              אפשר להתחיל לבנות הושבה גם בלי שום דבר — פשוט מוסיפים שולחנות וממקמים אותם.
              ואם יש לכם סקיצה מהאולם, אפשר להעלות אותה כרקע ולעבוד עליה בשביל דיוק מקסימלי.
            </p>
            <ul className="space-y-4 text-lg">
              <li>עבודה חופשית בלי סקיצה — מפת אולם “נקייה”</li>
              <li>או העלאת סקיצה כרקע ועבודה עליה</li>
              <li>הוספת שולחנות לפי סוג וצורה</li>
              <li>בחירת מספר כיסאות לכל שולחן</li>
            </ul>
            <p className="mt-8 text-lg text-[#6b5f55] leading-relaxed">
              כך או כך — אתם בשליטה מלאה, וההושבה נשארת מסודרת וקלה לשינויים.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={mediaFrame}
          >
            <img src="/sit1.png" alt="בניית מפת אולם" className={wideMedia} />
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 2 ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-[1700px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={mediaFrame}
          >
            <video
              src="/videos/sit2.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className={wideMedia}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              שיבוץ אורחים בגרירה — בזמן אמת
            </h2>
            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              גוררים אורח מהתפריט לשולחן הרצוי או משבצים ישירות מתוך השולחן עצמו —
              וכל שינוי מתעדכן מיד בזמן אמת.
            </p>
            <ul className="space-y-4 text-lg">
              <li>גרירה פשוטה מרשימת האורחים לשולחן</li>
              <li>עדכון אוטומטי בתצוגה ובדשבורד</li>
              <li>עובד חלק בכל שלב</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 3 ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-[1700px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              הושבה אישית מהדשבורד — כשצריך דיוק
            </h2>
            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              בדשבורד אפשר לערוך הושבה של אורח ספציפי דרך כפתור “הושבה אישית”.
              המערכת מסמנת את השולחן והמיקום שלו — כדי שתוכלו לתקן או להעביר בקלות.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={mediaFrame}
          >
            <img src="/sit3.png" alt="הושבה אישית מהדשבורד" className={wideMedia} />
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 4 ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-[1700px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={mediaFrame}
          >
            <video
              src="/videos/sit4.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className={tallLastMedia}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              שולחים לאורחים הודעה עם מספר השולחן
            </h2>
            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              אחרי שההושבה מסודרת — שולחים הודעה חכמה לכל אורח עם מספר השולחן שלו.
              זה עושה סדר, נראה מקצועי, וחוסך הודעות ביום האירוע.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
