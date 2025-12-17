"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* אנימציות בסיס */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

/* אפקט חלקיקים רכים (במקום זיקוקים) */
function SoftParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            duration: 12 + Math.random() * 8,
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
          {/* טקסט */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.9 }}
          >
            <div className="text-xs tracking-[0.4em] text-[#b29a72] mb-6">
              INVISTIMO
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-semibold leading-tight mb-8">
              ניהול אירוע
              <br />
              <span className="text-[#b29a72]">חכם ומסודר</span>
            </h1>

            <p className="text-lg md:text-xl text-[#6b5f55] max-w-xl mb-10 leading-relaxed">
              Invistimo מרכזת הזמנות דיגיטליות,
              אישורי הגעה וניהול אורחים —
              למערכת אחת רגועה, מדויקת
              ומעודכנת בזמן אמת.
            </p>

            <Link
              href="/pricing"
              className="inline-block px-12 py-4 bg-[#3f3a34] text-[#faf8f4] rounded-full text-sm tracking-wide hover:opacity-90 transition"
            >
              לצפייה בחבילות
            </Link>
          </motion.div>

          {/* וידאו */}
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

      {/* ================= בלוק 2 – הגישה שלנו ================= */}
      <section className="py-32 px-6 bg-[#faf8f4] relative">
        <SoftParticles />

        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-semibold mb-12"
          >
            הגישה שלנו לניהול אירועים
          </motion.h2>

          <p className="text-xl text-[#6b5f55] leading-relaxed">
            ניהול אירוע צריך להיות ברור,
            צפוי ומבוסס מערכת —
            לא רצף של אילתורים.
            <br /><br />
            Invistimo מאפשרת לאורחים לפעול עצמאית,
            ולך לקבל תמונת מצב אחת,
            מסודרת ומעודכנת.
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
              <li>רשימת אורחים ברורה ומעודכנת</li>
              <li>אישורי הגעה בזמן אמת</li>
              <li>נתונים מדויקים בלי ניחושים</li>
              <li>בלי הודעות מפוזרות</li>
              <li>בלי קבצים כפולים</li>
            </ul>

            <p className="mt-8 text-lg font-medium">
              שקט נפשי, במקום כאוס.
            </p>
          </div>

          {/* Placeholder לווידאו / הדמיה */}
          <div className="relative aspect-video rounded-3xl bg-[#e9e2d8] flex items-center justify-center text-[#8c8377]">
            כאן תיכנס הדמיית מערכת / וידאו
          </div>
        </div>
      </section>

      {/* ================= בלוק 4 – איך זה עובד ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            פשוט. ברור. עובד.
          </h2>

          <p className="text-xl text-[#6b5f55] leading-relaxed max-w-3xl mx-auto">
            שולחים הזמנה דיגיטלית.
            האורחים מאשרים לבד.
            המערכת מתעדכנת בזמן אמת.
            <br /><br />
            בלי צורך לעקוב.
            בלי לבדוק שוב.
            בלי לנהל ידנית.
          </p>
        </div>
      </section>

      {/* ================= בלוק 5 – למה Invistimo ================= */}
      <section className="py-32 px-6 bg-[#ffffff]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            למה Invistimo
          </h2>

          <p className="text-xl text-[#6b5f55] leading-relaxed">
            ניהול אירוע לא אמור להיות עבודה במשרה מלאה.
            <br /><br />
            Invistimo נבנתה כדי לצמצם עומס,
            להוריד רעש,
            ולאפשר לך להיות נוכחת —
            לא מנהלת תפעול.
          </p>
        </div>
      </section>

      {/* ================= בלוק 6 – למה זה עובד ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            מערכת שמתאימה למציאות של היום
          </h2>

          <div className="grid md:grid-cols-2 gap-8 text-lg text-[#6b5f55]">
            <div>אין הודעות אבודות</div>
            <div>אין בלבול בין רשימות</div>
            <div>אין חוסר ודאות</div>
            <div>יש שליטה. יש סדר. יש שקט.</div>
          </div>
        </div>
      </section>

      {/* ================= בלוק 7 – למי זה מתאים ================= */}
      <section className="py-32 px-6 bg-[#ffffff]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            מתאים לכל סוגי האירועים
          </h2>

          <div className="grid md:grid-cols-4 gap-6 text-lg text-[#6b5f55]">
            <div>חתונות</div>
            <div>אירועים משפחתיים</div>
            <div>בר / בת מצווה</div>
            <div>אירועים עסקיים</div>
          </div>
        </div>
      </section>

      {/* ================= בלוק 8 – פחות התעסקות ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-12">
            פחות התעסקות, יותר נוכחות
          </h2>

          <p className="text-xl text-[#6b5f55] leading-relaxed">
            במקום לנהל את האירוע —
            את נמצאת בו.
            <br /><br />
            Invistimo מורידה עומס,
            ולא מוסיפה עוד מערכת להתעסק בה.
          </p>
        </div>
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
