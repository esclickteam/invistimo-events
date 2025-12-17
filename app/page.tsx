"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/* אפקט חלקיקים רך – חגיגי ועדין */
function SoftParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(14)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#cbb38a]/40"
          initial={{
            x: Math.random() * 100 + "%",
            y: "110%",
            opacity: 0,
          }}
          animate={{
            y: "-10%",
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 16 + Math.random() * 6,
            delay: Math.random() * 6,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="bg-[#f6f2ec] text-[#3f3a34] overflow-x-hidden">

      {/* ================= בלוק 1 – HERO ================= */}
      <section className="relative min-h-screen flex items-center px-6">
        <SoftParticles />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.9 }}
          >
            <h1 className="text-5xl md:text-6xl font-semibold leading-tight mb-6">
              ניהול אירוע חכם
            </h1>

            <h2 className="text-3xl md:text-4xl font-medium mb-8">
              בלי לרדוף אחרי אף אחד
            </h2>

            <p className="text-xl text-[#6b5f55] max-w-xl leading-relaxed mb-10">
              Invistimo מרכזת הזמנות דיגיטליות, אישורי הגעה
              וניהול אורחים למערכת אחת —
              רגועה, מדויקת, ומעודכנת בזמן אמת.
            </p>

            <Link
              href="/pricing"
              className="inline-block px-12 py-4 bg-[#3f3a34] text-[#faf8f4] rounded-full text-sm tracking-wide hover:opacity-90 transition"
            >
              לצפייה בחבילות
            </Link>
          </motion.div>

          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 1.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-[320px] aspect-[9/19] rounded-[42px] bg-black shadow-[0_50px_100px_rgba(0,0,0,0.35)] p-[10px]">
              <div className="w-full h-full rounded-[32px] overflow-hidden">
                <video
                  src="/videos/home1.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= בלוק 2 – הגישה שלנו ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-4xl font-semibold mb-12">
            הגישה שלנו לניהול אירועים
          </h2>

          <p className="text-xl leading-relaxed">
            אנחנו לא עובדים עם סבבי טלפונים.<br />
            לא רודפים אחרי אורחים.<br />
            ולא מבזבזים זמן וכסף מיותרים.<br /><br />
            מי שרוצה להגיע — מאשר לבד.<br />
            מי שלא — לא צריך שיציקו לו.<br /><br />
            הכול מתעדכן אוטומטית במערכת אחת ברורה.
          </p>
        </motion.div>
      </section>

      {/* ================= בלוק 3 – הכל במקום אחד ================= */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-semibold mb-10">
              כל האירוע במקום אחד
            </h2>

            <p className="text-xl mb-6">
              מרגע שליחת ההזמנה ועד יום האירוע —
              הכול מנוהל דרך מערכת אחת מסודרת:
            </p>

            <ul className="space-y-3 text-lg">
              <li>רשימת אורחים ברורה</li>
              <li>אישורי הגעה בזמן אמת</li>
              <li>נתונים מדויקים בלי ניחושים</li>
              <li>בלי הודעות מפוזרות</li>
              <li>בלי קבצים כפולים</li>
            </ul>

            <p className="mt-6 font-medium">
              שקט נפשי, במקום כאוס.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="aspect-video rounded-3xl bg-[#e9e2d8] flex items-center justify-center"
          >
            כאן נכנס וידאו / הדמיה של המערכת
          </motion.div>
        </div>
      </section>

      {/* ================= בלוק 4 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4] text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-semibold mb-10">
            פשוט, ברור, עובד
          </h2>

          <p className="text-xl leading-relaxed">
            שולחים הזמנה דיגיטלית.<br />
            האורחים מאשרים לבד.<br />
            המערכת מתעדכנת בזמן אמת.<br /><br />
            אין צורך לעקוב.<br />
            אין צורך לתזכר.<br />
            אין צורך לבדוק שוב ושוב.<br /><br />
            המערכת עובדת בשבילך.
          </p>
        </motion.div>
      </section>

      {/* ================= בלוק 5 ================= */}
      <section className="py-32 px-6 bg-white">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-4xl font-semibold mb-12">
            למה Invistimo
          </h2>

          <p className="text-xl leading-relaxed">
            Invistimo נבנתה מתוך הבנה פשוטה:
            ניהול אירוע לא אמור להיות עבודה במשרה מלאה.<br /><br />
            לא עוד קבצים מפוזרים.<br />
            לא עוד הודעות שלא חוזרים אליהן.<br />
            לא עוד לחץ מיותר לפני האירוע.<br /><br />
            אנחנו חיים בעידן שבו לא משנה באיזה גיל האורחים —
            כולם זמינים בטלפון, ב־WhatsApp או ב־SMS.<br /><br />
            מי שרוצה להגיע מאשר לבד.<br />
            אין צורך לרדוף,<br />
            ואין סיבה להוציא על זה כסף מיותר.<br /><br />
            רק מערכת אחת שעושה סדר —
            ומשאירה לך להיות באירוע עצמו.
          </p>
        </motion.div>
      </section>

      {/* ================= בלוק 6 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4] text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-semibold mb-12">
            מערכת שמתאימה למציאות של היום
          </h2>

          <p className="text-xl leading-relaxed">
            אין טלפונים חוזרים<br /><br />
            אין הודעות אבודות<br /><br />
            אין בלבול בין רשימות<br /><br />
            אין חוסר ודאות<br /><br />
            יש שליטה.<br />
            יש סדר.<br />
            ויש שקט.
          </p>
        </motion.div>
      </section>

      {/* ================= בלוק 7 ================= */}
      <section className="py-32 px-6 bg-white">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-semibold mb-12">
            מתאים לכל סוגי האירועים
          </h2>

          <div className="grid md:grid-cols-4 gap-6 text-lg">
            <div>חתונות</div>
            <div>אירועים משפחתיים</div>
            <div>בר/בת מצווה</div>
            <div>כנסים ואירועים עסקיים</div>
          </div>

          <p className="mt-8 text-lg">
            כל אירוע עם אורחים —<br />
            צריך ניהול חכם.
          </p>
        </motion.div>
      </section>

      {/* ================= בלוק 8 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-4xl font-semibold mb-12">
            פחות התעסקות, יותר נוכחות
          </h2>

          <p className="text-xl leading-relaxed">
            במקום לנהל את האירוע —<br />
            את נמצאת בו.<br /><br />
            במקום לרדוף אחרי אישורים —<br />
            את יודעת בדיוק איפה את עומדת.<br /><br />
            Invistimo מורידה ממך עומס,<br />
            ולא מוסיפה עוד מערכת להתעסק בה.
          </p>
        </motion.div>
      </section>

      {/* ================= בלוק 9 – CTA ================= */}
      <section className="py-32 px-6 bg-[#3f3a34] text-[#faf8f4] text-center relative">
        <SoftParticles />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-semibold mb-8">
            מוכנים לנהל אירוע רגוע באמת?
          </h2>

          <p className="text-lg mb-10">
            כל מה שצריך —<br />
            במקום אחד.
          </p>

          <Link
            href="/pricing"
            className="inline-block px-14 py-4 bg-[#faf8f4] text-[#3f3a34] rounded-full text-sm tracking-wide hover:opacity-90 transition"
          >
            לצפייה בחבילות
          </Link>
        </motion.div>
      </section>

    </main>
  );
}
