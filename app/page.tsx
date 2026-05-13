"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* =====================================================
   HERO PHONE — REAL 3D VIDEO PHONE
===================================================== */
function HeroPhone3D() {
  return (
    <div
      className="
        relative z-10
        flex w-full items-center justify-center
        min-h-[500px]
        lg:min-h-[680px]
      "
      style={{ perspective: "1800px" }}
    >
      {/* צל רך מתחת לטלפון בלבד */}
      <div
        className="
          pointer-events-none absolute
          bottom-[48px] left-1/2
          h-[42px] w-[300px]
          -translate-x-1/2
          rounded-full
          bg-black/18
          blur-2xl
          md:w-[390px]
        "
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{
          opacity: 1,
          y: [0, -10, 0],
        }}
        transition={{
          opacity: { duration: 0.8 },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="
          relative
          h-[500px] w-[248px]
          md:h-[600px] md:w-[300px]
          lg:h-[660px] lg:w-[330px]
        "
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(18deg) rotateX(7deg) rotateZ(-7deg)",
        }}
      >
        {/* גוף אחורי — יוצר עומק תלת מימדי */}
        <div
          className="
            absolute inset-0
            rounded-[52px]
            bg-gradient-to-br from-[#050505] via-[#1E1E1E] to-[#050505]
            shadow-[42px_44px_90px_rgba(37,28,17,0.34),-18px_18px_50px_rgba(201,164,92,0.13)]
          "
          style={{
            transform: "translateZ(-18px) translateX(-12px)",
          }}
        />

        {/* עובי צד שמאל */}
        <div
          className="
            absolute -left-[15px] top-[34px]
            h-[90%] w-[22px]
            rounded-l-[40px]
            bg-gradient-to-b from-[#303030] via-[#080808] to-[#1A1A1A]
            shadow-[inset_5px_0_12px_rgba(255,255,255,0.09)]
          "
          style={{
            transform: "translateZ(-9px)",
          }}
        />

        {/* מסגרת קדמית */}
        <div
          className="
            absolute inset-0
            rounded-[52px]
            bg-gradient-to-br from-[#080808] via-[#2A2A2A] to-[#050505]
            p-[9px]
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]
          "
          style={{
            transform: "translateZ(18px)",
          }}
        >
          {/* כפתורי צד */}
          <span className="absolute -left-[5px] top-[130px] h-16 w-[4px] rounded-l bg-[#111]" />
          <span className="absolute -left-[5px] top-[210px] h-12 w-[4px] rounded-l bg-[#111]" />
          <span className="absolute -right-[4px] top-[170px] h-24 w-[4px] rounded-r bg-[#111]" />

          {/* מסך */}
          <div
            className="
              relative h-full w-full
              overflow-hidden
              rounded-[42px]
              bg-black
            "
          >
            {/* Dynamic Island */}
            <div
              className="
                absolute left-1/2 top-4 z-40
                h-[26px] w-[100px]
                -translate-x-1/2
                rounded-full
                bg-black
                shadow-[0_2px_8px_rgba(0,0,0,0.65)]
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

            {/* זכוכית/הברקה */}
            <div
              className="
                pointer-events-none absolute inset-0
                bg-gradient-to-br
                from-white/12
                via-transparent
                to-black/24
              "
            />

            <div
              className="
                pointer-events-none absolute inset-0
                rounded-[42px]
                border border-white/10
              "
            />
          </div>
        </div>
      </motion.div>
    </div>
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
   זיקוקים אלגנטיים – BLOCK 4 בלבד
===================================================== */
function SoftFireworks() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(8)].map((_, i) => {
        const positions = [
          { left: "10%", top: "20%" },
          { left: "22%", top: "68%" },
          { left: "38%", top: "30%" },
          { left: "52%", top: "74%" },
          { left: "64%", top: "22%" },
          { left: "74%", top: "60%" },
          { left: "84%", top: "28%" },
          { left: "90%", top: "72%" },
        ];

        return (
          <motion.div
            key={i}
            className="absolute"
            style={positions[i]}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 0.35, 0],
              scale: [0.6, 1.35],
            }}
            transition={{
              duration: 4.8,
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
    <main className="overflow-x-hidden bg-[#F6F2EC] text-[#3F3A34]">
      {/* ================= HERO ================= */}
      <section
        className="
          relative min-h-screen overflow-hidden
          px-4 pt-[115px] md:px-8 lg:px-12
        "
      >
        {/* הרקע שהעלית */}
        <div
          className="
            absolute inset-0 z-0
            bg-[url('/homep1.png')]
            bg-cover bg-center bg-no-repeat
          "
        />

        {/* שכבת ריכוך עדינה בלבד */}
        <div
          className="
            absolute inset-0 z-0
            bg-gradient-to-r
            from-[#F8F1E6]/20
            via-[#F8F1E6]/34
            to-[#F8F1E6]/78
          "
        />

        {/* 
          חשוב:
          כאן בכוונה dir="ltr" כדי למנוע היפוך צדדים בגלל RTL.
          עמודה שמאלית = טלפון.
          עמודה ימנית = תוכן.
        */}
        <div
          dir="ltr"
          className="
            relative z-10 mx-auto grid min-h-[calc(100vh-115px)]
            max-w-[1500px]
            grid-cols-1 items-center gap-10
            lg:grid-cols-[0.95fr_1.05fr]
          "
        >
          {/* טלפון — צד שמאל בדסקטופ */}
          <div className="order-2 lg:order-1 lg:col-start-1">
            <HeroPhone3D />
          </div>

          {/* תוכן — צד ימין בדסקטופ */}
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="
              order-1
              mx-auto max-w-[710px]
              text-center
              lg:order-2
              lg:col-start-2
              lg:mx-0
              lg:text-right
            "
          >
            <div
              className="
                mb-6 inline-flex items-center gap-3
                rounded-full
                border border-[#D8BE82]/70
                bg-white/58
                px-5 py-2.5
                text-[14px] font-extrabold
                text-[#9A6B20]
                shadow-[0_10px_28px_rgba(95,68,34,0.06)]
                backdrop-blur-xl
              "
            >
              <span className="h-px w-10 bg-gradient-to-l from-transparent via-[#C9A45C] to-transparent" />
              הדרך הקלה לסגור את כל פרטי האירוע
              <span className="h-px w-10 bg-gradient-to-l from-transparent via-[#C9A45C] to-transparent" />
            </div>

            <h1
              className="
                text-[42px] font-black leading-[1.08]
                tracking-[-0.04em]
                text-[#3A3028]
                md:text-[64px]
                lg:text-[76px]
              "
            >
              האירוע שלך
              <br />
              מסודר, ברור
              <br />
              <span
                className="
                  bg-gradient-to-l from-[#8B642B] via-[#C69A3F] to-[#6F4B1E]
                  bg-clip-text text-transparent
                "
              >
                ונראה וואו.
              </span>
            </h1>

            <p
              className="
                mt-7 max-w-[660px]
                text-[19px] font-bold leading-[1.85]
                text-[#715A3E]
                md:text-[23px]
              "
            >
              הזמנות דיגיטליות, אישורי הגעה, הושבה והודעות לאורחים —
              הכל במקום אחד, בלי לרדוף אחרי אף אחד.
            </p>

            <p
              className="
                mt-4 max-w-[620px]
                text-[16px] leading-[1.9]
                text-[#5F554C]
                md:text-[18px]
              "
            >
              Invistimo נותנת לך חוויית ניהול נקייה, יוקרתית ונוחה:
              שולחים הזמנה, האורחים מאשרים, והמערכת מעדכנת הכל בזמן אמת.
            </p>

            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/try/dashboard"
                className="
                  group inline-flex min-w-[220px] items-center justify-center gap-3
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
                להתחיל דמו
                <span className="transition group-hover:-translate-x-1">
                  ←
                </span>
              </Link>

              <Link
                href="/pricing"
                className="
                  inline-flex min-w-[220px] items-center justify-center
                  rounded-full
                  border border-[#8B6A3E]/60
                  bg-white/60
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
                לראות חבילות
              </Link>
            </div>

            <div
              className="
                mt-8 flex max-w-[720px]
                flex-wrap items-center justify-center gap-3
                lg:justify-start
              "
            >
              {[
                "בלי התקנה",
                "אישורי הגעה בוואטסאפ",
                "הושבה חכמה",
                "עדכונים בזמן אמת",
              ].map((item) => (
                <span
                  key={item}
                  className="
                    rounded-full
                    border border-[#E2D2B3]
                    bg-white/64
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
      <section className="bg-[#FAF8F4] px-6 py-16 md:py-32" dir="rtl">
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
      <section className="w-full overflow-hidden bg-white py-28" dir="rtl">
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
      <section
        className="relative overflow-hidden bg-[#FAF8F4] px-6 py-32 text-center"
        dir="rtl"
      >
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
        dir="rtl"
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