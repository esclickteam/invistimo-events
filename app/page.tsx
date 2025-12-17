"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* ================= WOW EFFECT – זיקוקים אלגנטיים =================
   רץ כל הזמן, ברור לעין, יוקרתי (כמו עמוד תודה)
================================================================== */
function ElegantFireworks() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.4, 1.5],
          }}
          transition={{
            duration: 3,
            delay: i * 1.4,
            repeat: Infinity,
            ease: "easeOut",
          }}
        >
          {[...Array(10)].map((_, j) => (
            <motion.span
              key={j}
              className="absolute w-[2px] h-[34px]
                         bg-gradient-to-t
                         from-transparent
                         via-[#cbb38a]
                         to-transparent"
              style={{
                transform: `rotate(${j * 36}deg) translateY(-50px)`,
              }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 3,
                delay: i * 1.4,
                repeat: Infinity,
              }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative bg-[#f6f2ec] text-[#3f3a34] overflow-x-hidden">
      {/* אפקט WOW קבוע לכל העמוד */}
      <ElegantFireworks />

      {/* ================= בלוק 1 – HERO ================= */}
      <section className="relative min-h-screen flex items-center px-6 z-10">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">

          {/* טקסט – כניסה אחת */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
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

          {/* טלפון – תנועה עדינה קבועה */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex justify-center lg:justify-end"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative w-[320px] aspect-[9/19]
                         rounded-[42px] bg-black
                         shadow-[0_50px_100px_rgba(0,0,0,0.35)]
                         p-[10px]"
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
      <section className="py-32 px-6 bg-[#faf8f4] relative z-10">
        <div className="max-w-5xl mx-auto">
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
        </div>
      </section>

      {/* ================= בלוק 3 ================= */}
      <section className="py-32 px-6 bg-white relative z-10">
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
      <section className="py-32 px-6 bg-[#faf8f4] text-center relative z-10">
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
      <section className="py-32 px-6 bg-white relative z-10">
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
            אנחנו חיים בעידן שבו לא משנה באיזה גיל האורחים —
            כולם זמינים בטלפון, ב־WhatsApp או ב־SMS.<br /><br />
            מי שרוצה להגיע מאשר לבד.<br />
            אין צורך לרדוף,<br />
            ואין סיבה להוציא על זה כסף מיותר.<br /><br />
            רק מערכת אחת שעושה סדר —
            ומשאירה לך להיות באירוע עצמו.
          </p>
        </div>
      </section>

      {/* ================= בלוק 9 – CTA ================= */}
      <section className="py-32 px-6 bg-[#3f3a34] text-[#faf8f4] text-center relative z-10">
        <h2 className="text-4xl font-semibold mb-8">
          מוכנים לנהל אירוע רגוע באמת?
        </h2>

        <p className="text-lg mb-10">
          כל מה שצריך —<br />
          במקום אחד.
        </p>

        <Link
          href="/pricing"
          className="inline-block px-14 py-4 bg-[#faf8f4] text-[#3f3a34]
                     rounded-full text-sm tracking-wide
                     hover:opacity-90 transition"
        >
          לצפייה בחבילות
        </Link>
      </section>
    </main>
  );
}
