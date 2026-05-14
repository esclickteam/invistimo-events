"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 42 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const features = [
  "קישור אישי ייחודי לכל אורח",
  "שליחה אוטומטית ב־WhatsApp או ב־SMS",
  "אפשרות להוסיף קישור ל־PayBox או מתנות באשראי",
  "בחירת מגיע / לא מגיע בצורה פשוטה",
  "בחירת מספר המגיעים בפועל",
  "הוספת הערות כמו כשרויות, אלרגיות, הסעות ונגישות",
];

const dashboardFeatures = [
  "סטטוס הגעה מתעדכן אוטומטית",
  "מספר המגיעים מתעדכן בזמן אמת",
  "הערות האורחים נשמרות בצורה מסודרת",
  "מעקב אחרי מי ענה ומי עדיין לא",
];

const whyItems = [
  "בלי טלפונים חוזרים",
  "בלי הודעות מפוזרות",
  "בלי נתונים סותרים",
  "בלי ניחושים",
  "הכל מרוכז במקום אחד",
];

function PremiumBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="
        inline-flex items-center gap-2 rounded-full
        border border-[#EADDC8]
        bg-white/70 px-5 py-2
        text-sm font-bold text-[#7A6042]
        shadow-[0_12px_35px_rgba(91,63,32,0.08)]
        backdrop-blur-xl
      "
    >
      <span className="h-2 w-2 rounded-full bg-[#C7A56B]" />
      {children}
    </span>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="
            flex items-start gap-3 rounded-2xl
            border border-[#EFE3D2]
            bg-[#FFFCF7]
            px-4 py-3
            text-base font-semibold text-[#544437]
            shadow-[0_10px_28px_rgba(88,62,38,0.05)]
          "
        >
          <span
            className="
              mt-1 flex h-5 w-5 shrink-0 items-center justify-center
              rounded-full bg-[#C7A56B] text-[11px] font-black text-white
            "
          >
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function VideoFrame({
  src,
  variant = "phone",
}: {
  src: string;
  variant?: "phone" | "wide" | "full";
}) {
  const isFull = variant === "full";
  const isWide = variant === "wide" || variant === "full";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 24 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.25 }}
      className={`
        relative mx-auto w-full
        ${isFull ? "max-w-7xl" : "max-w-[410px]"}
      `}
    >
      <div
        className="
          absolute -inset-6 rounded-[46px]
          bg-[radial-gradient(circle_at_top,#E8D4AF_0%,transparent_55%),linear-gradient(135deg,#F8EFE1,#FFFFFF)]
          blur-2xl opacity-90
        "
      />

      <div
        className={`
          relative border border-white/80
          bg-gradient-to-br from-[#F8EFE1] via-[#FFFDF9] to-[#E7D7BF]
          shadow-[0_35px_95px_rgba(58,39,20,0.20)]
          ${isFull ? "rounded-[42px] p-[12px]" : "rounded-[38px] p-[10px]"}
        `}
      >
        <div
          className={`
            border border-[#221811]/10
            bg-[#17120E]
            shadow-inner
            ${isFull ? "rounded-[32px] p-[10px]" : "rounded-[30px] p-[8px]"}
          `}
        >
          <div
            className={`
              overflow-hidden bg-black
              ${isFull ? "rounded-[26px] aspect-video" : "rounded-[24px]"}
              ${!isFull && isWide ? "aspect-video" : ""}
              ${!isFull && !isWide ? "aspect-[9/16]" : ""}
            `}
          >
            <video
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controls
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RSVPPage() {
  return (
    <div
      dir="rtl"
      className="
        min-h-screen overflow-hidden
        bg-[#FBF6EE]
        text-[#3F3025]
      "
    >
      {/* ================= HERO ================= */}
      <section
        className="
          relative isolate px-6 pb-24 pt-28 text-center
          md:pb-32 md:pt-36
        "
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#E9D4AF_0%,transparent_34%),radial-gradient(circle_at_top_right,#F5E8D3_0%,transparent_34%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_55%,#F6EBDD_100%)]" />

        <div className="absolute right-10 top-24 -z-10 h-48 w-48 rounded-full bg-[#D8B77C]/25 blur-3xl" />
        <div className="absolute bottom-20 left-10 -z-10 h-64 w-64 rounded-full bg-[#B59668]/20 blur-3xl" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.7 }}
          className="mb-8"
        >
          <PremiumBadge>מערכת RSVP חכמה לאירועים מדויקים יותר</PremiumBadge>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.85 }}
          className="
            mx-auto max-w-5xl
            text-5xl font-black leading-[1.08]
            tracking-[-0.04em]
            text-[#35281F]
            md:text-7xl
          "
        >
          אישורי הגעה חכמים
          <span
            className="
              mt-4 block
              bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A]
              bg-clip-text text-transparent
            "
          >
            שמרגישים כמו ניהול פרימיום
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.18, duration: 0.85 }}
          className="
            mx-auto mt-7 max-w-3xl
            text-lg leading-8 text-[#6D5B4A]
            md:text-2xl md:leading-10
          "
        >
          Invistimo מרכזת את כל אישורי ההגעה במקום אחד —
          קישור אישי לכל אורח, שליחה אוטומטית ב־WhatsApp או ב־SMS,
          בחירת מגיע / לא מגיע, כמות מגיעים, הערות מיוחדות
          ואפשרות לצרף קישור ל־PayBox או מתנות באשראי.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.34, duration: 0.75 }}
          className="
            mt-12 flex flex-col items-center justify-center gap-4
            sm:flex-row
          "
        >
          <Link
            href="/create-invite"
            className="
              group inline-flex items-center justify-center
              rounded-full
              bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B]
              px-10 py-5
              text-lg font-black text-white
              shadow-[0_22px_55px_rgba(58,43,34,0.32)]
              transition
              hover:-translate-y-1
              hover:shadow-[0_30px_75px_rgba(58,43,34,0.42)]
            "
          >
            התחילו לנהל אישורי הגעה
            <span className="mr-2 transition group-hover:-translate-x-1">
              ←
            </span>
          </Link>

          <Link
            href="/pricing"
            className="
              inline-flex items-center justify-center
              rounded-full
              border border-[#DCC7A6]
              bg-white/75
              px-9 py-5
              text-lg font-black text-[#5E4735]
              shadow-[0_18px_45px_rgba(91,63,32,0.08)]
              backdrop-blur-xl
              transition
              hover:-translate-y-1
              hover:bg-white
            "
          >
            צפייה בחבילות
          </Link>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.48, duration: 0.75 }}
          className="
            mx-auto mt-16 grid max-w-4xl gap-4
            sm:grid-cols-3
          "
        >
          {[
            ["100%", "שליטה בנתונים"],
            ["Live", "עדכון בזמן אמת"],
            ["Smart", "ניהול אורחים חכם"],
          ].map(([title, text]) => (
            <div
              key={title}
              className="
                rounded-[28px]
                border border-white/80
                bg-white/60
                px-6 py-6
                shadow-[0_18px_50px_rgba(91,63,32,0.08)]
                backdrop-blur-xl
              "
            >
              <div className="text-3xl font-black text-[#B58B4F]">
                {title}
              </div>
              <div className="mt-2 text-sm font-bold text-[#6D5B4A]">
                {text}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ================= BLOCK 1 ================= */}
      <section className="relative bg-white px-6 py-24 md:py-32">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#E7D3B3] to-transparent" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 md:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeUp}
            transition={{ duration: 0.75 }}
          >
            <PremiumBadge>חוויה פשוטה לאורחים</PremiumBadge>

            <h2
              className="
                mt-6 text-4xl font-black leading-tight
                tracking-[-0.03em]
                text-[#35281F]
                md:text-5xl
              "
            >
              אישור הגעה עצמאי,
              <span className="block text-[#B58B4F]">
                ברור ונוח מכל מכשיר
              </span>
            </h2>

            <p className="mt-6 text-lg leading-8 text-[#6D5B4A]">
              כל אורח מקבל קישור אישי ומאשר הגעה בצורה פשוטה,
              בלי הרשמה, בלי הורדת אפליקציה ובלי הסברים מיותרים.
              ניתן לצרף גם קישור ל־PayBox או מתנות באשראי,
              כך שכל מה שקשור לאורח נמצא במקום אחד.
            </p>

            <div className="mt-8">
              <FeatureList items={features} />
            </div>

            <p className="mt-8 rounded-[26px] border border-[#EFE3D2] bg-[#FFFAF2] p-5 text-base font-semibold leading-8 text-[#6D5B4A]">
              האורח נכנס לקישור האישי שלו, בוחר אם הוא מגיע או לא מגיע,
              מעדכן כמה מגיעים ומשאיר הערות חשובות כמו כשרות, אלרגיות,
              הסעות או נגישות — והכל נכנס אוטומטית לדשבורד.
            </p>
          </motion.div>

          <VideoFrame src="/videos/home1.mp4" />
        </div>
      </section>

      {/* ================= BLOCK 2 ================= */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#FBF6EE_0%,#F7EDDF_100%)]" />

        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.75 }}
            className="mx-auto max-w-3xl text-center"
          >
            <PremiumBadge>דשבורד חי</PremiumBadge>

            <h2
              className="
                mt-6 text-4xl font-black leading-tight
                tracking-[-0.03em]
                text-[#35281F]
                md:text-5xl
              "
            >
              כל אישור מתעדכן בזמן אמת
            </h2>

            <p className="mt-6 text-lg leading-8 text-[#6D5B4A] md:text-xl">
              ברגע שאורח מאשר, משנה כמות, מסמן שלא מגיע או משאיר הערה —
              הדשבורד מתעדכן מיד ומציג תמונת מצב מדויקת של האירוע.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-4">
            {dashboardFeatures.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.55 }}
                viewport={{ once: true }}
                className="
                  relative overflow-hidden
                  rounded-[30px]
                  border border-[#D7B873]
                  bg-white/75
                  p-[1px]
                  text-center
                  shadow-[0_24px_65px_rgba(151,108,49,0.16)]
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    pointer-events-none absolute inset-0
                    bg-[linear-gradient(135deg,rgba(215,184,115,0.45),rgba(255,255,255,0.15),rgba(180,138,74,0.28))]
                  "
                />

                <div
                  className="
                    relative h-full rounded-[29px]
                    border border-white/80
                    bg-white/80
                    p-6
                  "
                >
                  <div
                    className="
                      mx-auto mb-5 flex h-12 w-12 items-center justify-center
                      rounded-2xl bg-[#35281F]
                      text-lg font-black text-[#E8D1A5]
                      shadow-[0_12px_28px_rgba(53,40,31,0.18)]
                    "
                  >
                    {index + 1}
                  </div>

                  <p className="text-base font-black leading-7 text-[#514033]">
                    {item}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.2 }}
            className="
              mx-auto mt-12 max-w-2xl text-center
              text-lg font-semibold leading-8 text-[#6D5B4A]
            "
          >
            במקום לעבור בין וואטסאפים, רשימות וטלפונים —
            כל המידע נמצא במקום אחד, נקי ומדויק.
          </motion.p>
        </div>
      </section>

      {/* ================= BLOCK 3 - FULL WIDTH VIDEO ONLY ================= */}
      <section className="relative bg-white px-4 py-20 md:px-6 md:py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#E7D3B3] to-transparent" />

        <div className="mx-auto w-full max-w-7xl">
          <VideoFrame src="/videos/rsvp2.mp4" variant="full" />
        </div>
      </section>

      {/* ================= WHY ================= */}
      <section className="relative isolate px-6 py-24 text-center md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#EAD6B4_0%,transparent_36%),linear-gradient(180deg,#F7EDDF_0%,#FBF6EE_100%)]" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.75 }}
          className="mx-auto max-w-4xl"
        >
          <PremiumBadge>למה זה עובד באמת</PremiumBadge>

          <h2
            className="
              mt-6 text-4xl font-black leading-tight
              tracking-[-0.03em]
              text-[#35281F]
              md:text-6xl
            "
          >
            אישורי הגעה שמורידים עומס
            <span className="block text-[#B58B4F]">
              ומשאירים אותך בשליטה
            </span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-[#6D5B4A] md:text-xl">
            במקום לרדוף אחרי תשובות, לעדכן ידנית בכמה מקומות
            ולנחש כמה אנשים באמת מגיעים — Invistimo עושה סדר.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {whyItems.map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07, duration: 0.55 }}
              viewport={{ once: true }}
              className="
                rounded-[28px]
                border border-white/80
                bg-white/65
                px-5 py-7
                shadow-[0_20px_50px_rgba(91,63,32,0.08)]
                backdrop-blur-xl
              "
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#C7A56B]" />
              <p className="text-base font-black text-[#4D3B2F]">
                {item}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: 0.25, duration: 0.75 }}
          className="
            mx-auto mt-16 max-w-4xl rounded-[38px]
            border border-white/80
            bg-white/70
            p-8 shadow-[0_28px_80px_rgba(91,63,32,0.13)]
            backdrop-blur-xl
            md:p-12
          "
        >
          <h3 className="text-3xl font-black text-[#35281F] md:text-4xl">
            מתחילים לנהל אישורי הגעה בצורה חכמה יותר
          </h3>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#6D5B4A]">
            מערכת אחת שמרכזת את האורחים, האישורים, הכמויות, ההערות,
            קישורי המתנות והעדכונים בזמן אמת —
            בצורה יוקרתית, מסודרת ומדויקת.
          </p>

          <div className="mt-9">
            <Link
              href="/create-invite"
              className="
                group inline-flex items-center justify-center
                rounded-full
                bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B]
                px-12 py-5
                text-lg font-black text-white
                shadow-[0_24px_65px_rgba(58,43,34,0.35)]
                transition
                hover:-translate-y-1
                hover:shadow-[0_32px_85px_rgba(58,43,34,0.46)]
              "
            >
              התחילו עכשיו
              <span className="mr-2 transition group-hover:-translate-x-1">
                ←
              </span>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}