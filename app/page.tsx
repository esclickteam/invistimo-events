"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* =====================================================
   זיקוקים אלגנטיים – ONLY HERO (לא לגעת)
===================================================== */
function HeroFireworks() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(14)].map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 0.55, 0],
              scale: [0.5, 1.6],
            }}
            transition={{
              duration: 3.2,
              delay: i * 0.6,
              repeat: Infinity,
              ease: "easeOut",
            }}
          >
            {[...Array(14)].map((_, j) => (
              <span
                key={j}
                className="
                  absolute left-1/2 top-1/2
                  w-[3px] h-[46px]
                  bg-gradient-to-t
                  from-transparent
                  via-[#cbb38a]
                  to-transparent
                "
                style={{
                  transform: `rotate(${j * 26}deg) translateY(-30px)`,
                  transformOrigin: "center",
                }}
              />
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}

/* =====================================================
   טלפון מצלצל – תמונה גדולה בצד ימין (בלוק 2)
===================================================== */
function RingingPhoneBig() {
  return (
    <div className="relative flex items-center justify-center">
      {/* גלי צלצול */}
      {[...Array(2)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute w-[280px] h-[280px] rounded-full border border-[#cbb38a]/25"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{
            duration: 2.6,
            delay: i * 1.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* תמונת טלפון */}
      <motion.img
        src="/home2.png"
        alt="Incoming call"
        animate={{ rotate: [0, -4, 4, -4, 0] }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-[200px] md:w-[240px] object-contain relative z-10"
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="bg-[#f6f2ec] text-[#3f3a34] overflow-x-hidden">

      {/* ================= בלוק 1 – HERO ================= */}
      <section className="relative min-h-screen flex items-center px-6 overflow-hidden">
        <HeroFireworks />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-5xl md:text-6xl font-semibold mb-6">
              ניהול אירוע חכם
            </h1>

            <h2 className="text-3xl md:text-4xl mb-8">
              בלי לרדוף אחרי אף אחד
            </h2>

            <p className="text-xl text-[#6b5f55] max-w-xl mb-10">
              Invistimo מרכזת הזמנות דיגיטליות, אישורי הגעה
              וניהול אורחים למערכת אחת —
              רגועה, מדויקת ומעודכנת בזמן אמת.
            </p>

            <Link
              href="/pricing"
              className="inline-block px-12 py-4 bg-[#3f3a34] text-[#faf8f4] rounded-full"
            >
              לצפייה בחבילות
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            className="flex justify-center lg:justify-end"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="w-[320px] aspect-[9/19] rounded-[42px] bg-black p-[10px] shadow-2xl"
            >
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= בלוק 2 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-4xl font-semibold mb-12">
              הגישה שלנו לניהול אירועים
            </h2>

            <p className="text-xl leading-relaxed">
              אנחנו לא עובדים עם סבבי טלפונים.<br />
              לא רודפים אחרי אורחים.<br />
              ולא מבזבזים לכם זמן וכסף מיותרים.<br /><br />
              מי שרוצה להגיע — מאשר לבד.<br />
              מי שלא — לא צריך שיציקו לו.<br /><br />
              הכול מתעדכן אוטומטית במערכת אחת ברורה.
            </p>
          </div>

          <RingingPhoneBig />
        </div>
      </section>

      {/* ================= בלוק 3 ================= */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div>
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
          </div>

          <div className="aspect-video rounded-3xl bg-[#e9e2d8] flex items-center justify-center">
            כאן נכנס וידאו / הדמיה של המערכת
          </div>
        </div>
      </section>

      {/* ================= בלוק 4 ================= */}
      <section className="py-32 px-6 bg-[#faf8f4] text-center">
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
      </section>

      {/* ================= בלוק 5 ================= */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-semibold mb-12">
            למה Invistimo
          </h2>

          <p className="text-xl leading-relaxed">
            Invistimo נבנתה מתוך הבנה פשוטה:
            ניהול אירוע לא אמור להיות עבודה במשרה מלאה.<br /><br />
            לא עוד קבצים מפוזרים.<br />
            לא עוד הודעות שלא חוזרים אליהן.<br />
            לא עוד לחץ מיותר לפני האירוע.<br /><br />
            מי שרוצה להגיע מאשר לבד —
            ואין סיבה להוציא על זה כסף מיותר.<br /><br />
            רק מערכת אחת שעושה סדר —
            ומשאירה לך להיות באירוע עצמו.
          </p>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-32 px-6 bg-[#3f3a34] text-[#faf8f4] text-center">
        <h2 className="text-4xl font-semibold mb-8">
          מוכנים לנהל אירוע רגוע באמת?
        </h2>

        <p className="text-lg mb-10">
          כל מה שצריך —<br />
          במקום אחד.
        </p>

        <Link
          href="/pricing"
          className="inline-block px-14 py-4 bg-[#faf8f4] text-[#3f3a34] rounded-full"
        >
          לצפייה בחבילות
        </Link>
      </section>
    </main>
  );
}
