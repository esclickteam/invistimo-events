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
          מעלים סקיצה של האולם, מוסיפים שולחנות ואלמנטים, משבצים אורחים בגרירה
          בזמן אמת — ומסיימים בשליחת הודעה עם מספר השולחן לכל אורח.
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

      {/* ================= SECTION 1 – סקיצה + הוספת שולחן ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* TEXT */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold mb-6">
              מתחילים מהבסיס: סקיצת אולם אמיתית
            </h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              קיבלתם סקיצה מהאולם? מעלים אותה כרקע ומניחים מעליה שולחנות ואלמנטים.
              ככה ההושבה שלכם נבנית לפי השטח האמיתי — לא לפי ניחושים.
            </p>

            <ul className="space-y-4 text-lg">
              <li>הוספת שולחנות לפי סוג וצורה</li>
              <li>בחירת מספר כיסאות לכל שולחן</li>
              <li>מיקום חופשי על גבי הסקיצה</li>
              <li>אפשר להוסיף גם אלמנטים (רחבה/בר/במה)</li>
            </ul>

            <p className="mt-8 text-lg text-[#6b5f55] leading-relaxed">
              זה נראה מקצועי, זה מרגיש מסודר — וזה חוסך טעויות בהמשך.
            </p>
          </motion.div>

          {/* IMAGE FRAME (כמו RSVP) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="
              relative
              rounded-[36px]
              p-[12px]
              bg-gradient-to-br from-[#efe8dc] to-[#f8f5ef]
              shadow-[0_25px_60px_rgba(0,0,0,0.15)]
            "
          >
            <div className="rounded-[26px] overflow-hidden bg-white">
              <img
                src="/sit1.png"
                alt="הוספת שולחן וסקיצת אולם"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 2 – שיבוץ בזמן אמת (sit2.mp4) ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* VIDEO FRAME (כמו RSVP 1) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="
              relative
              rounded-[36px]
              p-[12px]
              bg-gradient-to-br from-[#efe8dc] to-[#f8f5ef]
              shadow-[0_25px_60px_rgba(0,0,0,0.15)]
            "
          >
            <div className="rounded-[26px] overflow-hidden bg-black aspect-[16/9]">
              <video
                src="/videos/sit2.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* TEXT */}
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
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* TEXT */}
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
              המערכת מסמנת את השולחן והמיקום שלו — כדי שתוכלו לתקן או להעביר במהירות.
            </p>

            <ul className="space-y-4 text-lg">
              <li>איתור אורח תוך שנייה</li>
              <li>סימון ברור של השולחן והמיקום</li>
              <li>מעולה לשינויים של הרגע האחרון</li>
              <li>הכל נשאר מסונכרן</li>
            </ul>
          </motion.div>

          {/* IMAGE FRAME */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="
              relative
              rounded-[36px]
              p-[12px]
              bg-gradient-to-br from-[#efe8dc] to-[#f8f5ef]
              shadow-[0_25px_60px_rgba(0,0,0,0.15)]
            "
          >
            <div className="rounded-[26px] overflow-hidden bg-white">
              <img
                src="/sit3.png"
                alt="הושבה אישית מהדשבורד"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 4 – הודעות לאורחים (sit4.mp4) ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* VIDEO FRAME — כאן Contain כדי לא להיחתך */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="
              relative
              rounded-[36px]
              p-[12px]
              bg-gradient-to-br from-[#efe8dc] to-[#f8f5ef]
              shadow-[0_25px_60px_rgba(0,0,0,0.15)]
            "
          >
            <div className="rounded-[26px] overflow-hidden bg-black aspect-[16/9]">
              <video
                src="/videos/sit4.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>

          {/* TEXT */}
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

            <ul className="space-y-4 text-lg">
              <li>שליחה ישירות מתוך המערכת</li>
              <li>כל אורח מקבל את מספר השולחן שלו</li>
              <li>נראה נקי ומדויק — בדיוק כמו מותג פרימיום</li>
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
