"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
                className="absolute left-1/2 top-1/2 w-[3px] h-[46px]
                           bg-gradient-to-t from-transparent via-[#cbb38a] to-transparent"
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
   טלפון מצלצל – בלוק 2 (לא לגעת)
===================================================== */
function RingingPhoneBig() {
  return (
    <div
      className="
        relative flex items-center justify-center
        min-h-0
        md:min-h-[520px]
        lg:min-h-[640px]
        scale-[1]
        md:scale-[1.25]
        lg:scale-[1.35]
        mt-6 md:mt-0
      "
    >
      {[...Array(2)].map((_, i) => (
        <motion.span
          key={i}
          className="
            absolute
            hidden md:block
            w-[520px] h-[520px]
            rounded-full border border-[#cbb38a]/25
          "
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{
            duration: 3.4,
            delay: i * 1.7,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      <motion.img
        src="/home2.png"
        alt="RSVP system illustration"
        animate={{
          y: [0, -8, 0],
          scale: [1, 1.015, 1],
        }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          w-[240px]
          sm:w-[280px]
          md:w-[420px]
          lg:w-[640px]
          object-contain relative z-10
        "
      />
    </div>
  );
}




/* =====================================================
   זיקוקים אלגנטיים – BLOCK 4 (כמו HERO אבל עדין יותר)
===================================================== */
function SoftFireworks() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(10)].map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 0.4, 0],
              scale: [0.6, 1.4],
            }}
            transition={{
              duration: 4.5,
              delay: i * 0.8,
              repeat: Infinity,
              ease: "easeOut",
            }}
          >
            {[...Array(12)].map((_, j) => (
              <span
                key={j}
                className="
                  absolute left-1/2 top-1/2
                  w-[2px] h-[42px]
                  bg-gradient-to-t
                  from-transparent
                  via-[#cbb38a]
                  to-transparent
                "
                style={{
                  transform: `rotate(${j * 30}deg) translateY(-28px)`,
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
   בלוק 3 – קרוסלת פיצ'רים (RTL, איטית, תמונות גדולות)
===================================================== */
const features = [
  {
    title: "עיצוב הזמנה",
    text: "עורך הזמנות מובנה לעיצוב הזמנה אישית או העלאת הזמנה שכבר עיצבתם.",
    image: "/home3.png",
  },
  {
    title: "שליחת הזמנה ואישורי הגעה",
    text: "שליחה לכל אורח עם קישור אישי, אישורי הגעה שמתעדכנים בזמן אמת בדשבורד.",
    image: "/home4.png",
  },
  {
    title: "סידורי הושבה",
    text: "בניית סידורי הושבה, שיוך אורחים לשולחנות ושליחת מספר שולחן אוטומטית.",
    image: "/home5.png",
  },
  {
    title: "שליחת הודעות",
    text: "הודעות לאישור הגעה, מספר שולחן והודעות אישיות – הכול מהמערכת.",
    image: "/home6.png",
  },
];

type FeatureItem = {
  title: string;
  text: string;
  image: string;
};

function InfiniteCarousel({ items }: { items: FeatureItem[] }) {
  const totalItems = [...items, ...items];

  return (
    <div dir="rtl" className="relative w-full overflow-hidden">
      <motion.div
        className="flex gap-6 flex-nowrap"
        animate={{ x: ["0%", "50%"] }}
        transition={{
          duration: 50,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{ width: "max-content" }}
      >
        {totalItems.map((item, i) => (
          <div
            key={i}
            className="w-[420px] flex-shrink-0 bg-[#faf8f4] rounded-[24px] border border-[#e5ddd2] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)] flex flex-col text-right"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-[360px] object-contain mb-4"
            />
            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-[#6b5f55] leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </motion.div>
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
              Invistimo מרכזת הזמנות דיגיטליות, אישורי הגעה וניהול אורחים למערכת
              אחת — רגועה, מדויקת ומעודכנת בזמן אמת.
            </p>

            {/* ✅ UX CTA – הדמו הוא ראשי, חבילות משני */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* כפתור ראשי: דמו */}
              <div className="flex flex-col">
                <Link
                  href="/try/dashboard"
                  className="
                    inline-flex items-center justify-center
                    px-12 py-4 rounded-full
                    bg-[#3f3a34] text-[#faf8f4]
                    shadow-[0_14px_30px_rgba(63,58,52,0.22)]
                    hover:opacity-95 transition
                    focus:outline-none focus:ring-2 focus:ring-[#cbb38a]/60 focus:ring-offset-2 focus:ring-offset-[#f6f2ec]
                  "
                >
                   התחילו דמו (צפייה בלבד)
                </Link>

                <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#6b5f55]">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e5ddd2] bg-[#faf8f4]/70">
                    ללא תשלום
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e5ddd2] bg-[#faf8f4]/70">
                    ללא הרשמה
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e5ddd2] bg-[#faf8f4]/70">
                    נתוני דוגמה בלבד
                  </span>
                </div>
              </div>

              {/* כפתור משני: חבילות */}
              <Link
                href="/pricing"
                className="
                  inline-flex items-center justify-center
                  px-12 py-4 rounded-full
                  border border-[#3f3a34] text-[#3f3a34]
                  hover:bg-[#3f3a34] hover:text-[#faf8f4] transition
                  focus:outline-none focus:ring-2 focus:ring-[#cbb38a]/60 focus:ring-offset-2 focus:ring-offset-[#f6f2ec]
                "
              >
                לצפייה בחבילות
              </Link>
            </div>

            {/* ✅ שורת מיקרו-קופי שמיישרת ציפיות */}
            <p className="text-sm text-[#6b5f55] mt-6 max-w-xl leading-relaxed">
              במצב דמו אפשר לצפות בדשבורד, סידורי הושבה והודעות עם נתונים לדוגמה.
              כדי לשמור, לשלוח ולהוסיף אורחים — מצטרפים לחבילה.
            </p>
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
      <section className="py-16 md:py-32 px-6 bg-[#faf8f4]">

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-4xl font-semibold mb-12">
             הגישה שלנו לניהול אירועים
</h2>

<p className="text-xl leading-relaxed">
  אישורי ההגעה מתבצעים בצורה דיגיטלית, פשוטה ואוטומטית.
  <br />
  האורחים מאשרים בעצמם — בלי רדיפות ובלי בזבוז זמן.
  <br />
  <br />
  מי שמעדיף לאשר לבד — עושה זאת דיגיטלית.
  <br />
  אורחים שלא אישרו?
  <br />
  ניתן להוסיף שירות אישורי הגעה בטלפון.
  <br />
  <br />
  הכול מתעדכן אוטומטית במערכת אחת ברורה.
</p>
          </div>

          <RingingPhoneBig />
        </div>
      </section>

      {/* ================= בלוק 3 – קרוסלת פיצ'רים ================= */}
      <section className="py-28 bg-white overflow-hidden w-full">
        <h2 className="text-4xl font-semibold text-center mb-20">
          כל האירוע במקום אחד
        </h2>

        <InfiniteCarousel items={features} />
      </section>

      {/* ================= בלוק 4 ================= */}
      <section className="relative py-32 px-6 bg-[#faf8f4] overflow-hidden text-center">
        <SoftFireworks />

        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-xl leading-relaxed text-[#5f554c]">
            בסופו של דבר, ניהול אירוע הוא הרבה החלטות קטנות.
            <br />
            כשכל המידע מרוכז במקום אחד, קל יותר לקבל אותן.
            <br />
            Invistimo נותנת לכם כלי מסודר, ברור ונוח —
            <br />
            כדי שתוכלו לנהל את האירוע בדרך שלכם, בלי רעשי רקע.
          </p>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-32 px-6 bg-[#C89F77] text-[#faf8f4] text-center">
        <h2 className="text-4xl font-semibold mb-10">
          מוכנים לנהל אירוע רגוע באמת?
        </h2>

        {/* ✅ גם כאן: דמו ראשי */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/try/dashboard"
            className="
              inline-flex items-center justify-center
              px-14 py-4 rounded-full
              bg-[#3f3a34] text-[#faf8f4]
              shadow-[0_14px_30px_rgba(0,0,0,0.18)]
              hover:opacity-95 transition
              focus:outline-none focus:ring-2 focus:ring-[#faf8f4]/60 focus:ring-offset-2 focus:ring-offset-[#C89F77]
            "
          >
             התחילו דמו (צפייה בלבד)
          </Link>

          <Link
            href="/pricing"
            className="
              inline-flex items-center justify-center
              px-14 py-4 rounded-full
              border border-[#faf8f4] text-[#faf8f4]
              hover:bg-[#faf8f4] hover:text-[#3f3a34] transition
              focus:outline-none focus:ring-2 focus:ring-[#faf8f4]/60 focus:ring-offset-2 focus:ring-offset-[#C89F77]
            "
          >
            לצפייה בחבילות
          </Link>
        </div>

        <p className="text-sm mt-4 opacity-95">
          ללא תשלום · ללא הרשמה · נתוני דוגמה בלבד
        </p>
      </section>
    </main>
  );
}
