"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* ================= אפקט WOW – כמה זיקוקי אור מפוזרים ================= */
function SparklesLayer({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = 28 + Math.random() * 20;

        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.15, 0.8],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              delay: Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {[...Array(8)].map((_, j) => (
              <span
                key={j}
                className="
                  absolute left-1/2 top-1/2
                  w-[2px] h-[16px]
                  bg-gradient-to-t
                  from-transparent
                  via-[#cbb38a]
                  to-transparent
                "
                style={{
                  transform: `rotate(${j * 45}deg) translateY(-10px)`,
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

export default function HomePage() {
  return (
    <main className="relative bg-[#f6f2ec] text-[#3f3a34] overflow-x-hidden">

      {/* ================= בלוק 1 – HERO ================= */}
      <section className="relative min-h-screen flex items-center px-6 overflow-hidden">
        <SparklesLayer count={7} />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-6xl font-semibold mb-6">
              ניהול אירוע חכם
            </h1>

            <h2 className="text-3xl md:text-4xl font-medium mb-8">
              בלי לרדוף אחרי אף אחד
            </h2>

            <p className="text-xl text-[#6b5f55] max-w-xl mb-10">
              Invistimo מרכזת הזמנות דיגיטליות, אישורי הגעה
              וניהול אורחים למערכת אחת —
              רגועה, מדויקת, ומעודכנת בזמן אמת.
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
              className="relative w-[320px] aspect-[9/19] rounded-[42px] bg-black p-[10px] shadow-xl"
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
      <section className="relative py-32 px-6 bg-[#faf8f4] overflow-hidden">
        <SparklesLayer count={5} />

        <div className="relative z-10 max-w-5xl mx-auto">
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
      <section className="relative py-32 px-6 bg-white overflow-hidden">
        <SparklesLayer count={4} />

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
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

      {/* ================= CTA ================= */}
      <section className="relative py-32 px-6 bg-[#3f3a34] text-[#faf8f4] text-center overflow-hidden">
        <SparklesLayer count={6} />

        <div className="relative z-10">
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
        </div>
      </section>

    </main>
  );
}
