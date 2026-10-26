"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import MarketingVideo from "@/app/(marketing)/rsvp/components/MarketingVideo";
import DevicePreviewPair from "./components/DevicePreviewPair";
import FeaturedTemplateShowcase from "./components/FeaturedTemplateShowcase";
import LiveSiteFrame from "./components/LiveSiteFrame";
import { WEDDING_WEBSITE_FAQS } from "./weddingFaqs";
import {
  COMPARE_ROWS,
  CUSTOM_DESIGN_POINTS,
  SITE_ANATOMY,
  STEPS,
  VERIFIED_CAPABILITIES,
  WHY_ITEMS,
  WW_LINKS,
  WW_MEDIA,
  WW_PATH,
  resolveFeaturedStyles,
  resolveHeroTemplate,
} from "./content";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[#2A2118] px-8 py-3.5 text-base font-black text-[#F7F1E8] shadow-[0_18px_40px_rgba(42,33,24,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3D2E22]";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#D4C0A0] bg-[#FFFDF8]/90 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";
const ctaOnDark =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[#E8D5A8] px-8 py-3.5 text-base font-black text-[#2A2118] transition hover:-translate-y-0.5 hover:bg-[#F3E6C4]";
const ctaOnDarkSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 py-3.5 text-base font-black text-[#F7F1E8] transition hover:bg-white/10";

function Eyebrow({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      className={`text-sm font-black tracking-[0.16em] ${
        onDark ? "text-[#E8D5A8]" : "text-[#7A5530]"
      }`}
    >
      {children}
    </p>
  );
}

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function WeddingWebsiteMarketingPage() {
  const reduce = useReducedMotion();
  const heroTemplate = resolveHeroTemplate();
  const featured = resolveFeaturedStyles();
  const videoExistsHint = WW_MEDIA.video.src;

  return (
    <article
      dir="rtl"
      className="ww-marketing min-h-screen overflow-x-clip bg-[#F7F1E8] text-[#3F3025]"
    >
      {/* HERO */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 12% 8%, rgba(201,169,98,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 92% 0%, rgba(122,42,54,0.08), transparent 50%), linear-gradient(180deg, #FFFDF8 0%, #F3EBE0 42%, #F7F1E8 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
            mixBlendMode: "soft-light",
          }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-6 md:gap-14 md:px-8 md:pb-24 md:pt-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <nav aria-label="מיקום בעמוד" className="mb-5 text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                ראשי
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <span>אתר חתונה</span>
            </nav>

            <p className="font-['Cormorant_Garamond'] text-3xl font-semibold tracking-tight text-[#2A2118] md:text-4xl">
              Invistimo
            </p>
            <p className="mt-3 text-sm font-black tracking-[0.16em] text-[#7A5530]">
              אתר חתונה אישי
            </p>

            <h1 className="mt-4 max-w-xl font-['Cormorant_Garamond'] text-[2.05rem] font-semibold leading-[1.12] text-[#2A2118] md:text-[2.75rem]">
              הסיפור שלכם. האתר שלכם. החתונה שלכם.
            </h1>

            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              אתר חתונה מעוצב שמרכז את כל מה שהאורחים צריכים לדעת — ונותן לסיפור שלכם מקום
              מיוחד משלו.
            </p>

            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                מהרגע שבו אתם מודיעים על התאריך ועד ליום החתונה, אתר חתונה אישי מאפשר לכם
                לשתף את האורחים בפרטים החשובים בצורה יפה, מסודרת ונוחה.
              </p>
              <p>
                פרטי האירוע, מיקום, ניווט, לוח זמנים, תמונות ותוכן אישי — הכול במקום אחד,
                בעיצוב שמתאים לכם.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href="#gallery"
                className={ctaPrimary}
                location={`hero_gallery:${WW_PATH}`}
              >
                גלו את אתרי החתונה
              </TrackedCtaLink>
              <a href="#examples" className={ctaSecondary}>
                צפו בדוגמאות
              </a>
            </div>
          </div>

          <div className="relative pb-10 sm:pb-12">
            {reduce ? (
              <DevicePreviewPair
                templateId={heroTemplate.id}
                name={heroTemplate.name}
                posterSrc={heroTemplate.heroImage || heroTemplate.previewImage}
                eager
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <DevicePreviewPair
                  templateId={heroTemplate.id}
                  name={heroTemplate.name}
                  posterSrc={heroTemplate.heroImage || heroTemplate.previewImage}
                  eager
                />
              </motion.div>
            )}
            <p className="mt-10 text-center text-xs font-semibold text-[#7A6042] sm:mt-12 sm:text-right">
              תצוגה חיה מתבנית {heroTemplate.name} · נתוני דמו · לא לקוח אמיתי
            </p>
          </div>
        </div>
      </header>

      {/* WHAT IS */}
      <section
        id="what-is"
        aria-labelledby="what-is-heading"
        className="relative bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <FadeIn>
            <Eyebrow>הרבה יותר מהזמנה</Eyebrow>
            <h2
              id="what-is-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#2A2118] md:text-5xl"
            >
              הרבה יותר מהזמנה דיגיטלית
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                הזמנה דיגיטלית מספרת לאורחים מתי ואיפה החתונה מתקיימת.
              </p>
              <p>
                אתר חתונה אישי יכול להציע חוויה רחבה יותר: מקום אחד שבו אפשר להציג את
                הסיפור שלכם, לשתף תמונות, להציג את פרטי האירוע, להוסיף מידע שימושי ולעזור
                לאורחים להתכונן ליום הגדול.
              </p>
              <p>
                במקום לשלוח שוב ושוב את אותן תשובות לגבי כתובת, שעות או ניווט, אפשר להפנות
                את האורחים לעמוד אחד מסודר.
              </p>
            </div>
            <ul className="mt-8 columns-1 gap-x-8 sm:columns-2">
              {SITE_ANATOMY.map((item) => (
                <li
                  key={item}
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#5E4735]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C9A962]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>

          <FadeIn delay={0.08} className="overflow-hidden rounded-[24px] border border-[#D9C7A8]/70 bg-[#16120E] shadow-[0_30px_80px_rgba(42,30,18,0.16)]">
            <LiveSiteFrame
              templateId={heroTemplate.id}
              title="מבנה אתר חתונה מלא — תצוגה חיה"
              variant="desktop"
              frameHeight={620}
              posterSrc={heroTemplate.heroImage || heroTemplate.previewImage}
              className="[--ww-preview-scale:0.55] md:[--ww-preview-scale:0.64]"
            />
          </FadeIn>
        </div>
      </section>

      {/* COMPARISON */}
      <section
        id="compare"
        aria-labelledby="compare-heading"
        className="bg-[#2A2118] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow onDark>הבחנה חשובה</Eyebrow>
            <h2
              id="compare-heading"
              className="mt-3 max-w-3xl font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#FFF8EF] md:text-5xl"
            >
              אתר חתונה, הזמנה דיגיטלית ואישור הגעה — מה ההבדל?
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "אתר חתונה אישי",
                text: "עמוד חווייתי שניתן לשתף עם האורחים, ובו מרוכזים פרטי החתונה ותוכן אישי של בני הזוג. מתאים להצגת הסיפור, תמונות, מידע שימושי ופרטי האירוע.",
              },
              {
                title: "הזמנה דיגיטלית",
                text: "מתמקדת בהזמנה עצמה — שמות בני הזוג, תאריך, מקום ושעת האירוע — בעיצוב שמתאים לסגנון החתונה.",
                href: WW_LINKS.invitations,
                linkLabel: "להזמנות דיגיטליות",
              },
              {
                title: "קישור אישי לאישור הגעה",
                text: "מיועד לאורח או לרשומת מוזמנים מסוימת ומאפשר למסור תשובה להזמנה בהתאם לאפשרויות המערכת. זה אינו אותו דבר כמו אתר חתונה ציבורי או משותף.",
                href: WW_LINKS.rsvpWedding,
                linkLabel: "לאישורי הגעה לחתונה",
              },
            ].map((col, i) => (
              <FadeIn key={col.title} delay={i * 0.06}>
                <div className="h-full border-t border-[#C9A962]/35 pt-6">
                  <h3 className="font-['Cormorant_Garamond'] text-2xl font-semibold text-[#E8D5A8]">
                    {col.title}
                  </h3>
                  <p className="mt-4 text-[15px] leading-7 text-[#D8CBB8]">{col.text}</p>
                  {"href" in col && col.href ? (
                    <Link
                      href={col.href}
                      className="mt-5 inline-block text-sm font-bold text-[#E8D5A8] underline-offset-4 hover:underline"
                    >
                      {col.linkLabel}
                    </Link>
                  ) : null}
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-14 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-right text-sm md:text-base">
              <caption className="sr-only">
                השוואה בין אתר חתונה, הזמנה דיגיטלית וקישור אישי לאישור הגעה
              </caption>
              <thead>
                <tr className="border-b border-[#C9A962]/35 text-[#E8D5A8]">
                  <th scope="col" className="py-3 pl-3 font-black">
                    מאפיין
                  </th>
                  <th scope="col" className="py-3 pl-3 font-black">
                    אתר חתונה
                  </th>
                  <th scope="col" className="py-3 pl-3 font-black">
                    הזמנה דיגיטלית
                  </th>
                  <th scope="col" className="py-3 font-black">
                    קישור אישי
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-white/10 text-[#D8CBB8]">
                    <th scope="row" className="py-3.5 pl-3 font-bold text-[#F7F1E8]">
                      {row.feature}
                    </th>
                    <td className="py-3.5 pl-3">{row.website}</td>
                    <td className="py-3.5 pl-3">{row.invite}</td>
                    <td className="py-3.5">{row.personal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FadeIn>

          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#B9A992]">
            חשוב: קישור RSVP אישי אינו אתר חתונה. באתר ציבורי משותף לא מוצגים שמות אורחים,
            מספרי טלפון או נתוני RSVP.
          </p>
        </div>
      </section>

      {/* GALLERY */}
      <section
        id="gallery"
        aria-labelledby="gallery-heading"
        className="relative bg-[#F7F1E8] px-5 py-16 md:px-8 md:py-24"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#E8D5A8]/25 to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <FadeIn className="mx-auto max-w-3xl text-center">
            <Eyebrow>גלריית עיצובים</Eyebrow>
            <h2
              id="gallery-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#2A2118] md:text-5xl"
            >
              כל סיפור אהבה ראוי לאתר משלו
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
              הכירו מבחר עיצובים לאתרי חתונה — מסגנון קלאסי ורומנטי ועד מראה מודרני
              ומינימליסטי. כל תצוגה היא תבנית אמיתית ועובדת במערכת, עם נתוני דמו.
            </p>
          </FadeIn>

          <div id="examples" className="mt-16 scroll-mt-24">
            <FeaturedTemplateShowcase styles={featured} />
          </div>
        </div>
      </section>

      {/* SCROLL VIDEO */}
      <section
        id="scroll-video"
        aria-labelledby="video-heading"
        className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center">
            <Eyebrow>חוויית גלילה</Eyebrow>
            <h2
              id="video-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-5xl"
            >
              תראו איך האתר שלכם יכול להרגיש
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              סרטון הדגמה מהקלטת מסך של אתר דמו אמיתי: כניסה, Hero עם שמות ותמונה, סיפור
              אישי, גלריה, פרטי אירוע, מיקום וסיום. ללא קול אוטומטי.
            </p>
          </FadeIn>

          <FadeIn className="mt-10 overflow-hidden rounded-[24px] border border-[#D9C7A8]/70 shadow-[0_28px_70px_rgba(42,30,18,0.12)]">
            <MarketingVideo
              src={videoExistsHint}
              poster={WW_MEDIA.video.poster}
              title={WW_MEDIA.video.title}
              className="aspect-[16/10] w-full"
            />
          </FadeIn>
          <p className="mt-4 text-center text-xs font-semibold text-[#7A6042]">
            הקלטה מתבנית {heroTemplate.name} · נתוני דמו · מושתק כברירת מחדל
          </p>
          <p className="mt-3 text-center text-sm">
            <Link
              href={`/wedding-website/${heroTemplate.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#7A5530] underline-offset-4 hover:underline"
            >
              או פתחו את האתר המלא לגלילה חיה
            </Link>
          </p>
        </div>
      </section>

      {/* CUSTOM DESIGN */}
      <section
        id="custom"
        aria-labelledby="custom-heading"
        className="relative overflow-hidden bg-[#3D1F28] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-24"
      >
        <div
          className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#C9A962]/15 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl">
          <FadeIn>
            <Eyebrow onDark>עיצוב אישי</Eyebrow>
            <h2
              id="custom-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#FFF8EF] md:text-5xl"
            >
              לא חייבים לבחור אתר שנראה כמו של כולם
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#E5D5C8] md:text-lg">
              <p>לכל זוג יש סיפור אחר, סגנון אחר וחזון אחר לחתונה.</p>
              <p>
                לצד העיצובים המוכנים, ניתן להציע גם שירות עיצוב אתר חתונה בהתאמה אישית,
                בהתאם להיקף העבודה ולתיאום מראש.
              </p>
              <p>
                כך אפשר ליצור אתר שמתאים לשפה העיצובית של החתונה, לצבעים, לתמונות ולאווירה
                שבני הזוג רוצים להעביר.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {CUSTOM_DESIGN_POINTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-[#F0E4D8]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8D5A8]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <TrackedCtaLink
                href={WW_LINKS.contact}
                className={ctaOnDark}
                location={`custom_contact:${WW_PATH}`}
              >
                מעוניינים באתר בעיצוב אישי?
              </TrackedCtaLink>
            </div>
            <p className="mt-4 text-sm text-[#C4AFA3]">
              הפרטים וההיקף נקבעים בתיאום. לא כל בקשת עיצוב אפשרית בכל מסגרת.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="bg-[#F3EBE0] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <Eyebrow>מה אפשר להציג</Eyebrow>
            <h2
              id="features-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-5xl"
            >
              כל הפרטים החשובים, במקום אחד
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
              הרכיבים למטה מבוססים על מקטעים שקיימים בפועל בתבניות הדמו — לא הבטחות
              שיווקיות בלי כיסוי במוצר.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <FadeIn className="relative aspect-[4/5] overflow-hidden rounded-[24px]">
              <Image
                src={WW_MEDIA.anatomy}
                alt="אווירת קבלת פנים בחתונה — המחשה ויזואלית לאתר חתונה אישי"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </FadeIn>
            <div className="space-y-8">
              {VERIFIED_CAPABILITIES.map((cap, i) => (
                <FadeIn key={cap.id} delay={i * 0.04}>
                  <div className="border-b border-[#D4C0A0]/70 pb-6">
                    <h3 className="font-['Cormorant_Garamond'] text-2xl font-semibold text-[#2A2118]">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{cap.text}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE */}
      <section
        id="mobile"
        aria-labelledby="mobile-heading"
        className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
          <FadeIn>
            <Eyebrow>חוויית מובייל</Eyebrow>
            <h2
              id="mobile-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-5xl"
            >
              אתר חתונה שנראה נפלא גם בטלפון
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>רוב האורחים צפויים לפתוח את הקישור מהטלפון שלהם.</p>
              <p>
                לכן אתר חתונה צריך להיות נוח לקריאה, מהיר לטעינה ופשוט לניווט גם במסך קטן.
              </p>
              <p>
                המידע החשוב צריך להיות זמין בלי מאמץ — מהתאריך והשעה ועד הכתובת והניווט
                לאולם.
              </p>
            </div>
          </FadeIn>

          <FadeIn className="mx-auto w-full max-w-[320px]">
            <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#0D0A08] shadow-[0_36px_80px_rgba(28,22,18,0.28)]">
              <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/20" aria-hidden />
              <LiveSiteFrame
                templateId={heroTemplate.id}
                title="תצוגת מובייל גדולה של אתר חתונה"
                variant="mobile"
                frameHeight={640}
                posterSrc={heroTemplate.previewImage || heroTemplate.heroImage}
                className="[--ww-preview-scale:0.78]"
              />
            </div>
            <p className="mt-4 text-center text-xs font-semibold text-[#7A6042]">
              תצוגה חיה · מסגרת עדינה בלי להקטין את התוכן לקריאות בלתי אפשרית
            </p>
          </FadeIn>
        </div>
      </section>

      {/* HOW TO */}
      <section
        id="how"
        aria-labelledby="how-heading"
        className="bg-[#F7F1E8] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center">
            <Eyebrow>התהליך</Eyebrow>
            <h2
              id="how-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-5xl"
            >
              מהרעיון שלכם לאתר חתונה אישי
            </h2>
          </FadeIn>
          <ol className="mt-12 grid gap-8 md:grid-cols-2">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.05}>
                <li className="relative pr-2">
                  <p className="font-['Cormorant_Garamond'] text-5xl font-semibold text-[#C9A962]/55">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#2A2118]">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{step.text}</p>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {/* WHEN */}
      <section
        id="when"
        aria-labelledby="when-heading"
        className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20"
      >
        <FadeIn className="mx-auto max-w-3xl">
          <Eyebrow>תזמון</Eyebrow>
          <h2
            id="when-heading"
            className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-4xl"
          >
            מתי הזמן המתאים ליצור אתר חתונה?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>מומלץ להתחיל לאחר שנקבעו התאריך ומקום האירוע.</p>
            <p>
              כך אפשר להכין את האתר בנחת, לבחור תמונות, לנסח תוכן אישי ולבדוק את הפרטים
              לפני השיתוף.
            </p>
            <p>אין צורך להמתין לשבועות האחרונים כדי לבחור עיצוב ולהכין את התוכן.</p>
            <p>
              אם פרטים מסוימים עדיין לא סופיים, כדאי לוודא מה ניתן לעדכן בהמשך בהתאם
              לשירות.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* WHY */}
      <section
        id="why"
        aria-labelledby="why-heading"
        className="bg-[#2A2118] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <Eyebrow onDark>למה אתר חתונה</Eyebrow>
            <h2
              id="why-heading"
              className="mt-3 max-w-3xl font-['Cormorant_Garamond'] text-3xl font-semibold text-[#FFF8EF] md:text-5xl"
            >
              חוויה אישית שמתחילה הרבה לפני החופה
            </h2>
          </FadeIn>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {WHY_ITEMS.map((item, i) => (
              <FadeIn key={item} delay={i * 0.03}>
                <li className="border-t border-[#C9A962]/30 pt-4 text-base font-semibold leading-7 text-[#E8DCCE]">
                  {item}
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      {/* GEO answers strip — natural Q&A visible in content */}
      <section
        id="geo"
        aria-labelledby="geo-heading"
        className="bg-[#F3EBE0] px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>שאלות נפוצות בקצרה</Eyebrow>
            <h2
              id="geo-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-4xl"
            >
              תשובות ברורות לשאלות שזוגות שואלים
            </h2>
          </FadeIn>
          <div className="mt-10 space-y-8">
            {[
              {
                q: "מה זה אתר חתונה?",
                a: "עמוד אישי ומעוצב שמרכז פרטי אירוע, סיפור זוגי, תמונות ומידע שימושי לאורחים — מעבר להזמנה בלבד.",
              },
              {
                q: "למה צריך אתר חתונה?",
                a: "כדי לתת לאורחים מקום אחד מסודר לפרטים, להפחית שאלות חוזרות, ולשתף את הסיפור שלכם בצורה יפה.",
              },
              {
                q: "האם אתר חתונה מתאים גם לאירוע קטן?",
                a: "כן. גם באירוע אינטימי אפשר לשתף תאריך, מיקום, תמונות ומידע חשוב בקישור אחד.",
              },
              {
                q: "מה כדאי לכלול באתר חתונה?",
                a: "שמות, תאריך ושעה, מיקום וניווט, סיפור או טקסט אישי, גלריה, לוח זמנים ומידע לאורחים — לפי מה שהתבנית תומכת.",
              },
              {
                q: "איך משתפים אתר חתונה?",
                a: "שולחים את קישור האתר בערוץ המועדף. זה קישור משותף, נפרד מקישור RSVP אישי.",
              },
            ].map((item) => (
              <FadeIn key={item.q}>
                <div>
                  <h3 className="text-lg font-black text-[#2A2118]">{item.q}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>שאלות נפוצות</Eyebrow>
            <h2
              id="faq-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#2A2118] md:text-4xl"
            >
              שאלות על אתר חתונה אישי
            </h2>
          </FadeIn>
          <div className="mt-10 space-y-3">
            {WEDDING_WEBSITE_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[22px] border border-[#E7D3B0] bg-[#F7F1E8]/80 px-5 py-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    {item.q}
                    <span className="text-[#C9A45C] transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS + CTA */}
      <section
        id="cta"
        aria-labelledby="cta-heading"
        className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="cta-heading"
            className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#FFF8EF] md:text-5xl"
          >
            החתונה שלכם ראויה לאתר שמרגיש בדיוק כמוכם
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            בחרו עיצוב מתוך התבניות הקיימות או פנו אלינו כדי לבדוק אפשרות לאתר חתונה
            בעיצוב אישי.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink
              href="#gallery"
              className={ctaOnDark}
              location={`footer_gallery:${WW_PATH}`}
            >
              צפו בעיצובים
            </TrackedCtaLink>
            <TrackedCtaLink
              href={WW_LINKS.contact}
              className={ctaOnDarkSecondary}
              location={`footer_custom:${WW_PATH}`}
            >
              לקבלת פרטים על עיצוב אישי
            </TrackedCtaLink>
          </div>

          <nav
            aria-label="קישורים קשורים"
            className="mt-14 flex flex-wrap justify-center gap-3 text-sm"
          >
            {[
              { href: WW_LINKS.invitations, label: "הזמנות דיגיטליות" },
              { href: WW_LINKS.saveTheDate, label: "Save the Date" },
              { href: WW_LINKS.rsvpWedding, label: "אישורי הגעה" },
              { href: WW_LINKS.seating, label: "סידורי הושבה" },
              { href: WW_LINKS.weddingPlanning, label: "מדריך תכנון חתונה" },
              { href: WW_LINKS.guestList, label: "מדריך רשימת מוזמנים" },
              { href: WW_LINKS.pricing, label: "חבילות ומחירים" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-[#C9A962]/30 px-4 py-2 text-[#E8D1A5] transition hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </article>
  );
}
