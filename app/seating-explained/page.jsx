"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 42 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

const sectionFeatures = {
  eventSit: [
    "מעלים סקיצה של האולם ועובדים עליה בצורה מדויקת",
    "מסדרים שולחנות לפי המבנה האמיתי של האולם",
    "ממקמים שולחנות בצורה ויזואלית, נקייה וברורה",
    "מקבלים מפת הושבה מקצועית שמוכנה לשיבוץ אורחים",
  ],
  tableSit: [
    "משבצים אורחים ישירות דרך השולחן",
    "אפשר לשבץ גם דרך רשימת האורחים בצד",
    "ניתן להוסיף אורחים כקבוצה לפי משפחות או שיוכים",
    "כל שינוי מתעדכן בצורה מסודרת וברורה במערכת",
  ],
  smartSit: [
    "המערכת מסדרת את האורחים בשולחנות לפי קבוצות",
    "בלחיצת כפתור מקבלים חלוקה ראשונית חכמה",
    "חוסך זמן משמעותי בשלב הכי עמוס של ההושבה",
    "אפשר לעבור על הסידור, לדייק ולשנות ידנית לפי הצורך",
  ],
  tableMessage: [
    "כל אורח מקבל הודעה אישית עם מספר השולחן שלו",
    "ההודעה נשלחת מתוך המערכת בצורה מסודרת ומקצועית",
    "חוסך שאלות ביום האירוע ומוריד עומס מהזוג ומהמפיקים",
    "יוצר חוויית אורח יוקרתית וברורה מהרגע הראשון",
  ],
};

function FeatureList({ items }) {
  return (
    <ul className="mt-8 space-y-4">
      {items.map((item, index) => (
        <motion.li
          key={item}
          initial={{ opacity: 0, x: 18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.45 }}
          className="flex items-start gap-3 text-[16px] md:text-lg leading-relaxed text-[#5f5247]"
        >
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#efe1c8] text-[#8a672e] shadow-[0_8px_18px_rgba(138,103,46,0.18)]">
            ✓
          </span>
          <span>{item}</span>
        </motion.li>
      ))}
    </ul>
  );
}

function GoldBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#dac49f]/80 bg-white/65 px-5 py-2 text-sm font-bold text-[#8a672e] shadow-[0_12px_30px_rgba(118,86,45,0.08)] backdrop-blur-xl">
      {children}
    </span>
  );
}

function MediaShell({ children, tall = false }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      variants={fadeIn}
      transition={{ duration: 0.65, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.25 }}
      className="relative"
    >
      <div className="absolute -inset-6 rounded-[46px] bg-gradient-to-br from-[#e7d3ad]/55 via-white/20 to-[#b78d55]/20 blur-2xl" />

      <div
        className="
          relative overflow-hidden rounded-[34px]
          border border-white/80
          bg-white/70
          p-3
          shadow-[0_30px_90px_rgba(72,55,35,0.16)]
          backdrop-blur-xl
        "
      >
        <div className="pointer-events-none absolute left-8 top-8 z-10 h-24 w-24 rounded-full bg-[#f3dfb6]/40 blur-2xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 z-10 h-28 w-28 rounded-full bg-[#ffffff]/60 blur-3xl" />

        <div
          className={`
            relative overflow-hidden rounded-[26px]
            bg-gradient-to-br from-[#fbf7ef] via-white to-[#f4eadb]
            ${
              tall
                ? "min-h-[660px] md:min-h-[860px]"
                : "min-h-[520px] md:min-h-[690px]"
            }
          `}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function SectionBlock({
  eyebrow,
  title,
  description,
  secondDescription,
  features,
  media,
  reverse = false,
  bg = "white",
}) {
  return (
    <section
      className={`
        relative overflow-hidden px-5 py-24 md:px-8 md:py-32
        ${bg === "cream" ? "bg-[#fbf7ef]" : "bg-white"}
      `}
    >
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-[#ead8b7]/35 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-16 h-72 w-72 rounded-full bg-[#c8a66f]/20 blur-3xl" />

      <div
        className={`
          relative mx-auto grid max-w-[1450px] items-center gap-14 lg:grid-cols-2 lg:gap-20
          ${reverse ? "lg:[&>*:first-child]:order-2" : ""}
        `}
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUp}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative"
        >
          <GoldBadge>{eyebrow}</GoldBadge>

          <h2 className="mt-7 max-w-2xl text-4xl font-black leading-tight tracking-[-0.04em] text-[#342920] md:text-5xl">
            {title}
          </h2>

          <p className="mt-7 max-w-2xl text-lg leading-9 text-[#675a4e] md:text-xl">
            {description}
          </p>

          {secondDescription && (
            <p className="mt-4 max-w-2xl text-[17px] leading-8 text-[#7a6b5d]">
              {secondDescription}
            </p>
          )}

          <FeatureList items={features} />
        </motion.div>

        {media}
      </div>
    </section>
  );
}

export default function SeatingExplainedPage() {
  const videoClass =
    "relative z-20 w-full h-[560px] md:h-[760px] object-contain bg-transparent";

  const tallVideoClass =
    "relative z-20 w-full h-[680px] md:h-[900px] object-contain bg-transparent";

  return (
    <div dir="rtl" className="overflow-hidden bg-[#fbf7ef] text-[#3f342b]">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[92vh] overflow-hidden px-5 py-24 text-center md:px-8 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(225,199,154,0.55),transparent_38%),linear-gradient(180deg,#fffaf1_0%,#fbf7ef_55%,#ffffff_100%)]" />

        <div className="pointer-events-none absolute left-1/2 top-12 h-[540px] w-[540px] -translate-x-1/2 rounded-full border border-[#d9bd8d]/40" />
        <div className="pointer-events-none absolute left-1/2 top-24 h-[410px] w-[410px] -translate-x-1/2 rounded-full border border-[#ead9bd]/70" />

        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-[#c49a5c]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-20 h-80 w-80 rounded-full bg-[#efe0c5]/70 blur-3xl" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="relative z-10 mx-auto max-w-6xl"
        >
          <GoldBadge>Invistimo Seating Experience</GoldBadge>

          <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-black leading-[1.05] tracking-[-0.055em] text-[#2f251d] md:text-7xl">
            סידורי הושבה חכמים
            <span className="block bg-gradient-to-l from-[#b98b45] via-[#d8b878] to-[#8f6632] bg-clip-text pt-4 text-transparent">
              שמסדרים את האירוע מהר יותר, יפה יותר ומדויק יותר
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-9 text-[#685b4f] md:text-2xl md:leading-10">
            מעלים סקיצה של האולם, מסדרים שולחנות, משבצים אורחים ידנית או חכם לפי קבוצות —
            ובסוף שולחים לכל אורח הודעה אישית עם מספר השולחן שלו.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/pricing"
              className="
                group inline-flex items-center justify-center rounded-full
                bg-gradient-to-l from-[#2f251d] via-[#4b3a2d] to-[#8a672e]
                px-10 py-5 text-lg font-black text-white
                shadow-[0_24px_65px_rgba(66,45,22,0.35)]
                transition
                hover:-translate-y-1
                hover:shadow-[0_34px_85px_rgba(66,45,22,0.45)]
              "
            >
              התחילו לבנות הושבה
              <span className="mr-3 transition group-hover:-translate-x-1">
                ←
              </span>
            </Link>

            <a
              href="#how-it-works"
              className="
                inline-flex items-center justify-center rounded-full
                border border-[#d8c29d]
                bg-white/70 px-10 py-5 text-lg font-black text-[#5b4735]
                shadow-[0_18px_45px_rgba(84,61,37,0.08)]
                backdrop-blur-xl transition
                hover:-translate-y-1 hover:bg-white
              "
            >
              לראות איך זה עובד
            </a>
          </div>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.75 }}
          className="
            relative z-10 mx-auto mt-16 grid max-w-6xl gap-4
            rounded-[34px] border border-white/80 bg-white/65 p-4
            shadow-[0_28px_90px_rgba(84,61,37,0.12)]
            backdrop-blur-2xl
            md:grid-cols-4
          "
        >
          {[
            ["01", "סקיצת אולם", "מסדרים שולחנות לפי האולם"],
            ["02", "הושבה ידנית", "דרך שולחן או רשימת אורחים"],
            ["03", "הושבה חכמה", "סידור לפי קבוצות בלחיצה"],
            ["04", "הודעה לאורח", "מספר שולחן אישי לכל אורח"],
          ].map(([num, title, text]) => (
            <div
              key={num}
              className="rounded-[26px] border border-[#eadcc5] bg-[#fffaf2]/80 p-6 text-right"
            >
              <div className="text-sm font-black text-[#b98b45]">{num}</div>
              <div className="mt-3 text-2xl font-black text-[#35291f]">
                {title}
              </div>
              <div className="mt-2 text-sm leading-6 text-[#766759]">
                {text}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ================= INTRO STRIP ================= */}
      <section id="how-it-works" className="relative bg-white px-5 py-12 md:px-8">
        <div className="mx-auto max-w-[1450px] rounded-[36px] border border-[#eadcc5] bg-gradient-to-l from-[#fff8ec] via-white to-[#f6ead5] p-7 shadow-[0_24px_70px_rgba(84,61,37,0.09)] md:p-10">
          <div className="grid gap-8 md:grid-cols-4">
            {[
              "סקיצה של האולם",
              "שיבוץ לפי שולחנות",
              "סידור חכם לפי קבוצות",
              "שליחת מספר שולחן",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3f342b] text-lg font-black text-white shadow-[0_14px_35px_rgba(63,52,43,0.24)]">
                  {index + 1}
                </div>
                <div className="text-lg font-black text-[#3f342b]">
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 1 ================= */}
      <SectionBlock
        eyebrow="שלב 01 · סקיצת אולם"
        title="מסדרים את השולחנות לפי הסקיצה של האולם"
        description="מתחילים מהמבנה האמיתי של האולם: מעלים סקיצה, ממקמים שולחנות, ומקבלים מפת הושבה ברורה שמרגישה מקצועית כבר מהשלב הראשון."
        secondDescription="כך כל שולחן נמצא במקום הנכון, וכל ההושבה נבנית על בסיס מדויק ולא על ניחושים."
        features={sectionFeatures.eventSit}
        bg="white"
        media={
          <MediaShell>
            <video
              src="/videos/eventsit.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className={videoClass}
            />
          </MediaShell>
        }
      />

      {/* ================= SECTION 2 ================= */}
      <SectionBlock
        eyebrow="שלב 02 · הושבה לפי שולחנות"
        title="משבצים אורחים דרך השולחן, מהרשימה או כקבוצה"
        description="אפשר להושיב אורחים ישירות דרך השולחן, לגרור אותם מתוך רשימת האורחים בצד, או להוסיף קבוצה שלמה לשולחן לפי משפחה, חברים או כל שיוך אחר."
        secondDescription="זה נותן שליטה מלאה גם בהושבה ידנית וגם כשצריך לעבוד מהר עם קבוצות גדולות."
        features={sectionFeatures.tableSit}
        reverse
        bg="cream"
        media={
          <MediaShell>
            <video
              src="/videos/tablesit.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className={videoClass}
            />
          </MediaShell>
        }
      />

      {/* ================= SECTION 3 ================= */}
      <SectionBlock
        eyebrow="שלב 03 · הושבה חכמה"
        title="מסדרים את כל האורחים לפי קבוצות בלחיצת כפתור"
        description="במקום לשבץ ידנית אורח אחרי אורח, המערכת יודעת לסדר את האורחים בשולחנות לפי הקבוצות שהגדרתם — בצורה חכמה, מהירה ומסודרת."
        secondDescription="אחרי הסידור האוטומטי אפשר לעבור על המפה, להזיז, לדייק ולשנות לפי הצורך."
        features={sectionFeatures.smartSit}
        bg="white"
        media={
          <MediaShell>
            <video
              src="/videos/smartsit.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className={videoClass}
            />
          </MediaShell>
        }
      />

      {/* ================= SECTION 4 ================= */}
      <SectionBlock
        eyebrow="שלב 04 · הודעת מספר שולחן"
        title="שולחים לכל אורח הודעה אישית עם מספר השולחן"
        description="אחרי שההושבה מוכנה, שולחים מתוך המערכת הודעה מסודרת לכל אורח עם מספר השולחן שלו — בלי טלפונים, בלי בלגן ובלי שאלות מיותרות ביום האירוע."
        secondDescription="זה הופך את חוויית ההגעה לאירוע להרבה יותר מקצועית, ברורה ויוקרתית."
        features={sectionFeatures.tableMessage}
        reverse
        bg="cream"
        media={
          <MediaShell tall>
            <video
              src="/videos/sit4.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className={tallVideoClass}
            />
          </MediaShell>
        }
      />

      {/* ================= FINAL CTA ================= */}
<section className="relative overflow-hidden bg-gradient-to-br from-[#f8efe0] via-[#f3e4cb] to-[#dfc190] px-5 py-28 text-center text-[#342920] md:px-8">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.65),transparent_42%)]" />
  <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-[#d7ad63]/25 blur-3xl" />
  <div className="pointer-events-none absolute -left-32 bottom-10 h-96 w-96 rounded-full bg-white/60 blur-3xl" />

  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={fadeUp}
    transition={{ duration: 0.7 }}
    className="relative z-10 mx-auto max-w-4xl"
  >
    <span className="inline-flex rounded-full border border-[#c9a66a]/40 bg-white/55 px-5 py-2 text-sm font-black text-[#8a672e] shadow-[0_12px_30px_rgba(118,86,45,0.10)] backdrop-blur-xl">
      מערכת אחת. הושבה אחת מסודרת. אפס בלגן.
    </span>

    <h2 className="mt-8 text-4xl font-black leading-tight tracking-[-0.04em] text-[#342920] md:text-6xl">
      מוכנים לבנות הושבה ברמה של אירוע אמיתי?
    </h2>

    <p className="mx-auto mt-7 max-w-2xl text-lg leading-9 text-[#6b5a48] md:text-xl">
      סקיצת אולם, שיבוץ ידני, הושבה חכמה והודעה אישית לכל אורח —
      הכל במקום אחד, עם חוויה נקייה שמרגישה פרימיום.
    </p>

    <div className="mt-12">
      <Link
        href="/pricing"
        className="
          inline-flex items-center justify-center rounded-full
          bg-gradient-to-l from-[#3a2d22] via-[#6f512c] to-[#b98b45]
          px-12 py-6 text-xl font-black text-white
          shadow-[0_28px_75px_rgba(111,81,44,0.28)]
          transition
          hover:-translate-y-1
          hover:shadow-[0_38px_90px_rgba(111,81,44,0.38)]
        "
      >
        התחילו לבנות הושבה
        <span className="mr-3">←</span>
      </Link>
    </div>
  </motion.div>
</section>

    </div>
  );
}