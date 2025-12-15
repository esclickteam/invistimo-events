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
          <span className="block text-[#c9b48f] mt-4">
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
          מעדכנת את לוח הבקרה בזמן אמת,
          ונותנת לך תמונת מצב מדויקת — בלי מאמץ.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <Link
            href="/create-invite"
            className="
              inline-flex px-12 py-5 rounded-full
              bg-[#4a413a] text-white text-lg font-semibold
              shadow-[0_18px_45px_rgba(0,0,0,0.25)]
              hover:shadow-[0_26px_60px_rgba(0,0,0,0.35)]
              hover:scale-[1.05]
              transition
            "
          >
            התחילו לנהל אישורי הגעה
          </Link>
        </motion.div>
      </section>

      {/* ================= BLOCK 1 – GUEST RSVP ================= */}
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
              אישור הגעה עצמאי לאורח
            </h2>

            <p className="text-lg text-[#6b5f55] mb-8 leading-relaxed">
              כל אורח מאשר את הגעתו דרך קישור אישי,
              בצורה פשוטה, ברורה וללא צורך בהרשמה.
            </p>

            <ul className="space-y-4 text-lg">
              <li>קישור אישי ייחודי לכל אורח</li>
              <li>שליחה ידנית ב־WhatsApp או ב־SMS</li>
              <li>בחירת מגיע / לא מגיע</li>
              <li>בחירת מספר מוזמנים</li>
              <li>הוספת הערות (כשרות, נגישות, אלרגיות ועוד)</li>
            </ul>

            <p className="mt-8 text-lg text-[#6b5f55] leading-relaxed">
              האורח לא צריך להירשם, לא להוריד אפליקציה
              ולא ליצור קשר — הכל מתבצע ישירות מהקישור.
            </p>
          </motion.div>

          {/* VIDEO – RSVP 1 */}
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
            <div className="rounded-[26px] overflow-hidden aspect-[9/16] bg-black">
              <video
                src="/videos/rsvp1.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= BLOCK 2 – LIVE DASHBOARD ================= */}
      <section className="py-28 px-6 bg-[#faf8f4]">
        <div className="max-w-5xl mx-auto text-center">

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-4xl font-bold mb-6"
          >
            עדכון בזמן אמת בדשבורד
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.15 }}
            className="text-xl text-[#6b5f55] mb-12"
          >
            כל פעולה של אורח מתעדכנת מיידית במערכת —
            בלי רענון, בלי המתנה.
          </motion.p>

          <ul className="space-y-4 text-lg max-w-2xl mx-auto">
            <li>סטטוס הגעה מתעדכן אוטומטית</li>
            <li>מספר מוזמנים מתעדכן מייד</li>
            <li>סיכום משתתפים תמיד מדויק</li>
            <li>אין צורך לרענן או להמתין</li>
          </ul>

          <p className="mt-10 text-lg text-[#6b5f55]">
            בעל השמחה רואה בכל רגע
            מי מגיע, כמה מגיעים,
            ומי עדיין לא ענה.
          </p>
        </div>
      </section>

      {/* ================= BLOCK 3 – OWNER MANAGE ================= */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          {/* VIDEO – RSVP 2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="
              rounded-[28px]
              overflow-hidden
              bg-black
              shadow-[0_20px_50px_rgba(0,0,0,0.18)]
            "
          >
            <video
              src="/videos/rsvp2.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
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
              ניהול מלא גם מצד בעל השמחה
            </h2>

            <p className="text-lg text-[#6b5f55] mb-8">
              לא תלויים רק באורחים —
              כל הנתונים ניתנים לעריכה ידנית.
            </p>

            <ul className="space-y-4 text-lg">
              <li>הוספת אורחים ידנית</li>
              <li>עריכת סטטוס הגעה</li>
              <li>שינוי מספר מוזמנים</li>
              <li>הוספת הערות משיחה טלפונית או וואטסאפ</li>
              <li>הכל מתעדכן מייד בדשבורד</li>
            </ul>

            <p className="mt-8 text-lg text-[#6b5f55]">
              גם אם אורח התקשר, שלח הודעה
              או ביקש לעדכן דרך צד שלישי —
              השליטה נשארת אצלך.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= BLOCK 4 – WHY + CTA ================= */}
      <section className="py-28 px-6 bg-[#faf8f4] text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-4xl font-bold mb-10"
        >
          למה אישורי ההגעה של Invistimo עובדים באמת
        </motion.h2>

        <ul className="space-y-4 text-xl max-w-xl mx-auto">
          <li>אין טלפונים חוזרים</li>
          <li>אין הודעות מפוזרות</li>
          <li>אין נתונים סותרים</li>
          <li>אין ניחושים</li>
          <li>הכל מרוכז במקום אחד</li>
        </ul>

        <p className="mt-12 text-xl text-[#6b5f55]">
          אישורי הגעה שעובדים בשבילך —
          לא כאלה שצריך לרדוף אחריהם.
        </p>

        {/* FINAL CTA */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: 0.25 }}
          className="mt-16"
        >
          <Link
            href="/create-invite"
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
            התחילו לנהל אישורי הגעה
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
