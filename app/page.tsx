"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Armchair,
  MessageCircle,
  Mail,
  CalendarDays,
  Send,
  ArrowLeft,
} from "lucide-react";

/* =====================================================
   HERO PHONE — CLEAN 3D VIDEO PHONE
===================================================== */
function HeroPhone3D() {
  return (
    <div
      className="
        relative z-10
        flex w-full items-center justify-center
        min-h-[460px]
        md:min-h-[540px]
        lg:min-h-[600px]
        lg:-translate-y-8
      "
      style={{ perspective: "1800px" }}
    >
      <div
        className="
          pointer-events-none absolute
          bottom-[22px] left-1/2
          h-[36px] w-[290px]
          -translate-x-1/2
          rounded-full
          bg-black/14
          blur-2xl
          md:w-[360px]
        "
      />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{
          opacity: 1,
          y: [0, -8, 0],
        }}
        transition={{
          opacity: { duration: 0.8 },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="
          relative
          h-[485px] w-[242px]
          md:h-[570px] md:w-[285px]
          lg:h-[610px] lg:w-[305px]
        "
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(20deg) rotateX(6deg) rotateZ(-6deg)",
        }}
      >
        <div
          className="
            absolute inset-0
            rounded-[52px]
            bg-gradient-to-br from-[#050505] via-[#202020] to-[#050505]
            shadow-[38px_42px_85px_rgba(37,28,17,0.30),-16px_18px_45px_rgba(201,164,92,0.12)]
          "
          style={{
            transform: "translateZ(-18px) translateX(-11px)",
          }}
        />

        <div
          className="
            absolute -left-[14px] top-[34px]
            h-[90%] w-[21px]
            rounded-l-[40px]
            bg-gradient-to-b from-[#303030] via-[#080808] to-[#1A1A1A]
            shadow-[inset_5px_0_12px_rgba(255,255,255,0.08)]
          "
          style={{
            transform: "translateZ(-8px)",
          }}
        />

        <div
          className="
            absolute inset-0
            rounded-[52px]
            bg-gradient-to-br from-[#080808] via-[#282828] to-[#050505]
            p-[9px]
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]
          "
          style={{
            transform: "translateZ(18px)",
          }}
        >
          <span className="absolute -left-[5px] top-[130px] h-16 w-[4px] rounded-l bg-[#111]" />
          <span className="absolute -left-[5px] top-[210px] h-12 w-[4px] rounded-l bg-[#111]" />
          <span className="absolute -right-[4px] top-[170px] h-24 w-[4px] rounded-r bg-[#111]" />

          <div
            className="
              relative h-full w-full
              overflow-hidden
              rounded-[42px]
              bg-white
            "
          >
            <div
              className="
                absolute left-1/2 top-4 z-40
                h-[26px] w-[100px]
                -translate-x-1/2
                rounded-full
                bg-black
                shadow-[0_2px_8px_rgba(0,0,0,0.55)]
              "
            />

            <video
              src="/videos/home1.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="
                h-full w-full
                object-cover
                brightness-110
                contrast-105
                saturate-105
              "
            />

            <div
              className="
                pointer-events-none absolute inset-0
                bg-gradient-to-tr
                from-white/0
                via-white/10
                to-white/0
              "
            />

            <div
              className="
                pointer-events-none absolute inset-0
                rounded-[42px]
                border border-white/15
              "
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   BLOCK 2 PHONE — IMAGE MOCKUP
===================================================== */
function BlockTwoPhone() {
  return (
    <div
      className="
        pointer-events-none
        relative mx-auto mt-10
        flex w-full
        max-w-[360px]
        items-center justify-center
        sm:max-w-[420px]
        lg:mt-12
        lg:max-w-[520px]
      "
      style={{ perspective: "1700px" }}
    >
      <div
        className="
          absolute bottom-[-20px] left-1/2
          h-[34px] w-[240px]
          -translate-x-1/2
          rounded-full
          bg-black/16
          blur-2xl
          sm:w-[280px]
          lg:w-[330px]
        "
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        animate={{ y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.7 },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="
          relative
          h-[380px] w-[205px]
          rounded-[42px]
          sm:h-[430px] sm:w-[232px]
          md:h-[470px] md:w-[252px]
          lg:h-[500px] lg:w-[270px]
        "
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(-22deg) rotateX(7deg) rotateZ(7deg)",
        }}
      >
        {/* גוף אחורי עדין — בלי בליטה תקועה בצד */}
        <div
          className="
            absolute inset-0
            rounded-[42px]
            bg-gradient-to-br from-[#070707] via-[#1D1D1D] to-[#050505]
            shadow-[28px_30px_65px_rgba(54,38,21,0.22),-10px_12px_34px_rgba(201,164,92,0.12)]
          "
          style={{
            transform: "translateZ(-14px) translateX(7px)",
          }}
        />

        {/* עובי צד מחובר לגוף, לא בולט כקובייה נפרדת */}
        <div
          className="
            absolute -right-[7px] top-[18px]
            h-[92%] w-[12px]
            rounded-r-[32px]
            bg-gradient-to-b from-[#242424] via-[#080808] to-[#191919]
            shadow-[inset_-3px_0_7px_rgba(255,255,255,0.08)]
          "
          style={{
            transform: "translateZ(-7px)",
          }}
        />

        {/* מסגרת קדמית */}
        <div
          className="
            absolute inset-0
            rounded-[42px]
            bg-gradient-to-br from-[#070707] via-[#2A2A2A] to-[#050505]
            p-[7px]
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]
          "
          style={{
            transform: "translateZ(12px)",
          }}
        >
          {/* כפתורים עדינים */}
          <span className="absolute -left-[4px] top-[115px] h-14 w-[3px] rounded-l bg-[#111]" />
          <span className="absolute -right-[4px] top-[150px] h-20 w-[3px] rounded-r bg-[#111]" />

          <div
            className="
              relative h-full w-full
              overflow-hidden
              rounded-[35px]
              bg-[#FDFBF7]
            "
          >
            <div
              className="
                absolute left-1/2 top-3 z-30
                h-[22px] w-[88px]
                -translate-x-1/2
                rounded-full
                bg-black
                shadow-[0_2px_8px_rgba(0,0,0,0.55)]
                sm:top-4 sm:h-[24px] sm:w-[94px]
              "
            />

            <img
              src="/homep2.png"
              alt=""
              className="
                block h-full w-full
                object-cover
                object-top
                brightness-105
                contrast-105
                saturate-105
              "
              draggable={false}
            />

            <div
              className="
                pointer-events-none absolute inset-0
                bg-gradient-to-tr
                from-white/0
                via-white/12
                to-white/0
              "
            />

            <div
              className="
                pointer-events-none absolute inset-0
                rounded-[35px]
                border border-white/20
              "
            />
          </div>
        </div>
      </motion.div>
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
          px-4 pt-[105px] md:px-8 lg:px-12
        "
      >
        <div
          className="
            absolute inset-0 z-0
            bg-[url('/homep1.png')]
            bg-cover bg-center bg-no-repeat
          "
        />

        <div
          className="
            absolute inset-0 z-0
            bg-gradient-to-r
            from-[#F8F1E6]/5
            via-[#F8F1E6]/14
            to-[#F8F1E6]/48
          "
        />

        <div
          dir="ltr"
          className="
            relative z-10 mx-auto grid
            min-h-[calc(100vh-105px)]
            max-w-[1500px]
            grid-cols-1 items-center gap-8
            lg:grid-cols-[0.92fr_1.08fr]
          "
        >
          <div className="order-2 lg:order-1 lg:col-start-1 lg:-translate-y-4">
            <HeroPhone3D />
          </div>

          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="
              order-1
              mx-auto max-w-[740px]
              text-center
              lg:order-2
              lg:col-start-2
              lg:mx-0
              lg:text-center
            "
          >
            <h1
              className="
                text-[36px]
                font-black
                leading-[1.16]
                tracking-[-0.03em]
                text-[#3A3028]
                md:text-[54px]
                lg:text-[64px]
              "
            >
              המערכת החכמה
              <br />
              <span
                className="
                  bg-gradient-to-l
                  from-[#8B642B]
                  via-[#C69A3F]
                  to-[#B88A2D]
                  bg-clip-text
                  text-transparent
                "
              >
                לאירועים בלתי נשכחים
              </span>
            </h1>

            <div className="mx-auto mt-5 flex max-w-[520px] items-center justify-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A45C] to-[#C9A45C]" />
              <span className="text-[#C59A45]">✦</span>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A45C] to-[#C9A45C]" />
            </div>

            <p
              className="
                mx-auto mt-6 max-w-[620px]
                text-[17px]
                font-semibold
                leading-[1.85]
                text-[#4E4237]
                md:text-[19px]
              "
            >
              ניהול הזמנות, אישורי הגעה, הושבה וניהול אורחים
              <br className="hidden md:block" />
              בקלות, בסטייל וביעילות.
            </p>

            <div
              className="
                mx-auto mt-10
                grid max-w-[640px]
                grid-cols-2
                overflow-hidden
                rounded-[22px]
                border border-[#E6D7BC]/80
                bg-white/66
                shadow-[0_18px_45px_rgba(95,68,34,0.10)]
                backdrop-blur-xl
                sm:grid-cols-4
              "
            >
              {[
                {
                  icon: Users,
                  title: "ניהול אורחים",
                },
                {
                  icon: Armchair,
                  title: "הושבה חכמה",
                },
                {
                  icon: MessageCircle,
                  title: "אישורי הגעה",
                  subtitle: "בווטסאפ",
                },
                {
                  icon: Mail,
                  title: "הזמנות",
                  subtitle: "דיגיטליות",
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className={`
                      flex min-h-[116px] flex-col items-center justify-center
                      px-4 py-5 text-center
                      ${
                        index !== 0
                          ? "sm:border-r sm:border-[#E6D7BC]/80"
                          : ""
                      }
                      ${
                        index > 1
                          ? "border-t border-[#E6D7BC]/80 sm:border-t-0"
                          : ""
                      }
                    `}
                  >
                    <Icon
                      size={34}
                      strokeWidth={1.55}
                      className="mb-3 text-[#C59A45]"
                    />

                    <span className="text-[15px] font-extrabold leading-tight text-[#3D3127]">
                      {item.title}
                    </span>

                    {item.subtitle && (
                      <span className="mt-1 text-[13px] font-semibold text-[#6D5B4A]">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className="
                mt-8 flex flex-col items-center justify-center gap-4
                sm:flex-row
              "
            >
              <Link
                href="/try/dashboard"
                className="
                  group inline-flex min-w-[220px]
                  items-center justify-center gap-3
                  rounded-full
                  bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
                  px-9 py-4
                  text-[16px] font-extrabold
                  text-white
                  shadow-[0_18px_38px_rgba(184,134,45,0.26)]
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-[0_22px_46px_rgba(184,134,45,0.34)]
                "
              >
                נסו דמו עכשיו
                <span className="transition group-hover:-translate-x-1">←</span>
              </Link>

              <Link
                href="/pricing"
                className="
                  inline-flex min-w-[220px]
                  items-center justify-center
                  rounded-full
                  border border-[#8B6A3E]/45
                  bg-white/64
                  px-9 py-4
                  text-[16px] font-extrabold
                  text-[#4A3A2A]
                  shadow-[0_14px_32px_rgba(95,68,34,0.07)]
                  backdrop-blur-xl
                  transition
                  hover:bg-white
                  hover:text-[#B8862D]
                "
              >
                לראות חבילות
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= בלוק 2 – HOW IT WORKS ================= */}
      <section
        dir="rtl"
        className="
          relative overflow-hidden
          bg-[#F7F1E8]
          px-4 py-24
          md:px-8 md:py-32
          lg:px-12
        "
      >
        <div
          className="
            pointer-events-none absolute inset-0
            bg-[radial-gradient(circle_at_84%_18%,rgba(201,164,92,0.15),transparent_31%),radial-gradient(circle_at_10%_82%,rgba(255,255,255,0.70),transparent_35%)]
          "
        />

        <div
          dir="ltr"
          className="
            relative z-10 mx-auto grid max-w-[1500px]
            grid-cols-1 items-center gap-16
            lg:grid-cols-[1.04fr_0.96fr]
          "
        >
          <div
            dir="rtl"
            className="
              order-2
              relative
              space-y-5
              lg:order-1
            "
          >
            <div
              className="
                pointer-events-none absolute right-[83px] top-[90px]
                hidden h-[520px] w-px
                bg-gradient-to-b from-[#C9A45C]/0 via-[#C9A45C]/55 to-[#C9A45C]/0
                lg:block
              "
            />

            {[
              {
                num: "01",
                icon: Mail,
                title: "מעלים הזמנה דיגיטלית",
                text: "מעלים את ההזמנה שכבר עיצבתם, או משתמשים בהזמנה דיגיטלית במערכת — כדי שכל אורח יקבל חוויה אישית ומסודרת.",
              },
              {
                num: "02",
                icon: CalendarDays,
                title: "מעדכנים את פרטי האירוע",
                text: "מכניסים תאריך, שעה, מיקום, פרטי אולם וכל מידע חשוב שהאורחים צריכים לקבל לפני האירוע.",
              },
              {
                num: "03",
                icon: Users,
                title: "מוסיפים את רשימת המוזמנים",
                text: "מעלים או מוסיפים מוזמנים, מסדרים קבוצות, שומרים פרטים ומכינים את הרשימה לשליחה.",
              },
              {
                num: "04",
                icon: Send,
                title: "שולחים, עוקבים ומעדכנים",
                text: "שולחים הזמנה, מקבלים אישורי הגעה בזמן אמת, מסדרים הושבה ושולחים עדכונים לאורחים מתוך המערכת.",
              },
            ].map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 34 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    duration: 0.7,
                    delay: index * 0.18,
                    ease: "easeOut",
                  }}
                  className="
                    relative grid min-h-[150px]
                    grid-cols-[88px_1px_92px_1fr]
                    items-center
                    overflow-hidden
                    rounded-[28px]
                    border border-[#E6D7BC]/80
                    bg-white/68
                    px-6 py-6
                    shadow-[0_18px_45px_rgba(95,68,34,0.08)]
                    backdrop-blur-xl
                    md:grid-cols-[110px_1px_120px_1fr]
                  "
                >
                  <div
                    className="
                      text-center font-serif
                      text-[42px] leading-none
                      text-[#B88A2D]
                      md:text-[52px]
                    "
                  >
                    {step.num}
                  </div>

                  <div className="h-[86px] w-px bg-[#E6D7BC]" />

                  <div className="flex justify-center">
                    <div
                      className="
                        flex h-[76px] w-[76px]
                        items-center justify-center
                        rounded-full
                        border border-[#E6D7BC]
                        bg-[#FAF6EE]
                        shadow-[0_10px_25px_rgba(95,68,34,0.07)]
                      "
                    >
                      <Icon
                        size={34}
                        strokeWidth={1.55}
                        className="text-[#B88A2D]"
                      />
                    </div>
                  </div>

                  <div className="pr-4 text-right">
                    <h3 className="text-[21px] font-black text-[#3D3127]">
                      {step.title}
                    </h3>

                    <p className="mt-2 max-w-[470px] text-[15px] leading-[1.85] text-[#6B5A49]">
                      {step.text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.75 }}
            className="
              order-1
              text-center
              lg:order-2
              lg:text-right
            "
          >
            <h2
              className="
                text-[38px]
                font-black
                leading-[1.14]
                tracking-[-0.035em]
                text-[#3A3028]
                md:text-[58px]
                lg:text-[68px]
              "
            >
              מהזמנה ועד הושבה —
              <br />
              הכל עובד{" "}
              <span
                className="
                  bg-gradient-to-l
                  from-[#8B642B]
                  via-[#C69A3F]
                  to-[#B88A2D]
                  bg-clip-text text-transparent
                "
              >
                מסודר
              </span>
            </h2>

            <div className="mx-auto mt-6 flex max-w-[520px] items-center justify-center gap-4 lg:mx-0">
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A45C] to-[#C9A45C]" />
              <span className="text-[#C59A45]">✦</span>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A45C] to-[#C9A45C]" />
            </div>

            <p
              className="
                mx-auto mt-7 max-w-[650px]
                text-[18px]
                font-semibold
                leading-[1.95]
                text-[#4E4237]
                md:text-[21px]
                lg:mx-0
              "
            >
              Invistimo מלווה אתכם לפי הסדר האמיתי של ניהול האירוע:
              קודם מעלים הזמנה, מעדכנים פרטים, מוסיפים מוזמנים —
              ומשם מנהלים אישורי הגעה, הושבה והודעות במקום אחד.
            </p>

            <Link
              href="/try/dashboard"
              className="
                mt-9 inline-flex min-w-[250px]
                items-center justify-center gap-3
                rounded-full
                bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220]
                px-10 py-4
                text-[17px] font-extrabold
                text-white
                shadow-[0_18px_38px_rgba(184,134,45,0.28)]
                transition
                hover:-translate-y-0.5
                hover:shadow-[0_22px_46px_rgba(184,134,45,0.36)]
              "
            >
              לראות איך זה עובד
              <ArrowLeft size={18} />
            </Link>

            <BlockTwoPhone />
          </motion.div>
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