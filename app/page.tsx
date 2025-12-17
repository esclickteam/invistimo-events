"use client";

import {
  motion,
  useMotionValue,
  useAnimationFrame,
} from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { useEffect } from "react";


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
    <div className="relative flex items-center justify-center">
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
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const halfWidth = ref.current.scrollWidth / 2;
    // נתחיל בדיוק מההתחלה
    x.set(0);
  }, []);

  useAnimationFrame((_, delta) => {
    if (!ref.current) return;

    const speed = 40; // מהירות אחידה
    const moveBy = (delta / 1000) * speed;
    const totalWidth = ref.current.scrollWidth / 2;

    let next = x.get() - moveBy;

    // ברגע שכל התוכן הוזז חצי מרוחבו – מאפס
    if (Math.abs(next) >= totalWidth) {
      next = 0;
    }

    x.set(next);
  });

  return (
    <div className="overflow-hidden w-full relative">
      <motion.div
        ref={ref}
        className="flex gap-6 flex-nowrap will-change-transform"
        style={{ x }}
      >
        {/* שכפול כפול – כדי לוודא רציפות */}
        {[...items, ...items].map((item, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 6 + (i % 4),
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-[420px] flex-shrink-0 bg-[#faf8f4] rounded-[24px] border border-[#e5ddd2] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)] flex flex-col"
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
          </motion.div>
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
              Invistimo מרכזת הזמנות דיגיטליות, אישורי הגעה
              וניהול אורחים למערכת אחת — רגועה, מדויקת ומעודכנת בזמן אמת.
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

{/* ================= בלוק 3 – קרוסלת פיצ'רים ================= */}
<section className="py-28 bg-white overflow-hidden w-full">
  <h2 className="text-4xl font-semibold text-center mb-20">
    כל האירוע במקום אחד
  </h2>

  <InfiniteCarousel items={features} />
</section>




{/* ================= בלוק 4 ================= */}
<section className="relative py-32 px-6 bg-[#faf8f4] overflow-hidden text-center">

  {/* אפקט זיקוקים – כמו בלוק 1 */}
  <SoftFireworks />

  {/* תוכן */}
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
      <section className="py-32 px-6 bg-[#3f3a34] text-[#faf8f4] text-center">
        <h2 className="text-4xl font-semibold mb-8">
          מוכנים לנהל אירוע רגוע באמת?
        </h2>

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
