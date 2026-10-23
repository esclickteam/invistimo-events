"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import DemoVideo from "@/components/marketing/DemoVideo";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import EventJourney from "@/components/marketing/EventJourney";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import { PRODUCT_SHOTS, showcaseForPath } from "@/lib/seo/productVisuals";

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

function FullscreenVideoModal({ src, onClose }) {
  if (!src) return null;

  return (
    <div
      className="
        fixed inset-0 z-[99999]
        flex items-center justify-center
        bg-black/85
        px-4 py-6
        backdrop-blur-md
      "
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="סגירת וידאו"
        className="
          absolute right-5 top-5 z-20
          flex h-12 w-12 items-center justify-center
          rounded-full
          bg-white text-2xl font-black text-[#342920]
          shadow-[0_18px_45px_rgba(0,0,0,0.35)]
          transition hover:scale-105
        "
      >
        ×
      </button>

      <div
        className="
          relative w-full max-w-7xl
          overflow-hidden rounded-[28px]
          border border-white/20
          bg-black
          shadow-[0_35px_100px_rgba(0,0,0,0.65)]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className="h-[82vh] w-full bg-black object-contain"
        />
      </div>
    </div>
  );
}

function ClickableVideo({ src, className, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(src)}
      aria-label="פתיחת הסרטון במסך מלא"
      className="group relative z-20 block w-full cursor-pointer text-right"
    >
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className={className}
      />

      <div
        className="
          pointer-events-none absolute inset-0 z-30
          flex items-center justify-center
          bg-black/0 transition duration-300
          group-hover:bg-black/20
        "
      >
        <div
          className="
            flex items-center gap-3
            rounded-full
            border border-white/70
            bg-white/90 px-5 py-3
            text-sm font-black text-[#342920]
            opacity-0 shadow-[0_16px_45px_rgba(0,0,0,0.25)]
            backdrop-blur-xl
            transition duration-300
            group-hover:opacity-100
          "
        >
          <span className="text-lg">⛶</span>
          <span>לצפייה במסך מלא</span>
        </div>
      </div>
    </button>
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
  const [fullscreenVideo, setFullscreenVideo] = useState(null);

  const videoClass =
    "relative z-20 w-full h-[560px] md:h-[760px] object-contain bg-transparent";

  const tallVideoClass =
    "relative z-20 w-full h-[680px] md:h-[900px] object-contain bg-transparent";

  return (
    <div dir="rtl" className="overflow-hidden bg-[#fbf7ef] text-[#3f342b]">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden px-5 pb-12 pt-16 md:px-8 md:pb-16 md:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(225,199,154,0.45),transparent_38%),linear-gradient(180deg,#fffaf1_0%,#fbf7ef_55%,#ffffff_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.75, ease: "easeOut" }}
          >
            <GoldBadge>סידורי הושבה לאירועים</GoldBadge>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-[#2f251d] md:text-6xl">
              במקום לנהל הושבה באקסל
              <span className="mt-3 block bg-gradient-to-l from-[#b98b45] via-[#d8b878] to-[#8f6632] bg-clip-text text-transparent">
                רואים את כל המפה מולכם
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#685b4f] md:text-xl md:leading-9">
              מעלים סקיצת אולם, ממקמים שולחנות, משבצים ידנית או לפי קבוצות, ורואים מי שובץ ואיפה נשאר מקום.
              בסוף אפשר לשלוח לכל אורח את מספר השולחן — כשתוספת ההושבה נרכשה במחשבון.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/try/dashboard/seating"
                className="
                  group inline-flex items-center justify-center rounded-full
                  bg-gradient-to-l from-[#2f251d] via-[#4b3a2d] to-[#8a672e]
                  px-8 py-4 text-base font-black text-white
                  shadow-[0_20px_50px_rgba(66,45,22,0.3)]
                  transition hover:-translate-y-0.5
                "
              >
                לפתיחת דמו ההושבה
                <span className="mr-2 transition group-hover:-translate-x-1">←</span>
              </Link>

              <Link
                href="/pricing"
                className="
                  inline-flex items-center justify-center rounded-full
                  border border-[#d8c29d] bg-white/80 px-8 py-4 text-base font-black text-[#5b4735]
                  transition hover:bg-white
                "
              >
                לבדוק תוספת במחשבון
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full px-4 py-4 text-base font-bold text-[#8a672e] underline-offset-4 hover:underline"
              >
                איך זה עובד
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <DeviceFrame
              src={PRODUCT_SHOTS.seating}
              alt="מפת סידורי הושבה במסך הדמו של Invistimo"
              variant="laptop"
              priority
            />
            <p className="mt-3 text-center text-sm font-semibold text-[#7A6042]">
              צילום ממסך הדמו — נתונים פיקטיביים בלבד
            </p>
          </motion.div>
        </div>
      </section>

      {(() => {
        const showcase = showcaseForPath("/seating-explained");
        return showcase ? (
          <ProductShowcase
            heading={showcase.heading}
            lede={showcase.lede}
            items={showcase.items}
            layout={showcase.layout}
          />
        ) : null;
      })()}

      <section className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black text-[#2A211A] md:text-4xl">סרטון קצר ממסך ההושבה</h2>
          <p className="mt-3 leading-8 text-[#5C4A3A]">
            הקלטה מדמו ההושבה. בלי שינוי נתוני לקוחות ובלי שליחת הודעות.
          </p>
          <div className="mt-8">
            <DemoVideo
              src="/marketing/videos/demo-try-seating.webm"
              poster={PRODUCT_SHOTS.seating}
              caption="דמו סידורי הושבה"
            />
          </div>
        </div>
      </section>

      <EventJourney activeId="guests-seating" compact />

      <section className="px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div className="text-right">
            <GoldBadge>תפוסה ואורחים שלא שובצו</GoldBadge>
            <h2 className="mt-5 text-3xl font-black text-[#2A211A] md:text-4xl">
              רואים כמה מקומות נשארו — ומי עדיין בצד
            </h2>
            <p className="mt-4 leading-8 text-[#5C4A3A]">
              במפת ההושבה ובסיכומי השולחנות רואים תפוסה מול קיבולת (למשל 8/10). אורחים שלא שובצו
              נשארים ברשימה בצד עד שמציבים אותם — כך לא «נעלמים» בין גיליונות.
            </p>
            <ul className="mt-6 space-y-3 text-[#5C4A3A]">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
                <span>שינוי שיבוץ: מעבירים אורח משולחן לשולחן והמפה מתעדכנת.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
                <span>ביום האירוע אפשר לעדכן שיבוץ אם יש גישה לחשבון — לפי מה שנרכש.</span>
              </li>
            </ul>
            <Link
              href="/try/dashboard/seating"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2f251d] px-8 py-3 text-base font-black text-white"
            >
              לפתיחת דמו ההושבה הפעיל
            </Link>
          </div>
          <div>
            <DeviceFrame
              src={PRODUCT_SHOTS.seating}
              alt="מפת הושבה בדמו עם שולחנות ותפוסה"
              variant="laptop"
            />
            <p className="mt-3 text-center text-sm font-semibold text-[#7A6042]">
              צילום דמו — שולחנות, תפוסה ורשימת אורחים
            </p>
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
            <ClickableVideo
              src="/videos/eventsit.mp4"
              className={videoClass}
              onOpen={setFullscreenVideo}
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
            <ClickableVideo
              src="/videos/tablesit.mp4"
              className={videoClass}
              onOpen={setFullscreenVideo}
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
            <ClickableVideo
              src="/videos/smartsit.mp4"
              className={videoClass}
              onOpen={setFullscreenVideo}
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
            <ClickableVideo
              src="/videos/sit4.mp4"
              className={tallVideoClass}
              onOpen={setFullscreenVideo}
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

      {fullscreenVideo && (
        <FullscreenVideoModal
          src={fullscreenVideo}
          onClose={() => setFullscreenVideo(null)}
        />
      )}
      <ServiceLinks current="/seating-explained" />
    </div>
  );
}