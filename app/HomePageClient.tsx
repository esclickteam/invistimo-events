"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Armchair,
  MessageCircle,
  Mail,
  CalendarDays,
  Send,
  ArrowLeft,
  ShieldCheck,
  Heart,
  Clock3,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import AnswerFirst from "@/components/seo/AnswerFirst";

/* =====================================================
   DEMO BUTTON
===================================================== */
function DemoButton({
  children,
  variant = "gold",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "gold" | "dark";
  className?: string;
}) {
  const router = useRouter();

  const baseClass =
    variant === "dark"
      ? `
        group inline-flex min-w-[240px]
        items-center justify-center gap-3
        rounded-full
        bg-[#3F3A34]
        px-10 py-4
        text-[17px] font-extrabold
        text-white
        shadow-[0_18px_40px_rgba(63,58,52,0.20)]
        transition
        hover:-translate-y-0.5
        hover:bg-[#2F2B27]
      `
      : `
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
      `;

  return (
    <>
      <button
        type="button"
        onClick={() => router.push("/try")}
        className={`${baseClass} ${className}`}
      >
        {children}
      </button>
    </>
  );
}

/* =====================================================
   HERO PHONE — CLEAN 3D VIDEO PHONE
===================================================== */
function HeroPhone3D() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  return (
    <div
      className="
        relative z-10
        flex w-full items-center justify-center
        min-h-[420px]
        md:min-h-[500px]
        lg:min-h-[540px]
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

            {reduceMotion ? (
              <img
                src="/marketing/invites/invite-wedding-mia-alon.webp"
                alt="הזמנה דיגיטלית — החתונה של מיה ואלון"
                className="h-full w-full bg-[#FBF6EE] object-contain object-top"
                draggable={false}
              />
            ) : (
              <video
                className="h-full w-full bg-[#FBF6EE] object-cover object-top"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/marketing/videos/hero-guest-journey-poster.jpg"
                aria-label="מסע אורח: הודעת WhatsApp, הזמנה של מיה ואלון, ואישור הגעה"
              >
                <source src="/marketing/videos/hero-guest-journey.webm" type="video/webm" />
              </video>
            )}

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
   BLOCK 3 — REAL TIME SHOWCASE WITH 3 BIG IMAGES ONLY
===================================================== */
function RealTimeShowcase() {
  const showcaseItems = [
    {
      image: "/home2.png",
      title: "דשבורד אירוע חי",
    },
    {
      image: "/home3.png",
      title: "ניהול הזמנה ואורחים",
    },
    {
      image: "/home4.png",
      title: "הודעות ועדכונים לאורחים",
    },
  ];

  return (
    <section
      dir="rtl"
      className="
        relative overflow-hidden
        bg-[#FAF8F4]
        px-4 py-24
        md:px-8 md:py-32
        lg:px-12
      "
    >
      <div
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_50%_42%,rgba(201,164,92,0.16),transparent_34%),radial-gradient(circle_at_8%_85%,rgba(255,255,255,0.75),transparent_34%),radial-gradient(circle_at_90%_78%,rgba(201,164,92,0.08),transparent_31%)]
        "
      />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75 }}
          className="mx-auto mb-16 max-w-[900px] text-center"
        >
          <div className="mx-auto mb-6 flex max-w-[430px] items-center justify-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A45C] to-[#C9A45C]" />
            <span
              className="
                flex h-12 w-12 items-center justify-center
                rounded-full
                border border-[#D8BE82]/80
                bg-white/70
                text-[#B88A2D]
                shadow-[0_12px_30px_rgba(95,68,34,0.08)]
              "
            >
              <Sparkles size={20} />
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A45C] to-[#C9A45C]" />
          </div>

          <p className="mb-4 text-[14px] font-extrabold tracking-[0.22em] text-[#B8862D]">
            כלים חכמים לאירוע
          </p>

          <h2
            className="
              text-[42px]
              font-black
              leading-[1.12]
              tracking-[-0.04em]
              text-[#3A3028]
              md:text-[64px]
              lg:text-[76px]
            "
          >
            הכל קורה
            <span
              className="
                bg-gradient-to-l
                from-[#8B642B]
                via-[#C69A3F]
                to-[#B88A2D]
                bg-clip-text text-transparent
              "
            >
              {" "}
              בזמן אמת
            </span>
          </h2>

          <p
            className="
              mx-auto mt-5 max-w-[780px]
              text-[17px]
              font-semibold
              leading-[1.9]
              text-[#5F554C]
              md:text-[20px]
            "
          >
            שליטה מלאה באישורי הגעה, מוזמנים, הודעות ועדכונים —
            במערכת אחת, יפה, ברורה ומדויקת.
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-[1320px] pb-6">
          <motion.div
            initial={{ opacity: 0, y: 34, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="
              relative z-20 mx-auto
              max-w-[980px]
              rounded-[38px]
              border border-[#E6D7BC]/90
              bg-white/76
              p-4
              shadow-[0_32px_90px_rgba(95,68,34,0.14)]
              backdrop-blur-xl
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[30px]
                border border-[#EFE3CF]
                bg-[#FFFDF8]
              "
            >
              <div
                className="
                  flex items-center justify-between
                  border-b border-[#EFE3CF]
                  bg-white/75
                  px-5 py-3
                "
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D9B46B]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E7D8BD]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#C9A45C]" />
                </div>

                <span className="text-[13px] font-black text-[#3A3028]">
                  Invistimo
                </span>
              </div>

              <img
                src={showcaseItems[0].image}
                alt={showcaseItems[0].title}
                className="
                  h-[390px]
                  w-full
                  object-cover
                  object-top
                  md:h-[500px]
                  lg:h-[560px]
                "
                draggable={false}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
            className="
              z-30
              mt-7
              rounded-[30px]
              border border-[#E6D7BC]/90
              bg-white/78
              p-3
              shadow-[0_24px_64px_rgba(95,68,34,0.13)]
              backdrop-blur-xl
              lg:absolute lg:left-[-2%] lg:top-[28%] lg:mt-0 lg:w-[430px]
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[24px]
                border border-[#EFE3CF]
                bg-[#FFFDF8]
              "
            >
              <img
                src={showcaseItems[1].image}
                alt={showcaseItems[1].title}
                className="
                  h-[280px]
                  w-full
                  object-cover
                  object-top
                  md:h-[340px]
                  lg:h-[330px]
                "
                draggable={false}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: 0.24, ease: "easeOut" }}
            className="
              z-30
              mt-7
              rounded-[30px]
              border border-[#E6D7BC]/90
              bg-white/78
              p-3
              shadow-[0_24px_64px_rgba(95,68,34,0.13)]
              backdrop-blur-xl
              lg:absolute lg:right-[-2%] lg:bottom-[14%] lg:mt-0 lg:w-[460px]
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[24px]
                border border-[#EFE3CF]
                bg-[#FFFDF8]
              "
            >
              <img
                src={showcaseItems[2].image}
                alt={showcaseItems[2].title}
                className="
                  h-[280px]
                  w-full
                  object-cover
                  object-top
                  md:h-[340px]
                  lg:h-[340px]
                "
                draggable={false}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="
              relative z-30
              mx-auto mt-12
              flex max-w-[620px]
              flex-col items-center justify-center gap-4
              sm:flex-row
              lg:mt-[54px]
            "
          >
            <DemoButton className="min-w-[240px] px-10 text-[17px]">
              התנסות בדמו
              <ArrowLeft
                size={18}
                className="transition group-hover:-translate-x-1"
              />
            </DemoButton>

            <Link
              href="/contact"
              className="
                inline-flex min-w-[240px]
                items-center justify-center
                rounded-full
                border border-[#8B6A3E]/45
                bg-white/64
                px-10 py-4
                text-[17px] font-extrabold
                text-[#4A3A2A]
                shadow-[0_14px_32px_rgba(95,68,34,0.07)]
                backdrop-blur-xl
                transition
                hover:bg-white
                hover:text-[#B8862D]
              "
            >
              דברו איתנו
            </Link>
          </motion.div>

          <div
            className="
              relative z-30
              mx-auto mt-10
              grid max-w-[820px]
              grid-cols-1
              gap-4
              text-center
              sm:grid-cols-3
            "
          >
            {[
              {
                icon: Heart,
                title: "שקט נפשי",
                text: "פחות שיחות ויותר שליטה",
              },
              {
                icon: ShieldCheck,
                title: "מידע מסודר",
                text: "כל העדכונים במקום אחד",
              },
              {
                icon: Clock3,
                title: "חוסך זמן יקר",
                text: "ניהול חכם לפני האירוע",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="
                    flex items-center justify-center gap-3
                    rounded-[20px]
                    border border-[#E6D7BC]/80
                    bg-white/58
                    px-5 py-4
                    shadow-[0_12px_30px_rgba(95,68,34,0.06)]
                    backdrop-blur-xl
                  "
                >
                  <Icon size={23} className="text-[#B88A2D]" />

                  <div className="text-right">
                    <p className="text-[15px] font-black text-[#3D3127]">
                      {item.title}
                    </p>

                    <p className="text-[12px] font-semibold text-[#7A6A58]">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================
   FINAL CTA — ORIGINAL STYLE, LESS GOLD
===================================================== */
function FinalCTA() {
  return (
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
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#D8BE82]/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-80px] right-[-40px] h-96 w-96 rounded-full bg-[#C9A45C]/14 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.65),transparent_30%)]" />

      <div className="relative z-10 mx-auto max-w-[1100px]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.75 }}
          className="
            overflow-hidden rounded-[38px]
            border border-[#E3D1AE]
            bg-white/58
            p-6 shadow-[0_28px_90px_rgba(95,68,34,0.12)]
            backdrop-blur-2xl
            md:p-10 lg:p-14
          "
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center lg:text-right">
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#E3D1AE] bg-[#FFF9EF]/80 px-5 py-2.5 text-[#B8862D]">
                <Sparkles size={18} />
                <span className="text-[14px] font-black tracking-[0.12em]">
                  INVISTIMO DEMO
                </span>
              </div>

              <h2
                className="
                  text-[38px]
                  font-black
                  leading-[1.12]
                  tracking-[-0.04em]
                  text-[#3A3028]
                  md:text-[56px]
                  lg:text-[64px]
                "
              >
                מוכנים לראות
                <br />
                איך זה עובד
                <span
                  className="
                    bg-gradient-to-l
                    from-[#8B642B]
                    via-[#C69A3F]
                    to-[#B88A2D]
                    bg-clip-text text-transparent
                  "
                >
                  {" "}
                  באמת?
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-[680px] text-[17px] font-semibold leading-[1.95] text-[#5F554C] md:text-[20px] lg:mx-0">
                התחילו בדמו, היכנסו למערכת, צפו בנתוני דוגמה אמיתיים והרגישו
                איך ניהול אירוע יכול להיות הרבה יותר מסודר, יפה ונוח.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <DemoButton variant="dark">
                  התחילו דמו
                  <ArrowLeft
                    size={18}
                    className="transition group-hover:-translate-x-1"
                  />
                </DemoButton>

                <Link
                  href="/pricing"
                  className="
                    inline-flex min-w-[240px]
                    items-center justify-center
                    rounded-full
                    border border-[#8B6A3E]/45
                    bg-white/70
                    px-10 py-4
                    text-[17px] font-extrabold
                    text-[#4A3A2A]
                    shadow-[0_14px_34px_rgba(95,68,34,0.08)]
                    transition
                    hover:bg-white hover:text-[#B8862D]
                  "
                >
                  לצפייה בחבילות
                </Link>
              </div>
            </div>

            <div
              className="
                rounded-[32px]
                border border-[#E3D1AE]
                bg-[#FFFDF8]/78
                p-6
                shadow-[0_18px_44px_rgba(95,68,34,0.09)]
                backdrop-blur-xl
                md:p-8
              "
            >
              <h3 className="text-[24px] font-black text-[#3A3028] md:text-[30px]">
                למה להתחיל עכשיו?
              </h3>

              <div className="mt-6 space-y-4">
                {[
                  "לראות את המערכת מבפנים לפני החלטה",
                  "להבין בדיוק איך ניהול האירוע נראה בפועל",
                  "לקבל תחושה אמיתית של חוויית העבודה במערכת",
                  "להתחיל בלי תשלום ובלי התחייבות",
                ].map((item) => (
                  <div
                    key={item}
                    className="
                      flex items-start gap-3
                      rounded-[18px]
                      border border-[#E8DAC0]
                      bg-white/75
                      px-4 py-4
                    "
                  >
                    <CheckCircle2
                      size={22}
                      className="mt-0.5 shrink-0 text-[#B8862D]"
                    />
                    <span className="text-[15px] font-semibold leading-[1.75] text-[#5B4D40]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {["ללא תשלום", "ללא הרשמה מראש", "נתוני דוגמה בלבד"].map(
                  (pill) => (
                    <span
                      key={pill}
                      className="
                        rounded-full
                        border border-[#E5D5B6]
                        bg-[#FFF9EF]
                        px-4 py-2
                        text-[13px] font-bold text-[#735B3C]
                      "
                    >
                      {pill}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function HomePageClient() {
  return (
    <main className="overflow-x-hidden bg-[#F4F0E8] text-[#2C241C]">
      {/* ================= HERO — brand-first composition ================= */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-[url('/homep1.webp')] bg-cover bg-center"
          aria-hidden
        />
        <div
          className="absolute inset-0 z-0 bg-[linear-gradient(105deg,rgba(18,14,10,0.72)_0%,rgba(42,33,26,0.35)_42%,rgba(244,240,232,0.88)_72%,rgba(244,240,232,0.96)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-soft-light"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(201,164,92,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25), transparent 35%)",
          }}
          aria-hidden
        />

        <div
          dir="rtl"
          className="relative z-10 mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-6 md:gap-10 md:px-10 md:pb-14 md:pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="text-center lg:text-right"
          >
            <p className="text-[13px] font-black tracking-[0.28em] text-[#C9A45C] md:text-[14px]">
              INVISTIMO
            </p>
            <h1 className="mt-4 text-[40px] font-black leading-[1.08] tracking-[-0.04em] text-[#F7F1E8] md:text-[58px] lg:text-[68px] lg:text-[#2C241C]">
              האירוע שלכם.
              <span className="mt-2 block bg-gradient-to-l from-[#8B642B] via-[#D4B06A] to-[#B88A2D] bg-clip-text text-transparent">
                הסדר שלנו.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-[34rem] text-[17px] font-semibold leading-8 text-[#E8DFD2] md:text-[19px] lg:mx-0 lg:text-[#4A3F34]">
              אישורי הגעה, הזמנות דיגיטליות, אתר חתונה והושבה — במערכת אחת שמכבדת את האירוע שלכם.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <DemoButton>
                התנסו במערכת
                <span className="transition group-hover:-translate-x-1">←</span>
              </DemoButton>
              <Link
                href="/pricing"
                className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-[#2C241C]/25 bg-[#F7F1E8]/90 px-9 py-4 text-[16px] font-extrabold text-[#2C241C] shadow-[0_14px_32px_rgba(28,22,18,0.12)] transition hover:bg-white"
              >
                לצפייה בחבילות
              </Link>
            </div>
          </motion.div>

          <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center lg:max-w-none">
            <motion.img
              initial={{ opacity: 0, x: 40, rotate: 8 }}
              animate={{ opacity: 1, x: 0, rotate: 6 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              src="/marketing/invites/invite-wedding-mia-alon.webp"
              alt="הזמנה לחתונה — מיה ואלון"
              className="absolute -left-2 top-8 z-0 hidden w-[42%] max-w-[220px] rounded-xl object-cover shadow-[0_24px_50px_rgba(20,14,10,0.35)] sm:block lg:-left-4"
              draggable={false}
            />
            <motion.img
              initial={{ opacity: 0, x: -40, rotate: -10 }}
              animate={{ opacity: 1, x: 0, rotate: -8 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              src="/marketing/invites/invite-save-the-date-maya-itai.webp"
              alt="Save the Date"
              className="absolute -right-1 bottom-10 z-0 hidden w-[38%] max-w-[200px] rounded-xl object-cover shadow-[0_24px_50px_rgba(20,14,10,0.35)] sm:block lg:-right-2"
              draggable={false}
            />
            <div className="relative z-10 w-full max-w-[320px]">
              <HeroPhone3D />
            </div>
          </div>
        </div>
      </section>

      {/* Invitation studio strip — after first viewport */}
      <section dir="rtl" className="relative bg-[#1C1612] px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="text-sm font-black tracking-[0.2em] text-[#C9A45C]">הזמנות לדוגמה</p>
            <h2 className="mt-3 text-3xl font-black text-[#F7F1E8] md:text-5xl">
              עיצוב שמכבד את הרגע
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#C9BDAE]">
              מהחתונה ועד בר המצווה — הזמנות דיגיטליות ו־Save the Date בסגנון סטודיו, מחוברים לאישורי הגעה במערכת.
            </p>
          </motion.div>
          <div className="mt-12 flex gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { src: "/marketing/invites/invite-wedding-mia-alon.webp", label: "חתונה" },
              { src: "/marketing/invites/invite-save-the-date-maya-itai.webp", label: "Save the Date" },
              { src: "/marketing/invites/invite-bar-mitzvah.webp", label: "בר מצווה" },
              { src: "/marketing/invites/invite-bat-mitzvah.webp", label: "בת מצווה" },
              { src: "/marketing/invites/invite-henna.webp", label: "חינה" },
              { src: "/marketing/invites/invite-brit.webp", label: "ברית" },
              { src: "/marketing/invites/invite-birthday.webp", label: "יום הולדת" },
              { src: "/marketing/invites/invite-corporate.webp", label: "אירוע חברה" },
            ].map((item, i) => (
              <motion.figure
                key={item.src}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="w-[180px] shrink-0 md:w-[210px]"
              >
                <img
                  src={item.src}
                  alt={item.label}
                  className="aspect-[3/4] w-full rounded-2xl object-cover shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                  draggable={false}
                />
                <figcaption className="mt-3 text-center text-sm font-bold text-[#C9BDAE]">
                  {item.label}
                </figcaption>
              </motion.figure>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/invitations/chatuna"
              className="inline-flex rounded-full bg-[#C9A45C] px-8 py-3.5 text-sm font-black text-[#1C1612] transition hover:bg-[#D4B06A]"
            >
              להזמנות דיגיטליות
            </Link>
            <Link
              href="/wedding-website"
              className="inline-flex rounded-full border border-white/25 px-8 py-3.5 text-sm font-black text-[#F7F1E8] transition hover:bg-white/10"
            >
              לאתרי חתונה
            </Link>
          </div>
        </div>
      </section>

      {/* Journey reel */}
      <section dir="rtl" className="relative bg-[#F4F0E8] px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-black tracking-[0.18em] text-[#A67C3D]">מסע האירוע</p>
            <h2 className="mt-3 text-3xl font-black text-[#2C241C] md:text-5xl">
              מה־Save the Date ועד יום האירוע
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#5C4A3A]">
              הזמנה, אתר חתונה, אישורי הגעה והושבה — רצף אחד שמכבד את האורחים ושומר את השליטה אצלכם.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rsvp" className="rounded-full bg-[#2C241C] px-7 py-3 text-sm font-black text-[#F7F1E8]">
                לאישורי הגעה
              </Link>
              <Link
                href="/seating-explained"
                className="rounded-full border border-[#2C241C]/25 px-7 py-3 text-sm font-black text-[#2C241C]"
              >
                להושבה
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#E0D4C2] bg-[#1C1612] shadow-[0_30px_70px_rgba(44,36,28,0.18)]">
            <video
              src="/marketing/videos/process-dashboard-live.webm"
              poster="/marketing/product/webp/desktop-try-dashboard-live.webp"
              autoPlay
              muted
              loop
              playsInline
              className="aspect-video w-full bg-[#1C1612] object-contain"
            />
          </div>
        </div>
      </section>

      <AnswerFirst path="/" />

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
              Invistimo אישורי הגעה מלווה אתכם לפי הסדר האמיתי של ניהול האירוע:
              קודם מעלים הזמנה, מעדכנים פרטים, מוסיפים מוזמנים —
              ומשם מנהלים אישורי הגעה, הושבה והודעות במקום אחד.
            </p>

            <DemoButton className="mt-9 min-w-[250px] px-10 text-[17px]">
              לראות איך זה עובד
              <ArrowLeft size={18} />
            </DemoButton>

            <BlockTwoPhone />
          </motion.div>
        </div>
      </section>

      {/* ================= בלוק 3 – REAL TIME SHOWCASE ================= */}
      <RealTimeShowcase />

      {/* ================= FINAL CTA ================= */}
      <FinalCTA />
    </main>
  );
}