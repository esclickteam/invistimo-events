"use client";

import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import {
  AEO_ANSWERS,
  COMPARISON_ROWS,
  CUSTOM_BENEFITS,
  FEATURED_STYLES,
  getFeaturedTemplate,
  HERO_DEMO_TEMPLATE_ID,
  INTERNAL_LINKS,
  PROCESS_STEPS,
  SCROLL_VIDEO,
  SITE_CAPABILITIES,
  WHY_COUPLES,
  WW_FAQS,
  WW_H1,
} from "./content";
import {
  DesktopLiveFrame,
  FeaturedTemplateShowcase,
  HeroDeviceDuo,
  MobileLiveFrame,
} from "./DevicePreviews";
import "./ww-motion.css";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-ww-display",
});

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const primaryCta =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#2C211B] via-[#5A4333] to-[#3A2B22] px-8 py-3 text-base font-bold text-[#F7F1E6] shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const secondaryCta =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/80 px-8 py-3 text-base font-bold text-[#5E4735] backdrop-blur transition hover:bg-white";
const darkSecondaryCta =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#C9A962]/45 bg-transparent px-8 py-3 text-base font-bold text-[#F3E7D2] transition hover:bg-white/5";

function SectionShell({
  id,
  children,
  dark = false,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative px-5 py-16 md:px-8 md:py-24 ${
        dark ? "bg-[#17120E] text-[#F3E7D2]" : "text-[#2C241C]"
      } ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  lede,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  light?: boolean;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
      {eyebrow ? (
        <p
          className={`mb-3 text-sm font-bold tracking-[0.18em] ${
            light ? "text-[#E8D1A5]" : "text-[#A77A38]"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-[family-name:var(--font-ww-display)] text-3xl font-medium leading-tight md:text-5xl ${
          light ? "text-[#F7F1E6]" : "text-[#241E18]"
        }`}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={`mx-auto mt-5 max-w-2xl text-base leading-8 md:text-lg ${
            light ? "text-[#D8C4A4]" : "text-[#5C4A38]"
          }`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

function GoldRule({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`mx-auto my-2 h-px w-24 ${light ? "ww-mkt-shimmer-line opacity-80" : "bg-gradient-to-l from-transparent via-[#C9A962] to-transparent"}`}
      aria-hidden
    />
  );
}

function ScrollDemoVideo({ reduce }: { reduce: boolean | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const poster = SCROLL_VIDEO.poster;
  const heroTemplate = getWeddingTemplate(HERO_DEMO_TEMPLATE_ID)!;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce || failed) return;
    const play = () => {
      el.play().catch(() => setFailed(true));
    };
    play();
  }, [reduce, failed]);

  if (failed) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#F7F1E6]">
        <DesktopLiveFrame template={heroTemplate} />
        <p className="px-5 py-4 text-center text-sm text-[#7A6550]">
          תצוגה חיה של אתר הדמו —{" "}
          <Link href={`/wedding-website/${heroTemplate.id}`} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            פתיחת הדוגמה המלאה
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1A1510] shadow-[0_28px_80px_rgba(36,24,16,0.22)]">
      <video
        ref={videoRef}
        className="aspect-[16/10] w-full object-cover object-top"
        poster={poster}
        muted
        playsInline
        loop={!reduce}
        controls
        preload="metadata"
        onError={() => setFailed(true)}
      >
        <source src={SCROLL_VIDEO.src} type="video/webm" />
      </video>
      <p className="border-t border-white/10 bg-[#241E18] px-5 py-3 text-center text-xs font-semibold text-[#C9B89A]">
        הקלטת מסך אמיתית מתוך תבנית דמו עובדת · ללא קול
      </p>
    </div>
  );
}

export default function WeddingWebsiteMarketingPage() {
  const reduce = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroTemplate = getWeddingTemplate(HERO_DEMO_TEMPLATE_ID)!;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return (
    <div dir="rtl" className={`${display.variable} bg-[#FBF6EE] text-[#2C241C]`}>
      {/* HERO */}
      <section className="relative isolate overflow-hidden px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#E9D4AF_0%,transparent_36%),radial-gradient(circle_at_top_left,#F5E8D3_0%,transparent_32%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_50%,#F1E4D2_100%)]" />
        <div className="absolute left-[8%] top-24 -z-10 h-64 w-64 rounded-full bg-[#D8B77C]/18 blur-3xl" />
        <div className="absolute bottom-10 right-[6%] -z-10 h-72 w-72 rounded-full bg-[#8B3A4A]/10 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.7 }}>
            <nav aria-label="מיקום בעמוד" className="mb-5 text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                בית
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <span>אתר חתונה</span>
            </nav>

            <p className="mb-2 font-[family-name:var(--font-ww-display)] text-4xl text-[#8A642E] md:text-5xl">
              Invistimo
            </p>
            <p className="mb-4 text-sm font-bold tracking-[0.22em] text-[#A77A38]">
              אתר חתונה אישי
            </p>

            <h1 className="font-[family-name:var(--font-ww-display)] text-[1.85rem] font-medium leading-[1.22] text-[#241E18] sm:text-4xl md:text-5xl lg:text-[3.05rem]">
              {WW_H1}
            </h1>

            <p className="mt-5 text-lg font-medium leading-8 text-[#5C4A38] md:text-xl md:leading-9">
              אתר חתונה מעוצב שמרכז את כל מה שהאורחים צריכים לדעת — ונותן לסיפור שלכם מקום מיוחד משלו.
            </p>

            <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A38] md:text-lg">
              <p>
                מהרגע שבו אתם מודיעים על התאריך ועד ליום החתונה, אתר חתונה אישי מאפשר לכם לשתף את האורחים בפרטים
                החשובים בצורה יפה, מסודרת ונוחה.
              </p>
              <p className="hidden sm:block">
                פרטי האירוע, מיקום, ניווט, לוח זמנים, תמונות ותוכן אישי — הכול במקום אחד, בעיצוב שמתאים לכם.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => scrollTo("gallery")} className={primaryCta}>
                גלו את אתרי החתונה
              </button>
              <button type="button" onClick={() => scrollTo("examples")} className={secondaryCta}>
                צפו בדוגמאות
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12 }}
            className="min-w-0"
          >
            {reduce ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DesktopLiveFrame template={heroTemplate} />
                <MobileLiveFrame template={heroTemplate} />
              </div>
            ) : (
              <HeroDeviceDuo template={heroTemplate} />
            )}
            <p className="mt-4 text-center text-xs font-semibold text-[#8A7458]">
              תצוגה חיה מתוך תבנית {heroTemplate.name} · נתוני דמו בלבד
            </p>
          </motion.div>
        </div>
      </section>

      {/* WHAT IS A WEDDING WEBSITE */}
      <SectionShell id="what-is">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="מה זה אתר חתונה" title="הרבה יותר מהזמנה דיגיטלית" />
          <div className="mx-auto max-w-3xl space-y-5 text-base leading-8 text-[#5C4A38] md:text-lg">
            <p>הזמנה דיגיטלית מספרת לאורחים מתי ואיפה החתונה מתקיימת.</p>
            <p>
              אתר חתונה אישי יכול להציע חוויה רחבה יותר: מקום אחד שבו אפשר להציג את הסיפור שלכם, לשתף תמונות, להציג
              את פרטי האירוע, להוסיף מידע שימושי ולעזור לאורחים להתכונן ליום הגדול.
            </p>
            <p>
              במקום לשלוח שוב ושוב את אותן תשובות לגבי כתובת, שעות או ניווט, אפשר להפנות את האורחים לעמוד אחד מסודר.
            </p>
          </div>

          <div className="mt-14 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white/60 shadow-[0_20px_60px_rgba(91,63,32,0.08)]">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <DesktopLiveFrame template={heroTemplate} className="rounded-none border-0 shadow-none" />
              <div className="flex flex-col justify-center gap-4 border-t border-[#E6D2AA] p-6 md:p-8 lg:border-r lg:border-t-0">
                <p className="text-sm font-bold tracking-[0.16em] text-[#A77A38]">מה רואים באתר מלא</p>
                <ul className="space-y-3 text-sm leading-7 text-[#5C4A38] md:text-base">
                  {[
                    "שמות בני הזוג",
                    "תאריך האירוע",
                    "תמונה זוגית",
                    "הסיפור שלנו",
                    "פרטי האירוע",
                    "מיקום וניווט",
                    "לוח זמנים",
                    "גלריה",
                    "מידע לאורחים",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A962]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs leading-6 text-[#8A7458]">
                  הרכיבים המוצגים כאן נתמכים בתבניות הדמו של המוצר. התוכן בדוגמאות הוא נתוני דמו בלבד.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* COMPARISON */}
      <SectionShell id="difference" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="הבהרה חשובה"
            title="אתר חתונה, הזמנה דיגיטלית ואישור הגעה — מה ההבדל?"
            lede="שלושה רכיבים שונים שיכולים להשלים זה את זה — בלי לערבב ביניהם."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "אתר חתונה אישי",
                text: "עמוד חווייתי שניתן לשתף עם האורחים, ובו מרוכזים פרטי החתונה ותוכן אישי של בני הזוג. מתאים להצגת הסיפור, תמונות, מידע שימושי ופרטי האירוע.",
              },
              {
                title: "הזמנה דיגיטלית",
                text: "מתמקדת בהזמנה עצמה — שמות בני הזוג, תאריך, מקום ושעת האירוע — בעיצוב שמתאים לסגנון החתונה.",
                href: "/invitations/chatuna",
                linkLabel: "להזמנות דיגיטליות",
              },
              {
                title: "קישור אישי לאישור הגעה",
                text: "מיועד לאורח או לרשומת מוזמנים מסוימת ומאפשר למסור תשובה להזמנה בהתאם לאפשרויות המערכת. זה אינו אותו דבר כמו אתר חתונה ציבורי או משותף.",
                href: "/rsvp/chatuna",
                linkLabel: "לאישורי הגעה",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-[24px] border border-[#E6D2AA]/90 bg-[#FFFDF8]/90 p-6 md:p-7">
                <h3 className="font-[family-name:var(--font-ww-display)] text-2xl text-[#241E18]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5C4A38] md:text-base">{card.text}</p>
                {"href" in card && card.href ? (
                  <Link href={card.href} className="mt-4 inline-block text-sm font-bold text-[#8A642E] underline-offset-4 hover:underline">
                    {card.linkLabel}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-12 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white/80">
            <table className="min-w-full text-right text-sm md:text-base">
              <caption className="sr-only">השוואה בין אתר חתונה, הזמנה דיגיטלית וקישור אישי</caption>
              <thead className="bg-[#F7F1E6] text-[#7A6042]">
                <tr>
                  <th scope="col" className="px-4 py-4 font-bold md:px-6">
                    מאפיין
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold md:px-6">
                    אתר חתונה
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold md:px-6">
                    הזמנה דיגיטלית
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold md:px-6">
                    קישור אישי
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-t border-[#EADDC8]">
                    <th scope="row" className="px-4 py-4 font-bold text-[#3F3025] md:px-6">
                      {row.feature}
                    </th>
                    <td className="px-4 py-4 text-[#5C4A38] md:px-6">{row.website}</td>
                    <td className="px-4 py-4 text-[#5C4A38] md:px-6">{row.invite}</td>
                    <td className="px-4 py-4 text-[#5C4A38] md:px-6">{row.personal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-7 text-[#8A7458]">
            אין להציג קישור RSVP אישי כאילו הוא אתר חתונה. באתר ציבורי לא חושפים שמות אורחים, מספרי טלפון או נתוני RSVP.
          </p>
        </div>
      </SectionShell>

      {/* GALLERY */}
      <SectionShell id="gallery">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="גלריית אתרי חתונה"
            title="כל סיפור אהבה ראוי לאתר משלו"
            lede="הכירו מבחר עיצובים לאתרי חתונה — מסגנון קלאסי ורומנטי ועד מראה מודרני ומינימליסטי."
          />
          <p className="mx-auto mb-14 max-w-2xl text-center text-sm leading-7 text-[#7A6550]">
            ארבע תבניות נבחרות מתוך המערכת — כל אחת בתצוגה גדולה עם דסקטופ ומובייל. כל כפתור מוביל לדוגמת דמו תקינה
            עם נתונים מדומים בלבד.
          </p>

          <div id="examples" className="space-y-24 md:space-y-32">
            {FEATURED_STYLES.map((style, index) => {
              const template = getFeaturedTemplate(style);
              return (
                <FeaturedTemplateShowcase
                  key={style.templateId}
                  template={template}
                  styleName={style.styleName}
                  styleNameHe={style.styleNameHe}
                  description={style.description}
                  mood={style.mood}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* SCROLL VIDEO */}
      <SectionShell id="feel" dark>
        <div className="mx-auto max-w-5xl">
          <SectionHead
            eyebrow="חוויית גלישה"
            title="תראו איך האתר שלכם יכול להרגיש"
            lede="גלילה בתוך אתר חתונה אמיתי: כניסה, Hero, סיפור, גלריה, פרטי אירוע, מיקום וסיום."
            light
          />
          <GoldRule light />
          <div className="mt-10">
            <ScrollDemoVideo reduce={reduce} />
          </div>
        </div>
      </SectionShell>

      {/* CUSTOM DESIGN */}
      <SectionShell id="custom">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative overflow-hidden rounded-[28px]">
              <Image
                src="/images/rsvp/guides/wedding-planning/flowers.jpg"
                alt="עיצוב פרחוני לחתונה — השראה לאתר חתונה אישי"
                width={1200}
                height={900}
                className="h-full min-h-[320px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#17120E]/55 to-transparent" />
            </div>
            <div>
              <p className="mb-3 text-sm font-bold tracking-[0.18em] text-[#A77A38]">עיצוב אישי</p>
              <h2 className="font-[family-name:var(--font-ww-display)] text-3xl font-medium leading-tight text-[#241E18] md:text-5xl">
                לא חייבים לבחור אתר שנראה כמו של כולם
              </h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A38] md:text-lg">
                <p>לכל זוג יש סיפור אחר, סגנון אחר וחזון אחר לחתונה.</p>
                <p>
                  לצד העיצובים המוכנים, ניתן להציע גם שירות עיצוב אתר חתונה בהתאמה אישית, בהתאם להיקף העבודה ולתיאום
                  מראש.
                </p>
                <p>
                  כך אפשר ליצור אתר שמתאים לשפה העיצובית של החתונה, לצבעים, לתמונות ולאווירה שבני הזוג רוצים להעביר.
                </p>
              </div>
              <ul className="mt-6 space-y-2">
                {CUSTOM_BENEFITS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#5C4A38] md:text-base">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B3A4A]/70" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/contact" className={primaryCta}>
                  מעוניינים באתר בעיצוב אישי?
                </Link>
                <p className="mt-3 text-xs leading-6 text-[#8A7458]">
                  נבדוק יחד מה אפשרי לפי הצורך. אין מחיר קבוע בעמוד זה — הפרטים מתואמים מראש.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* CAPABILITIES */}
      <SectionShell id="features" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="מה אפשר להציג"
            title="כל הפרטים החשובים, במקום אחד"
            lede="מקטעים אמיתיים שנתמכים בתבניות אתר החתונה של Invistimo — לא רק אייקונים."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SITE_CAPABILITIES.map((item, i) => {
              const images = [
                "/images/rsvp/guides/wedding-planning/couple.jpg",
                "/images/rsvp/guides/wedding-planning/bridal.jpg",
                "/images/rsvp/guides/wedding-planning/venue.jpg",
                "/images/rsvp/guides/wedding-planning/rings.jpg",
                "/images/rsvp/guides/wedding-planning/toast.jpg",
                "/images/rsvp/guides/wedding-planning/hall-tables.jpg",
              ];
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[24px] border border-[#E6D2AA]/80 bg-[#FFFDF8]/90"
                >
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={images[i % images.length]}
                      alt={`${item.title} — דוגמה ויזואלית לאתר חתונה`}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5 md:p-6">
                    <h3 className="font-[family-name:var(--font-ww-display)] text-2xl text-[#241E18]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#5C4A38] md:text-base">{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* MOBILE */}
      <SectionShell id="mobile">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="order-2 lg:order-1">
            <MobileLiveFrame template={heroTemplate} className="max-w-[320px]" />
          </div>
          <div className="order-1 lg:order-2">
            <p className="mb-3 text-sm font-bold tracking-[0.18em] text-[#A77A38]">חוויית מובייל</p>
            <h2 className="font-[family-name:var(--font-ww-display)] text-3xl font-medium leading-tight text-[#241E18] md:text-5xl">
              אתר חתונה שנראה נפלא גם בטלפון
            </h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A38] md:text-lg">
              <p>רוב האורחים צפויים לפתוח את הקישור מהטלפון שלהם.</p>
              <p>
                לכן אתר חתונה צריך להיות נוח לקריאה, מהיר לטעינה ופשוט לניווט גם במסך קטן.
              </p>
              <p>
                המידע החשוב צריך להיות זמין בלי מאמץ — מהתאריך והשעה ועד הכתובת והניווט לאולם.
              </p>
            </div>
            <Link
              href={`/wedding-website/${heroTemplate.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${secondaryCta} mt-8`}
            >
              פתיחת דוגמה במובייל
            </Link>
          </div>
        </div>
      </SectionShell>

      {/* PROCESS */}
      <SectionShell id="how" dark>
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="איך זה עובד"
            title="מהרעיון שלכם לאתר חתונה אישי"
            light
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step) => (
              <div key={step.step} className="rounded-[24px] border border-[#C9A962]/25 bg-white/[0.03] p-6">
                <p className="font-[family-name:var(--font-ww-display)] text-3xl text-[#E8D1A5]">{step.step}</p>
                <h3 className="mt-3 font-[family-name:var(--font-ww-display)] text-2xl text-[#F7F1E6]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#D8C4A4]">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-[#B9A48A]">
            יצירת האתר מתבצעת בעורך הוויזואלי של Invistimo במסגרת השירות. אם תרצו ליווי או עיצוב מותאם — אפשר לפנות
            אלינו.
          </p>
        </div>
      </SectionShell>

      {/* WHEN */}
      <SectionShell id="when">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHead
            eyebrow="תזמון"
            title="מתי הזמן המתאים ליצור אתר חתונה?"
          />
          <div className="space-y-5 text-base leading-8 text-[#5C4A38] md:text-lg">
            <p>מומלץ להתחיל לאחר שנקבעו התאריך ומקום האירוע.</p>
            <p>
              כך אפשר להכין את האתר בנחת, לבחור תמונות, לנסח תוכן אישי ולבדוק את הפרטים לפני השיתוף.
            </p>
            <p>אין צורך להמתין לשבועות האחרונים כדי לבחור עיצוב ולהכין את התוכן.</p>
            <p>
              אם פרטים מסוימים עדיין לא סופיים, אפשר לעדכן אותם בהמשך דרך העורך ולפרסם מחדש.
            </p>
          </div>
          <p className="mt-8 text-sm leading-7 text-[#7A6550]">
            למידע נוסף על תזמון מול האורחים ראו גם את{" "}
            <Link href="/info/guides/wedding-planning" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              מדריך תכנון החתונה
            </Link>
            .
          </p>
        </div>
      </SectionShell>

      {/* WHY */}
      <SectionShell id="why" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="למה אתר חתונה"
            title="חוויה אישית שמתחילה הרבה לפני החופה"
          />
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {WHY_COUPLES.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-[#E6D2AA]/80 bg-[#FFFDF8]/90 px-5 py-4 text-sm font-semibold leading-7 text-[#3F3025] md:text-base"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* AEO natural Q&A strip */}
      <SectionShell id="answers">
        <div className="mx-auto max-w-4xl">
          <SectionHead
            eyebrow="שאלות נפוצות בקצרה"
            title="תשובות ברורות לשאלות שזוגות שואלים"
          />
          <div className="space-y-6">
            {AEO_ANSWERS.map((item) => (
              <div key={item.q} className="border-b border-[#EADDC8] pb-6">
                <h3 className="font-[family-name:var(--font-ww-display)] text-xl text-[#241E18] md:text-2xl">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A38] md:text-base">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* FAQ accordion */}
      <SectionShell id="faq" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-3xl">
          <SectionHead eyebrow="FAQ" title="שאלות נפוצות על אתר חתונה" />
          <div className="space-y-3">
            {WW_FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-[20px] border border-[#E6D2AA] bg-[#FFFDF8]"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
                  >
                    <span className="text-sm font-bold leading-7 text-[#241E18] md:text-base">{item.q}</span>
                    <span className="shrink-0 text-lg text-[#A77A38]" aria-hidden>
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-[#EADDC8] px-5 py-4 text-sm leading-7 text-[#5C4A38] md:text-base">
                      {item.a}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* INTERNAL LINKS */}
      <SectionShell id="related">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="המשך הדרך"
            title="שירותים ומדריכים שמשלימים את אתר החתונה"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {INTERNAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-[#DCC7A6] bg-white/80 px-5 py-3 text-sm font-bold text-[#5E4735] transition hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* FINAL CTA */}
      <SectionShell id="cta" dark className="overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#C9A96222_0%,transparent_45%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-ww-display)] text-3xl font-medium leading-tight text-[#F7F1E6] md:text-5xl">
            החתונה שלכם ראויה לאתר שמרגיש בדיוק כמוכם
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#D8C4A4] md:text-lg">
            בחרו עיצוב מתוך התבניות הקיימות או פנו אלינו כדי לבדוק אפשרות לאתר חתונה בעיצוב אישי.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => scrollTo("gallery")} className={primaryCta}>
              צפו בעיצובים
            </button>
            <Link href="/contact" className={darkSecondaryCta}>
              לקבלת פרטים על עיצוב אישי
            </Link>
          </div>
        </div>
      </SectionShell>
    </div>
  );
}
