"use client";

import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import SeatReleaseScenario from "./components/SeatReleaseScenario";
import { FAQ_TOPIC_IDS, FAQ_TOPICS, SEATING_FAQS } from "./seatingFaqs";
import {
  COMPARE_ROWS,
  DIGITAL_CAPABILITIES,
  DISTINCTIONS,
  EARLY_RESERVE_POINTS,
  LINKS,
  LIVE_CAPABILITIES,
  LIVE_STATUS_LEGEND,
  MEDIA,
  PROCESS_STEPS,
  SERVICE_TIERS,
  STAFF_TASKS,
  TABLE_EXAMPLES,
  TIMELINE,
  UPDATED_AT,
  WHY_POINTS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-seating-display",
});

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function Section({
  id,
  tone = "ivory",
  children,
  className = "",
}: {
  id?: string;
  tone?: "ivory" | "cream" | "white" | "dark";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    ivory: "bg-[#FBF6EE] text-[#3A2A1F]",
    cream: "bg-[#F7EDDF] text-[#3A2A1F]",
    white: "bg-[#FFFDF8] text-[#3A2A1F]",
    dark: "bg-[#2A211A] text-[#F7EDDF]",
  } as const;
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">{children}</div>
    </section>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-xs font-black tracking-[0.16em] ${
        light ? "text-[#E8D1A5]" : "text-[#8A642E]"
      }`}
    >
      {children}
    </p>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2C241C] px-7 py-3.5 text-base font-black !text-white shadow-[0_16px_36px_rgba(44,36,28,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3A2B22]"
    >
      {children}
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/80 px-7 py-3.5 text-base font-black !text-[#2C241C] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
    >
      {children}
    </Link>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-7 text-[#5C4A3A]">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function ProductShot({
  src,
  alt,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-white shadow-[0_20px_48px_rgba(95,68,34,0.1)]">
      <div className="relative aspect-[16/10] w-full bg-[#F3E8D7]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </div>
      <figcaption className="border-t border-[#EFE2CC] px-4 py-3 text-sm font-semibold text-[#5E4735]">
        {caption}
      </figcaption>
    </figure>
  );
}

function FaqBlock() {
  const byId = Object.fromEntries(SEATING_FAQS.map((f) => [f.id, f]));
  return (
    <div className="space-y-8">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className="text-lg font-black text-[#2C241C]">{topic.title}</h3>
          <div className="mt-3 divide-y divide-[#EFE2CC] rounded-[24px] border border-[#E6D2AA] bg-white">
            {FAQ_TOPIC_IDS[topic.id].map((id, index) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4" open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <h4 className="text-base font-black text-[#2C241C] md:text-lg">{faq.q}</h4>
                    <span className="mt-1 text-[#8A642E] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{faq.a}</p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SeatingMarketingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      dir="rtl"
      className={`${display.variable} -mt-[64px] min-h-screen overflow-x-hidden bg-[#FBF6EE] text-[#3A2A1F]`}
    >
      {/* Hero */}
      <section className="relative isolate overflow-hidden px-5 pb-12 pt-[96px] md:px-8 md:pb-16 md:pt-[110px]">
        <div className="absolute inset-0 -z-10">
          <Image
            src={MEDIA.hall}
            alt="אולם חתונה יוקרתי עם שולחנות ערוכים"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#FFFDF8]/95 via-[#FBF6EE]/88 to-[#F3E8D7]/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(232,209,166,0.35),transparent_42%)]" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.45 }}
          >
            <p className={`${display.className} text-2xl font-bold text-[#8A642E] md:text-3xl`}>
              Invistimo
            </p>
            <h1
              className={`${display.className} mt-3 text-[2rem] font-bold leading-[1.2] text-[#2C241C] md:text-5xl`}
            >
              סידורי הושבה לחתונה — מהתכנון ועד האורח האחרון
            </h1>
            <p className="mt-4 max-w-xl text-lg font-semibold leading-8 text-[#5C4A3A]">
              מתכננים את השולחנות מראש, מקבלים את האורחים בצורה מסודרת ומנהלים את המקומות
              הפנויים בזמן אמת.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PrimaryCta href="#digital-system">לגלות את מערכת ההושבה</PrimaryCta>
              <SecondaryCta href="#live">איך עובד ניהול LIVE?</SecondaryCta>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[22px] border border-[#E6D2AA] bg-white/90 shadow-[0_24px_60px_rgba(70,48,24,0.18)] backdrop-blur">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src={MEDIA.map}
                  alt="מפת הושבה דיגיטלית של Invistimo עם שולחנות ושיבוץ אורחים"
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 520px"
                />
              </div>
              <p className="border-t border-[#EFE2CC] px-4 py-2.5 text-sm font-semibold text-[#5E4735]">
                צילום אמיתי ממפת ההושבה של Invistimo
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro story */}
      <Section tone="white" className="!pt-10 md:!pt-12">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fade}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-lg leading-8 text-[#5C4A3A] md:text-xl md:leading-9">
            ביום החתונה שלכם, כל אורח צריך להרגיש שמחכים לו — בלי לחפש שולחן פנוי, בלי להפריד
            בין בני משפחה ובלי להזיז אורחים ממקום למקום. עם מערכת סידורי ההושבה הדיגיטלית של
            Invistimo אפשר לתכנן מראש את חלוקת השולחנות, לשבץ מוזמנים ולעקוב אחר מצב ההושבה.
            וכאשר בוחרים בשירות LIVE המתאים, אפשר להמשיך לנהל הגעה ומקומות פנויים גם במהלך
            האירוע.
          </p>
          <p className="mt-5 text-sm font-semibold text-[#8A6B45]">עודכן לאחרונה: {UPDATED_AT}</p>
        </motion.div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {PROCESS_STEPS.map((step) => (
            <span
              key={step}
              className="rounded-full border border-[#E6D2AA] bg-[#FFFDF8] px-3.5 py-2 text-sm font-bold text-[#5E4735]"
            >
              {step}
            </span>
          ))}
        </div>
      </Section>

      {/* Why seating */}
      <Section id="why" tone="cream">
        <Eyebrow>לפני שמתחילים</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          למה כדאי לתכנן מראש איפה כל אורח יישב?
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          סידורי הושבה מאפשרים לתכנן את חלוקת המקומות באולם לפני שהאורחים מגיעים. במקום לגלות
          בזמן האירוע שחלק מהשולחנות מלאים, שבני משפחה התפצלו או שאין מספיק מקומות רצופים לקבוצה
          — אפשר להתארגן מראש. תכנון נכון עוזר לשמור משפחות יחד, להתחשב בצרכים מיוחדים ולנצל
          את מקומות הישיבה — ומקל על צוות קבלת הפנים.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {WHY_POINTS.map((point) => (
            <Check key={point}>{point}</Check>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-sm font-semibold leading-6 text-[#8A6B45]">
          חשוב: תכנון הושבה מפחית בלבול ועומס, אבל אינו מבטיח שלא יהיו טעויות או עיכובים ביום
          האירוע.
        </p>
      </Section>

      {/* Free seating contrast */}
      <Section id="free-vs-planned" tone="white">
        <Eyebrow>הבחנה חשובה</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-4xl text-3xl font-bold md:text-4xl`}>
          הושבה חופשית נשמעת פשוטה. באירוע גדול היא עלולה להיות מסובכת.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          נניח שמשפחה של חמישה מגיעה לחתונה. באולם יש כמה שולחנות עם מקומות פנויים, אבל בכל
          שולחן נותרו רק שניים או שלושה כיסאות. בסך הכול יש מספיק מקומות — אבל אין חמישה מקומות
          יחד. עכשיו צריך לבקש מאורחים לעבור שולחן, להפריד בין בני משפחה או לחפש פתרון בזמן
          שהאולם כבר מתמלא.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-[#E2B8B8] bg-[#FBF4F4] p-6">
            <h3 className="text-xl font-black text-[#7A3535]">ללא סידורי הושבה</h3>
            <ul className="mt-4 space-y-3">
              <Check>מקומות פנויים מפוזרים בין שולחנות</Check>
              <Check>משפחה שלא יכולה לשבת יחד</Check>
              <Check>צוות שמנסה למצוא פתרון בזמן האירוע</Check>
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#C9D4B8] bg-[#F4F8F0] p-6">
            <h3 className="text-xl font-black text-[#2F4428]">עם סידורי הושבה</h3>
            <ul className="mt-4 space-y-3">
              <Check>שולחנות מתוכננים מראש</Check>
              <Check>קבוצות משובצות יחד</Check>
              <Check>צוות שיודע לאן להפנות את האורחים</Check>
            </ul>
          </div>
        </div>

        <p className="mt-8 max-w-3xl rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-4 text-[15px] leading-7 text-[#5C4A3A]">
          באירוע קטן ואינטימי, כשיש מספיק מקומות והאורחים מכירים היטב זה את זה, הושבה חופשית
          יכולה להתאים. באירועים גדולים או מורכבים — סידורי הושבה מסודרים עשויים להיות שימושיים
          במיוחד.
        </p>
      </Section>

      {/* Digital system */}
      <Section id="digital-system" tone="cream">
        <Eyebrow>מערכת ההושבה הדיגיטלית</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          כל השולחנות והמוזמנים — במקום אחד
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          במקום לעבוד עם דפים, רשימות ידניות ושינויים שמועברים בין אנשים, אפשר לראות את מפת
          ההושבה ואת מצב השולחנות במערכת — ולבצע שיבוצים לפי{" "}
          <Link href={LINKS.guestList} className="font-black text-[#8A642E] underline-offset-4 hover:underline">
            רשימת המוזמנים
          </Link>
          .
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ProductShot
            src={MEDIA.map}
            alt="מפת הושבה עם שולחנות, קיבולת ומקומות פנויים"
            caption="צילום 1 — מפת ההושבה: שולחנות, קיבולת ומספר משובצים"
            priority
          />
          <ProductShot
            src={MEDIA.dashboardSeating}
            alt="שיבוץ אורחים לשולחנות במערכת Invistimo"
            caption="צילום 2 — שיבוץ אורחים: רשימה, שולחן ומספר משתתפים ברשומה"
          />
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {DIGITAL_CAPABILITIES.map((item) => (
            <Check key={item}>{item}</Check>
          ))}
        </ul>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TABLE_EXAMPLES.map((table) => {
            const full = table.seated >= table.capacity;
            return (
              <div
                key={table.name}
                className="rounded-2xl border border-[#E6D2AA] bg-white px-5 py-5 text-center"
              >
                <p className="text-sm font-black text-[#8A642E]">{table.name}</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-[#2C241C]">
                  {table.seated}
                  <span className="text-lg text-[#8A6B45]">/{table.capacity}</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-[#5E4735]">
                  {full ? "מלא — כל המקומות משובצים" : "מקומות פנויים עדיין זמינים"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#1E1814]">
          <video
            className="aspect-video w-full object-cover"
            controls
            playsInline
            preload="metadata"
            poster={MEDIA.seatingPoster}
          >
            <source src={MEDIA.mapVideo} type="video/mp4" />
          </video>
          <p className="px-4 py-3 text-sm font-semibold text-[#E8D1A5]">
            סרטון הדגמה — שיבוץ אורחים במפת ההושבה (נתוני דמו בלבד)
          </p>
        </div>
      </Section>

      {/* RSVP connection */}
      <Section id="rsvp-link" tone="white">
        <Eyebrow>אישורי הגעה והושבה</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          קודם יודעים מי מתכנן להגיע. אחר כך מתכננים איפה יישב.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          רשימת המוזמנים היא נקודת ההתחלה.{" "}
          <Link href={LINKS.rsvp} className="font-black text-[#8A642E] underline-offset-4 hover:underline">
            אישורי ההגעה
          </Link>{" "}
          נותנים תמונה טובה יותר של מספר המשתתפים הצפוי — כולל כמה אנשים בכל רשומה. משפחה
          שמוזמנת יחד יכולה לאשר ארבעה משתתפים, ואז לשבץ אותם יחד בשולחן. אם הכמות משתנה, חשוב
          לעדכן גם את תכנון ההושבה.
        </p>
        <p className="mt-5 max-w-3xl text-base font-black text-[#2C241C]">
          רשומה אחת אינה בהכרח כיסא אחד.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DISTINCTIONS.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-4">
              <p className="font-black text-[#2C241C]">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-[#5E4735]">{item.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm font-semibold text-[#8A6B45]">
          לקריאה נוספת:{" "}
          <Link href={LINKS.chatuna} className="text-[#8A642E] underline-offset-4 hover:underline">
            אישורי הגעה לחתונה
          </Link>
          {" · "}
          <Link href={LINKS.whenToSend} className="text-[#8A642E] underline-offset-4 hover:underline">
            מתי שולחים
          </Link>
          {" · "}
          <Link href={LINKS.noReply} className="text-[#8A642E] underline-offset-4 hover:underline">
            אורחים שלא עונים
          </Link>
        </p>
      </Section>

      {/* Reserves before event */}
      <Section id="reserves" tone="cream">
        <Eyebrow>לפני האירוע</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          מה עושים עם מקומות רזרבה?
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          גם כשאישורי ההגעה הושלמו, יכולים להתרחש שינויים: ביטולים ברגע האחרון, הגעה במספר
          שונה, או אורחים שלא שובצו מראש. לכן כדאי לתכנן איך מנוהלים מקומות הרזרבה — בהתאם
          לקיבולת האולם ולהסכם. מערכת הושבה דיגיטלית מסייעת לזהות מקומות פנויים ולנהל שינויים.
        </p>
        <p className="mt-5 max-w-3xl rounded-2xl border border-[#E6D2AA] bg-white px-5 py-4 text-[15px] leading-7 text-[#5C4A3A]">
          מקום פנוי במפת ההושבה אינו בהכרח מנה נוספת שהאולם התחייב לספק. יש להבחין בין קיבולת
          ישיבה, רזרבות ומספר מנות לפי{" "}
          <Link href={LINKS.venueGuarantee} className="font-black text-[#8A642E] underline-offset-4 hover:underline">
            הסכם האולם
          </Link>
          .
        </p>
      </Section>

      {/* LIVE */}
      <Section id="live" tone="dark">
        <Eyebrow light>יום האירוע</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          הושבה LIVE — יודעים מה קורה באולם בזמן אמת
        </h2>
        <p className="mt-3 max-w-3xl text-lg font-semibold leading-8 text-[#E8D1A5]">
          ההושבה לא מסתיימת כשהשולחנות מסודרים. ביום האירוע מתחיל שלב הניהול בפועל.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#D8C4A8] md:text-lg">
          האורחים מתחילים להגיע, חלקם מתעכבים, ולעיתים מספר המשתתפים בפועל שונה מהמספר שאושר
          מראש. בשירות הושבה LIVE של Invistimo — בהתאם לחבילה ולהרשאות — אפשר לנהל את הגעת
          האורחים ולראות תמונת מצב מעודכנת של ההושבה.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {LIVE_CAPABILITIES.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-[#F0E4D2]">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LIVE_STATUS_LEGEND.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
            >
              <p className="font-black text-[#F7EDDF]">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-[#D8C4A8]">{item.detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-6 text-[#B9A188]">
          LIVE אינו כלול אוטומטית בכל תוספת הושבה דיגיטלית. הזמינות תלויה בחבילה, במודולים
          שנפתחו ובהרשאות צוות האירוע.
        </p>
      </Section>

      {/* Highlight: release at reception */}
      <Section id="early-release" tone="white">
        <Eyebrow>היתרון החשוב</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-4xl text-3xl font-bold md:text-4xl`}>
          לא חייבים לחכות לאחרי החופה כדי לגלות שיש מקומות פנויים
        </h2>
        <p className="mt-3 max-w-3xl text-lg font-semibold leading-8 text-[#5C4A3A]">
          כשיש מידע אמין על אורחים שלא יגיעו, אפשר להתחיל לנהל את הרזרבות מוקדם יותר.
        </p>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
          <p>
            אחד היתרונות של ניהול הושבה בזמן אמת הוא האפשרות לזהות שינויים כבר במהלך קבלת
            הפנים. אם ברשומה אישרו ארבעה והוקצו ארבעה מקומות, ומגיעים רק שניים — חשוב לברר מה
            קורה עם השניים הנוספים.
          </p>
          <p>
            אם הם רק מתעכבים, המקומות נשמרים. אם מתקבל מידע ברור שהם לא מתכננים להגיע, אפשר
            לעדכן את מספר המשתתפים בפועל ולשחרר במפורש את הכיסאות שלא ינוצלו — כך שהם יכולים
            להפוך לרזרבה זמינה.
          </p>
          <p className="font-black text-[#2C241C]">
            במקום להמתין עד אחרי החופה, אפשר להקדים את התהליך כבר בקבלת הפנים — ככל שהמידע
            מאפשר זאת. היתרון הוא לא רק לדעת כמה הגיעו, אלא לנהל נכון את המקומות שהתפנו.
          </p>
        </div>

        <div className="mt-10">
          <SeatReleaseScenario />
        </div>

        <div className="mt-8 rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-5">
          <h3 className="text-lg font-black text-[#2C241C]">כלל בטיחות תפעולי</h3>
          <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
            המערכת אינה משחררת כיסאות באופן אוטומטי רק משום שאורח עדיין לא סומן כמי שהגיע.
            שחרור מתבצע בפעולה מפורשת אחרי עדכון הגעה בפועל — כדי שלא ייפגעו מקומות של אורחים
            שמתעכבים.
          </p>
        </div>
      </Section>

      {/* Why early reserves matter */}
      <Section id="why-early" tone="cream">
        <Eyebrow>למה זה חשוב</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          מקומות פנויים שמזהים בזמן יכולים לעזור בדיוק כשצריך אותם
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          כאשר צוות ההושבה מקבל מידע כבר בקבלת הפנים על אורחים שלא יגיעו, אפשר לעדכן את
          התכנון מוקדם יותר — ואם מתעורר צורך להושיב אורחים נוספים, ייתכן שכבר קיימים מקומות
          זמינים.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {EARLY_RESERVE_POINTS.map((item) => (
            <Check key={item}>{item}</Check>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-sm font-semibold leading-6 text-[#8A6B45]">
          שחרור מקום ישיבה אינו מבטיח שהאולם יכול לספק מנה נוספת. יש לתאם בין ניהול ההושבה
          להסכם האולם.
        </p>
      </Section>

      {/* Staff */}
      <Section id="staff" tone="white">
        <Eyebrow>אנשי צוות</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          גם מערכת טובה צריכה אנשים שיודעים לנהל את האירוע
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
          ביום האירוע האורחים צריכים הכוונה ברורה ונעימה. אנשי צוות הושבה מסייעים באיתור
          אורחים, בהכוונה לשולחנות ובטיפול בשינויים. כשהצוות עובד עם מערכת דיגיטלית מעודכנת,
          קל יותר לשמור על תמונת מצב משותפת.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[280px] overflow-hidden rounded-[24px] border border-[#E6D2AA]">
            <Image
              src={MEDIA.hall}
              alt="אווירת קבלת פנים באולם חתונה"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 480px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2C241C]/70 to-transparent" />
            <p className="absolute bottom-4 right-4 left-4 text-sm font-bold text-white">
              צילום אווירה — אינו מוצג כצילום צוות מתוך המערכת
            </p>
          </div>
          <div>
            <h3 className="text-xl font-black text-[#2C241C]">מה צוות ההושבה עושה?</h3>
            <ul className="mt-4 space-y-3">
              {STAFF_TASKS.map((item) => (
                <Check key={item}>{item}</Check>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-4 text-sm leading-6 text-[#5C4A3A]">
              יש להבחין בין מערכת הושבה בשימוש עצמי, מערכת עם LIVE, ושירות הכולל אנשי צוות
              פיזיים. אנשי צוות אינם כלולים בכל חבילת הושבה — והמחיר נקבע בהצעה.
            </p>
          </div>
        </div>
      </Section>

      {/* Timeline */}
      <Section id="day-timeline" tone="cream">
        <Eyebrow>ציר זמן</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          מהתכנון בבית ועד לקבלת הפנים באולם
        </h2>
        <ol className="mt-8 space-y-4">
          {TIMELINE.map((item, index) => (
            <li
              key={item.title}
              className="grid gap-3 rounded-2xl border border-[#E6D2AA] bg-white px-5 py-4 md:grid-cols-[auto_1fr] md:items-start"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2C241C] text-sm font-black text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg font-black text-[#2C241C]">{item.title}</h3>
                <p className="mt-1 text-[15px] leading-7 text-[#5C4A3A]">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Comparison */}
      <Section id="compare" tone="white">
        <Eyebrow>בחירת שירות</Eyebrow>
        <h2 className={`${display.className} mt-3 max-w-3xl text-3xl font-bold md:text-4xl`}>
          איזה סוג של שירות הושבה מתאים לכם?
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
          שלושת החלקים הם תהליך אחד — אבל הזמינות, ההרשאות והמחיר של כל שירות תלויים בחבילה
          שנבחרה.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {SERVICE_TIERS.map((tier) => (
            <article
              key={tier.id}
              className="flex flex-col rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-6"
            >
              <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">{tier.subtitle}</p>
              <h3 className="mt-2 text-xl font-black text-[#2C241C]">{tier.title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-7 text-[#5C4A3A]">{tier.body}</p>
              <ul className="mt-5 space-y-2 border-t border-[#EFE2CC] pt-4">
                {tier.includes.map((line) => (
                  <li key={line} className="text-sm font-semibold text-[#5E4735]">
                    · {line}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
          <table className="min-w-[640px] w-full text-right text-sm">
            <thead className="bg-[#FBF6EE] text-[#2C241C]">
              <tr>
                <th className="px-4 py-3 font-black">יכולת</th>
                <th className="px-4 py-3 font-black">דיגיטלי</th>
                <th className="px-4 py-3 font-black">עם LIVE</th>
                <th className="px-4 py-3 font-black">עם צוות</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-[#EFE2CC]">
                  <td className="px-4 py-3 font-semibold text-[#5C4A3A]">{row.feature}</td>
                  <td className="px-4 py-3 font-bold text-[#2C241C]">{row.digital ? "כן" : "—"}</td>
                  <td className="px-4 py-3 font-bold text-[#2C241C]">{row.live ? "כן*" : "—"}</td>
                  <td className="px-4 py-3 font-bold text-[#2C241C]">{row.staff ? "כן*" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-[#EFE2CC] px-4 py-3 text-xs font-semibold text-[#8A6B45]">
            * לפי חבילה, מודולים והצעה. הושבה דיגיטלית מופיעה במחשבון החבילות; LIVE וצוות אינם
            מחיר אחיד במחשבון הציבורי.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryCta href={LINKS.pricing}>למחשבון החבילות</PrimaryCta>
          <SecondaryCta href={LINKS.contact}>לשיחה על צוות ו־LIVE</SecondaryCta>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" tone="cream">
        <Eyebrow>שאלות נפוצות</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          סידורי הושבה — מה חשוב לדעת
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C4A3A]">
          תשובות מבוססות על יכולות המערכת בפועל. מחירים שאינם במחשבון הציבורי מוצגים כהצעה
          בלבד.
        </p>
        <div className="mt-8">
          <FaqBlock />
        </div>
      </Section>

      {/* Final CTA + links */}
      <Section tone="dark" className="!py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`${display.className} text-3xl font-bold md:text-4xl`}>
            מוכנים לסדר את ההושבה נכון?
          </h2>
          <p className="mt-4 text-base leading-8 text-[#D8C4A8]">
            מתחילים מתכנון דיגיטלי, מוסיפים LIVE לפי הצורך, ומחברים אנשי צוות כשרוצים סיוע
            באולם — הכל בהתאם לחבילה שלכם.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={LINKS.pricing}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E8D1A5] px-7 py-3.5 text-base font-black !text-[#2C241C] transition hover:-translate-y-0.5 hover:bg-[#F3E2C0]"
            >
              לבחירת חבילה
            </Link>
            <Link
              href={LINKS.trySeating}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-base font-black !text-[#F7EDDF] transition hover:bg-white/10"
            >
              לנסות מפת הושבה בדמו
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-[#E8D1A5]">
            <Link href={LINKS.rsvp} className="hover:underline">
              אישורי הגעה
            </Link>
            <Link href={LINKS.chatuna} className="hover:underline">
              אישורי הגעה לחתונה
            </Link>
            <Link href={LINKS.costGuide} className="hover:underline">
              מחירי אישורי הגעה
            </Link>
            <Link href={LINKS.venueGuarantee} className="hover:underline">
              התחייבות לאולם
            </Link>
            <Link href={LINKS.seatingPlan} className="hover:underline">
              מדריך הכנת הושבה
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
