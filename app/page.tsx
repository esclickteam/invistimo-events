"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* אנימציות */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

/* אפקט חלקיקים רך (חגיגי, לא זיקוקים) */
function SoftParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
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
            duration: 14 + Math.random() * 6,
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

      {/* ================= בלוק 1 – HERO (תוכן חדש בלבד) ================= */}
      <section className="relative min-h-screen flex items-center px-6">
        <SoftParticles />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">
          {/* טקסט */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.9 }}
          >
            <div className="text-xs tracking-[0.4em] text-[#b29a72] mb-6">
              INVISTIMO
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-semibold leading-tight mb-8">
              ניהול אירוע חכם
            </h1>

            <h2 className="text-3xl md:text-4xl font-medium text-[#b29a72] mb-8">
              פשוט. רגוע. בשליטה.
            </h2>

            <p className="text-lg md:text-xl text-[#6b5f55] max-w-xl mb-10 leading-relaxed">
              מערכת אחת שמרכזת הזמנות דיגיטליות,
              אישורי הגעה וניהול אורחים —
              בלי עומס, בלי בלבול,
              ועם תמונת מצב ברורה בזמן אמת.
            </p>

            <Link
              href="/pricing"
              className="inline-block px-12 py-4 bg-[#3f3a34] text-[#faf8f4] rounded-full text-sm tracking-wide hover:opacity-90 transition"
            >
              לצפייה בחבילות
            </Link>
          </motion.div>

          {/* וידאו בטלפון */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-[300px] md:w-[340px] aspect-[9/19] rounded-[42px] bg-black shadow-[0_40px_90px_rgba(0,0,0,0.35)] p-[10px]">
              <div className="relative w-full h-full rounded-[32px] overflow-hidden">
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

      {/* ================= בלוק 2 – הגישה שלנו (כמו שכתבת) ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            הגישה שלנו לניהול אירועים
          </h2>

          <p className="text-xl text-[#6b5f55] leading-relaxed">
            אנחנו לא עובדים עם סבבי טלפונים.
            <br />
            לא רודפים אחרי אורחים.
            <br />
            ולא מבזבזים זמן וכסף מיותרים.
            <br /><br />
            מי שרוצה להגיע — מאשר לבד.
            <br />
            מי שלא — לא צריך שיציקו לו.
            <br /><br />
            הכול מתעדכן אוטומטית במערכת אחת ברורה.
          </p>
        </div>
      </section>

      {/* ================= בלוק 3 – הכל במקום אחד ================= */}
      <section className="py-32 px-6 bg-[#ffffff]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-semibold mb-10">
              כל האירוע במקום אחד
            </h2>

            <ul className="space-y-4 text-lg text-[#6b5f55]">
              <li>רשימת אורחים ברורה</li>
              <li>אישורי הגעה בזמן אמת</li>
              <li>נתונים מדויקים בלי ניחושים</li>
              <li>בלי הודעות מפוזרות</li>
              <li>בלי קבצים כפולים</li>
            </ul>

            <p className="mt-8 text-lg font-medium">
              שקט נפשי, במקום כאוס.
            </p>
          </div>

          <div className="relative aspect-video rounded-3xl bg-[#e9e2d8] flex items-center justify-center text-[#8c8377]">
            כאן נכנס וידאו / הדמיה של המערכת
          </div>
        </div>
      </section>

      {/* ================= בלוק 4 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4] text-center">
        <h2 className="text-4xl md:text-5xl font-semibold mb-12">
          פשוט, ברור, עובד
        </h2>

        <p className="text-xl text-[#6b5f55] leading-relaxed max-w-3xl mx-auto">
          שולחים הזמנה דיגיטלית.
          <br />
          האורחים מאשרים לבד.
          <br />
          המערכת מתעדכנת בזמן אמת.
          <br /><br />
          אין צורך לעקוב.
          <br />
          אין צורך לתזכר.
          <br />
          אין צורך לבדוק שוב ושוב.
          <br /><br />
          המערכת עובדת בשבילך.
        </p>
      </section>

      {/* ================= בלוק 5 ================= */}
      <section className="py-32 px-6 bg-[#ffffff]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            למה Invistimo
          </h2>

          <p className="text-xl text-[#6b5f55] leading-relaxed">
            Invistimo נבנתה מתוך הבנה פשוטה:
            ניהול אירוע לא אמור להיות עבודה במשרה מלאה.
            <br /><br />
            לא עוד קבצים מפוזרים.
            <br />
            לא עוד הודעות שלא חוזרים אליהן.
            <br />
            לא עוד לחץ מיותר לפני האירוע.
            <br /><br />
            רק מערכת אחת שעושה סדר —
            ומשאירה לך להיות באירוע עצמו.
          </p>
        </div>
      </section>

      {/* ================= בלוק 6 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4] text-center">
        <h2 className="text-4xl md:text-5xl font-semibold mb-12">
          מערכת שמתאימה למציאות של היום
        </h2>

        <p className="text-xl text-[#6b5f55] leading-relaxed">
          אין טלפונים חוזרים
          <br />
          אין הודעות אבודות
          <br />
          אין בלבול בין רשימות
          <br />
          אין חוסר ודאות
          <br /><br />
          יש שליטה.
          <br />
          יש סדר.
          <br />
          ויש שקט.
        </p>
      </section>

      {/* ================= בלוק 7 ================= */}
      <section className="py-32 px-6 bg-[#ffffff]">
        <h2 className="text-4xl md:text-5xl font-semibold mb-12">
          מתאים לכל סוגי האירועים
        </h2>

        <div className="grid md:grid-cols-4 gap-6 text-lg text-[#6b5f55]">
          <div>חתונות</div>
          <div>אירועים משפחתיים</div>
          <div>בר/בת מצווה</div>
          <div>כנסים ואירועים עסקיים</div>
        </div>
      </section>

      {/* ================= בלוק 8 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <h2 className="text-4xl md:text-5xl font-semibold mb-12">
          פחות התעסקות, יותר נוכחות
        </h2>

        <p className="text-xl text-[#6b5f55] leading-relaxed max-w-3xl">
          במקום לנהל את האירוע —
          את נמצאת בו.
          <br /><br />
          במקום לרדוף אחרי אישורים —
          את יודעת בדיוק איפה את עומדת.
          <br /><br />
          Invistimo מורידה ממך עומס,
          ולא מוסיפה עוד מערכת להתעסק בה.
        </p>
      </section>

      {/* ================= בלוק 9 – CTA ================= */}
      <section className="py-32 px-6 bg-[#3f3a34] text-[#faf8f4] text-center relative">
        <SoftParticles />

        <h2 className="text-4xl md:text-5xl font-semibold mb-8">
          מוכנים לנהל אירוע רגוע באמת?
        </h2>

        <p className="text-lg mb-10">
          כל מה שצריך — במקום אחד.
        </p>

        <Link
          href="/pricing"
          className="inline-block px-14 py-4 bg-[#faf8f4] text-[#3f3a34] rounded-full text-sm tracking-wide hover:opacity-90 transition"
        >
          לצפייה בחבילות
        </Link>
      </section>

    </main>
  );
}
