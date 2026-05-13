"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* =====================================================
   HERO SPARKLES
===================================================== */
function HeroSparkles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {[...Array(12)].map((_, i) => {
        const positions = [
          { left: "14%", top: "20%" },
          { left: "28%", top: "36%" },
          { left: "42%", top: "18%" },
          { left: "58%", top: "30%" },
          { left: "72%", top: "18%" },
          { left: "86%", top: "38%" },
          { left: "18%", top: "70%" },
          { left: "35%", top: "78%" },
          { left: "51%", top: "68%" },
          { left: "66%", top: "76%" },
          { left: "82%", top: "64%" },
          { left: "92%", top: "22%" },
        ];

        return (
          <motion.span
            key={i}
            className="
              absolute h-1.5 w-1.5 rounded-full
              bg-[#D3AA55]/70
              shadow-[0_0_18px_rgba(211,170,85,0.75)]
            "
            style={positions[i]}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 0.9, 0],
              scale: [0.4, 1.5, 0.4],
            }}
            transition={{
              duration: 3.2,
              delay: i * 0.35,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

/* =====================================================
   GOLD STAR DECORATION
===================================================== */
function GoldStar({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`pointer-events-none absolute ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
    >
      <div className="relative h-24 w-24 opacity-70">
        {[...Array(16)].map((_, i) => (
          <span
            key={i}
            className="
              absolute left-1/2 top-1/2
              h-[42px] w-[1.5px]
              origin-bottom
              bg-gradient-to-t from-transparent via-[#C59A45] to-transparent
            "
            style={{
              transform: `translate(-50%, -100%) rotate(${i * 22.5}deg)`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* =====================================================
   3D PHONE WITH VIDEO
===================================================== */
function HeroPhone3D() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50, rotate: -7 }}
      animate={{ opacity: 1, x: 0, rotate: -6 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className="
        relative z-10 mx-auto
        flex min-h-[520px] w-full items-center justify-center
        lg:min-h-[680px]
      "
      style={{ perspective: "1200px" }}
    >
      {/* gold arc behind phone */}
      <div
        className="
          absolute left-1/2 top-[9%]
          h-[520px] w-[520px]
          -translate-x-1/2
          rounded-full
          border border-[#C9A45C]/45
          opacity-80
          md:h-[650px] md:w-[650px]
        "
      />

      <div
        className="
          absolute left-[5%] top-[56%]
          hidden h-44 w-44 -translate-y-1/2 rounded-full
          bg-[#C9A45C]/10 blur-3xl
          lg:block
        "
      />

      <motion.div
        animate={{
          y: [0, -14, 0],
          rotateZ: [-6, -4.5, -6],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          relative
          h-[520px] w-[260px]
          rounded-[48px]
          bg-gradient-to-br from-[#0F0F0F] via-[#242424] to-[#060606]
          p-[9px]
          shadow-[0_35px_80px_rgba(37,28,17,0.34),inset_0_0_0_1px_rgba(255,255,255,0.18)]
          md:h-[620px] md:w-[310px]
          lg:h-[660px] lg:w-[330px]
        "
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(-16deg) rotateX(5deg)",
        }}
      >
        {/* side buttons */}
        <span className="absolute -left-[4px] top-[115px] h-16 w-[4px] rounded-l bg-[#111]" />
        <span className="absolute -right-[4px] top-[150px] h-24 w-[4px] rounded-r bg-[#111]" />

        {/* glass highlight */}
        <div
          className="
            pointer-events-none absolute inset-[9px] z-20
            rounded-[39px]
            bg-gradient-to-tr from-white/0 via-white/10 to-white/0
          "
        />

        {/* screen */}
        <div
          className="
            relative h-full w-full overflow-hidden
            rounded-[39px]
            bg-black
          "
        >
          {/* dynamic island */}
          <div
            className="
              absolute left-1/2 top-4 z-30
              h-[26px] w-[96px] -translate-x-1/2
              rounded-full bg-black
              shadow-[0_2px_8px_rgba(0,0,0,0.55)]
            "
          />

          <video
            src="/videos/home1.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          {/* dark luxury overlay so video blends with flowers */}
          <div
            className="
              pointer-events-none absolute inset-0
              bg-gradient-to-b from-black/20 via-transparent to-black/25
            "
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* =====================================================
   טלפון מצלצל – בלוק 2
===================================================== */
function RingingPhoneBig() {
  return (
    <div
      className="
        relative flex items-center justify-center
        min-h-0
        md:min-h-[520px]
        lg:min-h-[640px]
        scale-[1.12]
        lg:scale-[1.22]
        mt-6 md:mt-0
      "
    >
      {[...Array(2)].map((_, i) => (
        <motion.span
          key={i}
          className="
            absolute hidden md:block
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
          w-[380px]
          sm:w-[420px]
          md:w-[420px]
          lg:w-[640px]
          object-contain relative z-10
        "
      />
    </div>
  );
}

/* =====================================================
   זיקוקים אלגנטיים – BLOCK 4
===================================================== */
function SoftFireworks() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(10)].map((_, i) => {
        const positions = [
          { left: "10%", top: "20%" },
          { left: "22%", top: "68%" },
          { left: "35%", top: "30%" },
          { left: "48%", top: "74%" },
          { left: "58%", top: "20%" },
          { left: "70%", top: "60%" },
          { left: "82%", top: "26%" },
          { left: "90%", top: "72%" },
          { left: "16%", top: "84%" },
          { left: "76%", top: "84%" },
        ];

        return (
          <motion.div
            key={i}
            className="absolute"
            style={positions[i]}
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
   בלוק 3 – קרוסלת פיצ'רים
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
            key={`${item.title}-${i}`}
            className="
              w-[420px] flex-shrink-0
              rounded-[28px]
              border border-[#E5D6B8]
              bg-[#FFFDF8]
              p-5
              text-right
              shadow-[0_18px_42px_rgba(95,68,34,0.08)]
            "
          >
            <img
              src={item.image}
              alt={item.title}
              className="mb-4 h-[360px] w-full object-contain"
            />

            <h3 className="mb-2 text-lg font-extrabold text-[#3D3127]">
              {item.title}
            </h3>

            <p className="text-sm leading-relaxed text-[#6b5f55]">
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
    <main
      dir="rtl"
      className="overflow-x-hidden bg-[#F6F2EC] text-[#3F3A34]"
    >
      {/* ================= בלוק 1 – HERO WOW ================= */}
      <section
        className="
          relative min-h-screen overflow-hidden
          px-4 pt-[115px] md:px-8 lg:px-12
        "
      >
        {/* background image */}
        <div
          className="
            absolute inset-0 z-0
            bg-[url('/homep1.png')]
            bg-cover bg-center bg-no-repeat
          "
        />

        {/* soft overlay */}
        <div
          className="
            absolute inset-0 z-0
            bg-gradient-to-l
            from-[#F8F1E6]/94
            via-[#F8F1E6]/62
            to-[#F8F1E6]/18
          "
        />

        <HeroSparkles />
        <GoldStar className="right-[59%] top-[18%] hidden lg:block" />

        <div
          className="
            relative z-10 mx-auto grid min-h-[calc(100vh-115px)]
            max-w-[1500px]
            grid-cols-1 items-center gap-10
            lg:grid-cols-[0.92fr_1.08fr]
          "
        >
          {/* phone */}
          <div className="order-2 lg:order-1">
            <HeroPhone3D />
          </div>

          {/* text */}
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="
              order-1 mx-auto max-w-[780px]
              text-center lg:order-2 lg:mx-0
            "
          >
            <div
              className="
                mb-7 inline-flex items-center gap-3
                rounded-full
                border border-[#D8BE82]/70
                bg-white/55
                px-5 py-2.5
                text-[15px] font-bold
                text-[#9A6B20]
                shadow-[0_10px_28px_rgba(95,68,34,0.07)]
                backdrop-blur-xl
              "
            >
              <span className="h-px w-12 bg-gradient-to-l from-transparent via-[#C9A45C] to-transparent" />
              הדרך היוקרתית לנהל אירוע חכם
              <span className="h-px w-12 bg-gradient-to-l from-transparent via-[#C9A45C] to-transparent" />
            </div>

            <h1
              className="
                text-[48px] font-black leading-[1.05]
                tracking-[-0.04em]
                text-[#3A3028]
                md:text-[72px]
                lg:text-[86px]
              "
            >
              כל האירוע שלכם
              <br />
              <span
                className="
                  bg-gradient-to-l from-[#8B642B] via-[#C69A3F] to-[#6F4B1E]
                  bg-clip-text text-transparent
                "
              >
                במקום אחד חכם
              </span>
            </h1>

            <p
              className="
                mx-auto mt-7 max-w-[720px]
                text-[20px] font-bold leading-[1.85]
                text-[#7A6043]
                md:text-[25px]
              "
            >
              אישורי הגעה, סידורי הושבה, הודעות לאורחים וניהול מלא —
              בלי כאב ראש, בלי רדיפות ובלי בלגן.
            </p>

            <p
              className="
                mx-auto mt-5 max-w-[650px]
                text-[16px] leading-[1.9]
                text-[#5F554C]
                md:text-[18px]
              "
            >
              Invistimo מרכזת את כל מה שצריך לניהול אירוע בצורה מדויקת,
              יוקרתית ונוחה — מההזמנה הדיגיטלית ועד העדכונים בזמן אמת.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/try/dashboard"
                className="
                  group inline-flex min-w-[230px] items-center justify-center gap-3
                  rounded-full
                  bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
                  px-9 py-4
                  text-[17px] font-extrabold
                  text-white
                  shadow-[0_18px_38px_rgba(184,134,45,0.28)]
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-[0_22px_46px_rgba(184,134,45,0.36)]
                "
              >
                התחילו עכשיו
                <span className="transition group-hover:-translate-x-1">←</span>
              </Link>

              <Link
                href="/pricing"
                className="
                  inline-flex min-w-[230px] items-center justify-center
                  rounded-full
                  border border-[#8B6A3E]/60
                  bg-white/55
                  px-9 py-4
                  text-[17px] font-extrabold
                  text-[#4A3A2A]
                  shadow-[0_14px_32px_rgba(95,68,34,0.08)]
                  backdrop-blur-xl
                  transition
                  hover:bg-white
                  hover:text-[#B8862D]
                "
              >
                לצפייה בחבילות
              </Link>
            </div>

            <div
              className="
                mx-auto mt-8 flex max-w-[720px]
                flex-wrap items-center justify-center gap-3
              "
            >
              {[
                "ללא התקנה",
                "אישורי הגעה בוואטסאפ",
                "הושבה חכמה",
                "עדכונים בזמן אמת",
              ].map((item) => (
                <span
                  key={item}
                  className="
                    rounded-full
                    border border-[#E2D2B3]
                    bg-white/62
                    px-5 py-2
                    text-[14px] font-bold
                    text-[#735B3C]
                    shadow-[0_10px_24px_rgba(95,68,34,0.06)]
                    backdrop-blur-xl
                  "
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= בלוק 2 ================= */}
      <section className="bg-[#FAF8F4] px-6 py-16 md:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-24 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-extrabold tracking-[0.18em] text-[#B8862D]">
              הגישה שלנו
            </p>

            <h2 className="mb-8 text-4xl font-black leading-tight text-[#3D3127] md:text-5xl">
              ניהול אירועים רגוע,
              <br />
              מסודר ומדויק יותר
            </h2>

            <p className="text-xl leading-relaxed text-[#5F554C]">
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
      <section className="w-full overflow-hidden bg-white py-28">
        <div className="mx-auto mb-16 max-w-3xl px-6 text-center">
          <p className="mb-4 text-sm font-extrabold tracking-[0.18em] text-[#B8862D]">
            כלים חכמים לאירוע
          </p>

          <h2 className="text-4xl font-black text-[#3D3127] md:text-5xl">
            כל האירוע במקום אחד
          </h2>
        </div>

        <InfiniteCarousel items={features} />
      </section>

      {/* ================= בלוק 4 ================= */}
      <section className="relative overflow-hidden bg-[#FAF8F4] px-6 py-32 text-center">
        <SoftFireworks />

        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="text-xl leading-relaxed text-[#5F554C]">
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
      <section
        className="
          px-6 py-32 text-center text-[#FAF8F4]
          bg-gradient-to-l from-[#8B642B] via-[#C89F77] to-[#A57535]
        "
      >
        <h2 className="mb-6 text-4xl font-black md:text-5xl">
          מוכנים לנהל אירוע רגוע באמת?
        </h2>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed opacity-95">
          התחילו מדמו, ראו איך המערכת נראית מבפנים, ובחרו את החבילה שמתאימה לאירוע שלכם.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/try/dashboard"
            className="
              inline-flex min-w-[240px] items-center justify-center
              rounded-full
              bg-[#3F3A34]
              px-14 py-4
              font-extrabold
              text-[#FAF8F4]
              shadow-[0_14px_30px_rgba(0,0,0,0.18)]
              transition hover:opacity-95
            "
          >
            התחילו דמו
          </Link>

          <Link
            href="/pricing"
            className="
              inline-flex min-w-[240px] items-center justify-center
              rounded-full
              border border-[#FAF8F4]
              px-14 py-4
              font-extrabold
              text-[#FAF8F4]
              transition hover:bg-[#FAF8F4] hover:text-[#3F3A34]
            "
          >
            לצפייה בחבילות
          </Link>
        </div>

        <p className="mt-4 text-sm opacity-95">
          ללא תשלום · ללא הרשמה · נתוני דוגמה בלבד
        </p>
      </section>
    </main>
  );
}