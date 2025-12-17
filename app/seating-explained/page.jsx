"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function SeatingExplainedPage() {
  /**
   * ✅ הגדלה של המדיה
   * ✅ עיגול עדין לפינות של המדיה עצמה
   * ✅ בלי רקע/מסגרת/פדינג/תוספת חיצונית
   *
   * חשוב: כדי שה-rounded באמת “יחתוך” את התמונה/וידאו בלי wrapper,
   * שמים overflow-hidden על המדיה עצמה.
   */
  const wideMedia =
    "w-full h-[680px] md:h-[880px] object-contain bg-transparent rounded-xl overflow-hidden";

  const tallLastMedia =
    "w-full h-[880px] md:h-[1080px] object-contain bg-transparent rounded-xl overflow-hidden";

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
          אפשר לעבוד חופשי בלי סקיצה — ואם יש סקיצה מהאולם, פשוט מעלים אותה כרקע לדיוק
          מושלם.
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

      {/* ================= SECTION 1 – בניית מפת אולם (עם/בלי סקיצה) ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* TEXT */}
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

          {/* IMAGE – גדול, בלי שום מסגרת/צל */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <img
              src="/sit1.png"
              alt="בניית מפת אולם והוספת שולחנות"
              className={wideMedia}
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 2 – שיבוץ בזמן אמת (sit2.mp4) ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* VIDEO – גדול, בלי שום מסגרת/שחור */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
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

          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">שיבוץ אורחים בגרירה — בזמן אמת</h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              מתוך תפריט האורחים בצד גוררים את האורח לשולחן הרצוי,
              או משבצים דרך השולחן עצמו — וכל שינוי מתעדכן מיד בכל המערכת.
            </p>

            <ul className="space-y-4 text-lg">
              <li>גרירה פשוטה מרשימת האורחים לשולחן</li>
              <li>אפשר גם שיבוץ דרך השולחן עצמו</li>
              <li>עדכון בזמן אמת בתפריט הצד ליד שם האורח</li>
              <li>עדכון מיידי גם בדשבורד</li>
            </ul>

            <p className="mt-8 text-lg text-[#6b5f55] leading-relaxed">
              לא מתבלבלים, לא מפספסים — פשוט רואים תמונה ברורה בכל רגע.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 3 – הושבה אישית מהדשבורד (sit3.png) ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">הושבה אישית מהדשבורד — כשצריך דיוק</h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              בדשבורד אפשר לערוך הושבה של אורח ספציפי דרך כפתור “הושבה אישית”.
              המערכת מסמנת את השולחן והמיקום שלו — כדי שתוכלו לתקן או להעביר במהירות.
            </p>

            <ul className="space-y-4 text-lg">
              <li>איתור אורח תוך שנייה</li>
              <li>סימון ברור של השולחן והמיקום</li>
              <li>מעולה לשינויים של הרגע האחרון</li>
              <li>הכל נשאר מסונכרן</li>
            </ul>
          </motion.div>

          {/* IMAGE – גדול, בלי שום מסגרת/צל */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <img
              src="/sit3.png"
              alt="הושבה אישית מהדשבורד"
              className={wideMedia}
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 4 – הודעות לאורחים (sit4.mp4) ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* VIDEO – אחרון, יותר גבוה */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
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

          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">שולחים לאורחים הודעה עם מספר השולחן</h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              אחרי שההושבה מסודרת — שולחים הודעה חכמה לכל אורח עם מספר השולחן שלו.
              זה עושה סדר, נראה מקצועי, וחוסך הודעות ביום האירוע.
            </p>

            <ul className="space-y-4 text-lg">
              <li>שליחה ישירות מתוך המערכת</li>
              <li>כל אורח מקבל את מספר השולחן שלו</li>
              <li>בלי שאלות “איפה אנחנו יושבים?”</li>
            </ul>
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
          מוכנים לבנות הושבה ברמה של אירוע?
        </motion.h2>

        <p className="text-xl text-[#6b5f55] max-w-2xl mx-auto">
          תכנון, שיבוץ, ניהול והודעות — במקום אחד, עם חוויה נקייה שמרגישה פרימיום.
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
              hover:shadow-[0_30px_75px_rgba(0,0,0,0.45)]
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
