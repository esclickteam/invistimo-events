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
  ShieldCheck,
  Heart,
  Clock3,
  Sparkles,
  CheckCircle2,
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
   BLOCK 3 — REAL TIME SHOWCASE WITH 3 IMAGES
===================================================== */
function RealTimeShowcase() {
  const showcaseItems = [
    {
      image: "/home2.png",
      title: "דשבורד אירוע חי",
      text: "רואים את כל נתוני האירוע במקום אחד: מוזמנים, אישורי הגעה, סטטוסים ועדכונים בזמן אמת.",
    },
    {
      image: "/home3.png",
      title: "ניהול הזמנה ואורחים",
      text: "מעצבים או מעלים הזמנה, מוסיפים מוזמנים, ומנהלים את הרשימה בצורה מסודרת ונוחה.",
    },
    {
      image: "/home4.png",
      title: "הודעות ועדכונים לאורחים",
      text: "שולחים אישורי הגעה, תזכורות, הודעות ועדכונים חשובים ישירות מהמערכת.",
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
          bg-[radial-gradient(circle_at_50%_42%,rgba(201,164,92,0.18),transparent_34%),radial-gradient(circle_at_8%_85%,rgba(255,255,255,0.75),transparent_34%),radial-gradient(circle_at_90%_78%,rgba(201,164,92,0.10),transparent_31%)]
        "
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] bg-gradient-to-t from-[#F1E7D8]/80 to-transparent" />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75 }}
          className="mx-auto mb-14 max-w-[900px] text-center"
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

        <div
          className="
            relative mx-auto
            min-h-[760px]
            max-w-[1280px]
            lg:min-h-[690px]
          "
        >
          <motion.div
            initial={{ opacity: 0, y: 34, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="
              relative z-20 mx-auto
              max-w-[860px]
              rounded-[34px]
              border border-[#E6D7BC]/90
              bg-white/72
              p-4
              shadow-[0_30px_80px_rgba(95,68,34,0.13)]
              backdrop-blur-xl
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[26px]
                border border-[#EFE3CF]
                bg-[#FFFDF8]
              "
            >
              <div
                className="
                  flex items-center justify-between
                  border-b border-[#EFE3CF]
                  bg-white/70
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
                  h-[360px]
                  w-full
                  object-cover
                  object-top
                  md:h-[430px]
                  lg:h-[470px]
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
              mt-6
              rounded-[26px]
              border border-[#E6D7BC]/90
              bg-white/76
              p-4
              shadow-[0_22px_58px_rgba(95,68,34,0.12)]
              backdrop-blur-xl
              lg:absolute lg:left-[2%] lg:top-[24%] lg:mt-0 lg:w-[310px]
            "
          >
            <div
              className="
                mb-4 overflow-hidden
                rounded-[20px]
                border border-[#EFE3CF]
                bg-[#FFFDF8]
              "
            >
              <img
                src={showcaseItems[1].image}
                alt={showcaseItems[1].title}
                className="h-[170px] w-full object-cover object-top"
                draggable={false}
              />
            </div>

            <h3 className="text-[17px] font-black text-[#3D3127]">
              {showcaseItems[1].title}
            </h3>

            <p className="mt-2 text-[13px] leading-[1.75] text-[#6B5A49]">
              {showcaseItems[1].text}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: 0.24, ease: "easeOut" }}
            className="
              z-30
              mt-6
              rounded-[26px]
              border border-[#E6D7BC]/90
              bg-white/76
              p-4
              shadow-[0_22px_58px_rgba(95,68,34,0.12)]
              backdrop-blur-xl
              lg:absolute lg:right-[2%] lg:bottom-[16%] lg:mt-0 lg:w-[330px]
            "
          >
            <div
              className="
                mb-4 overflow-hidden
                rounded-[20px]
                border border-[#EFE3CF]
                bg-[#FFFDF8]
              "
            >
              <img
                src={showcaseItems[2].image}
                alt={showcaseItems[2].title}
                className="h-[170px] w-full object-cover object-top"
                draggable={false}
              />
            </div>

            <h3 className="text-[17px] font-black text-[#3D3127]">
              {showcaseItems[2].title}
            </h3>

            <p className="mt-2 text-[13px] leading-[1.75] text-[#6B5A49]">
              {showcaseItems[2].text}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="
              relative z-30
              mx-auto mt-10
              flex max-w-[620px]
              flex-col items-center justify-center gap-4
              sm:flex-row
              lg:mt-[34px]
            "
          >
            <Link
              href="/try/dashboard"
              className="
                group inline-flex min-w-[240px]
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
              לצפייה בדמו
              <ArrowLeft
                size={18}
                className="transition group-hover:-translate-x-1"
              />
            </Link>

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
   FINAL CTA — CLEAN PREMIUM
===================================================== */
function FinalCTA() {
  return (
    <section
      dir="rtl"
      className="
        relative overflow-hidden
        bg-[#FBF8F2]
        px-4 py-24
        md:px-8 md:py-32
        lg:px-12
      "
    >
      <div
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_18%_20%,rgba(201,164,92,0.13),transparent_28%),radial-gradient(circle_at_82%_80%,rgba(201,164,92,0.10),transparent_30%),linear-gradient(to_bottom,#FBF8F2,#F3E8D7)]
        "
      />

      <div className="relative z-10 mx-auto max-w-[1180px]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.75 }}
          className="
            overflow-hidden
            rounded-[42px]
            border border-[#E4D2AF]
            bg-white/72
            p-6
            text-center
            shadow-[0_30px_90px_rgba(95,68,34,0.12)]
            backdrop-blur-2xl
            md:p-10
            lg:p-14
          "
        >
          <div className="mx-auto mb-7 flex max-w-[450px] items-center justify-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A45C] to-[#C9A45C]" />
            <span
              className="
                inline-flex h-12 w-12 items-center justify-center
                rounded-full
                border border-[#D8BE82]
                bg-[#FFF9EF]
                text-[#B8862D]
                shadow-[0_12px_30px_rgba(95,68,34,0.08)]
              "
            >
              <Sparkles size={20} />
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A45C] to-[#C9A45C]" />
          </div>

          <p className="mb-4 text-[14px] font-extrabold tracking-[0.22em] text-[#B8862D]">
            INVISTIMO DEMO
          </p>

          <h2
            className="
              mx-auto max-w-[900px]
              text-[38px]
              font-black
              leading-[1.12]
              tracking-[-0.04em]
              text-[#3A3028]
              md:text-[58px]
              lg:text-[72px]
            "
          >
            מוכנים לראות איך
            <br />
            ניהול אירוע יכול להיראות
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

          <p
            className="
              mx-auto mt-6 max-w-[760px]
              text-[17px]
              font-semibold
              leading-[1.95]
              text-[#5F554C]
              md:text-[20px]
            "
          >
            היכנסו לדמו, ראו את המערכת מבפנים, בדקו איך נראה דשבורד אירוע,
            אישורי הגעה, הושבה והודעות — והחליטו בנחת אם זה מתאים לאירוע שלכם.
          </p>

          <div
            className="
              mx-auto mt-9 grid max-w-[820px]
              grid-cols-1 gap-4
              text-right
              md:grid-cols-3
            "
          >
            {[
              "ללא תשלום",
              "ללא התחייבות",
              "נתוני דוגמה בלבד",
            ].map((item) => (
              <div
                key={item}
                className="
                  flex items-center justify-center gap-3
                  rounded-[20px]
                  border border-[#E6D7BC]
                  bg-[#FFFDF8]
                  px-5 py-4
                  shadow-[0_12px_30px_rgba(95,68,34,0.05)]
                "
              >
                <CheckCircle2 size={22} className="text-[#B8862D]" />
                <span className="text-[15px] font-black text-[#3D3127]">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div
            className="
              mt-10 flex flex-col items-center justify-center gap-4
              sm:flex-row
            "
          >
            <Link
              href="/try/dashboard"
              className="
                group inline-flex min-w-[250px]
                items-center justify-center gap-3
                rounded-full
                bg-[#3F3A34]
                px-10 py-4
                text-[17px] font-extrabold
                text-white
                shadow-[0_18px_38px_rgba(63,58,52,0.22)]
                transition
                hover:-translate-y-0.5
                hover:bg-[#2F2B27]
              "
            >
              להתחיל דמו
              <ArrowLeft
                size={18}
                className="transition group-hover:-translate-x-1"
              />
            </Link>

            <Link
              href="/pricing"
              className="
                inline-flex min-w-[250px]
                items-center justify-center
                rounded-full
                border border-[#8B6A3E]/45
                bg-white/70
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
              לצפייה בחבילות
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
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
                לצפייה בחבילות
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

      {/* ================= בלוק 3 – REAL TIME SHOWCASE ================= */}
      <RealTimeShowcase />

      {/* ================= FINAL CTA ================= */}
      <FinalCTA />
    </main>
  );
}