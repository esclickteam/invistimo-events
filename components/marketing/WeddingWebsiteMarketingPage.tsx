"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import TemplateLivePreview from "@/components/wedding-website/TemplateLivePreview";
import DemoVideo from "@/components/marketing/DemoVideo";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import EventJourney from "@/components/marketing/EventJourney";
import { ctaPrimaryClass, ctaSecondaryClass } from "@/components/marketing/brand";
import AnswerFirst from "@/components/seo/AnswerFirst";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { PRODUCT_SHOTS } from "@/lib/seo/productVisuals";

const FEATURED = ["eternal-gold", "midnight-velvet", "garden-bloom"] as const;

const CAPABILITIES = [
  {
    title: "10 תבניות עיצוב",
    text: "כל תבנית עם פלטה, טיפוגרפיה ופריסה משלה — Eternal Gold, Midnight Velvet, Garden Bloom ועוד.",
  },
  {
    title: "עורך ויזואלי",
    text: "בחירת תבנית, סדר סקשנים, טקסטים, מדיה, צבעים וגופנים — עם טיוטה, תצוגה מקדימה ופרסום.",
  },
  {
    title: "חוויית אורח",
    text: "סיפור, גלריה, לו״ז, מיקום עם ניווט, אישור הגעה בקישור אישי, מתנות (כשמחוברות לאירוע) והודעות לזוג.",
  },
  {
    title: "חיבור להזמנה ול־RSVP",
    text: "האתר לא מחליף את ההזמנה הדיגיטלית או את סבבי האישור — הוא משלים אותם כשלב במסע האורח.",
  },
];

const GUEST_FLOW = [
  { title: "פותח את הקישור", text: "בלי אפליקציה — במחשב או בטלפון." },
  { title: "רואה את הפרטים", text: "תאריך, מיקום, לו״ז, גלריה וסיפור — לפי מה שפרסמתם." },
  { title: "מאשר הגעה", text: "בקישור האישי (עם token) — התשובה נשמרת במערכת האירוע." },
  { title: "אופציונלי", text: "הודעה לזוג, העלאת תמונות, או מתנה — לפי מה שמופעל בחשבון." },
];

const FAQS = [
  {
    q: "מה ההבדל בין אתר חתונה להזמנה דיגיטלית?",
    a: "ההזמנה הדיגיטלית היא המסר והקישור האישי ששולחים לאורח. אתר החתונה הוא עמוד מעוצב עם סקשנים (סיפור, גלריה, לו״ז, מיקום ועוד) שאליו אפשר להגיע מההזמנה או מקישור נפרד. שניהם יכולים להתקיים יחד.",
  },
  {
    q: "האם אתר החתונה אוסף אישורי הגעה?",
    a: "באתר החי (`/w/...`) סקשן RSVP עובד כשיש קישור אורח מותאם (token). התשובות נשמרות במערכת האירוע — לא כטופס דמו של הגלריה השיווקית.",
  },
  {
    q: "האם כל החבילות כוללות אתר חתונה?",
    a: "לא. אתר החתונה תלוי בהרשאה בחשבון (למשל מצב אתר אישי / פיצ׳ר weddingWebsite). אל תניחו שהוא כלול אוטומטית בכל חבילת הודעות — בדקו במחשבון ובחשבון שלכם.",
  },
  {
    q: "אפשר לראות דוגמאות חיות?",
    a: "כן. בעמוד הזה יש תצוגות חיות של התבניות, וניתן לפתוח כל תבנית במסך מלא. אלו אתרי דוגמה מהמוצר — לא אתרי לקוחות.",
  },
  {
    q: "מה האורח יכול לעשות באתר?",
    a: "לפי מה שמופעל: לצפות בתוכן, לנווט למיקום, לאשר הגעה בקישור האישי, לשלוח הודעה לזוג, להעלות מדיה, ולפתוח קישורי מתנות אם הוגדרו באירוע. בספרי הדוגמה הצעות פלייליסט הן תצוגה מקומית ולא נשמרות בשרת.",
  },
];

const CREATE_STEPS = [
  { title: "בוחרים תבנית", text: "מתוך עשר התבניות בעורך `/dashboard/wedding-website`." },
  { title: "עורכים תוכן ומדיה", text: "שמות, סיפור, גלריה, לו״ז, צבעים וגופנים — עם שמירת טיוטה." },
  { title: "תצוגה מקדימה", text: "בודקים במחשב ובמובייל לפני פרסום." },
  { title: "מפרסמים קישור אורח", text: "האתר החי נפתח ב־`/w/...` לאורחים." },
];

export default function WeddingWebsiteMarketingPage() {
  const featured = FEATURED.map((id) => WEDDING_TEMPLATES.find((t) => t.id === id)!).filter(Boolean);
  const rest = WEDDING_TEMPLATES.filter((t) => !FEATURED.includes(t.id as (typeof FEATURED)[number]));

  return (
    <main dir="rtl" className="overflow-x-hidden bg-[#0B0A09] text-white">
      {/* HERO */}
      <section className="relative isolate min-h-[88vh] overflow-hidden">
        <Image
          src={PRODUCT_SHOTS.weddingEternal}
          alt="תצוגת אתר חתונה Eternal Gold"
          fill
          priority
          className="object-cover object-top opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A09] via-[#0B0A09]/75 to-[#0B0A09]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,169,98,0.25),transparent_55%)]" />

        <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-20 md:pt-36">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold tracking-[0.28em] text-[#C9A962]"
          >
            INVISTIMO · אתר חתונה אישי
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-4 max-w-4xl font-['Cormorant_Garamond'] text-5xl font-light leading-[1.08] md:text-7xl"
          >
            אתר חתונה אישי
            <span className="mt-2 block font-semibold text-white/80">שמציג את האירוע — לא רק מאשר הגעה</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="mt-6 max-w-2xl text-lg leading-8 text-white/70"
          >
            תבניות חיות מהמערכת, עורך ויזואלי, וחוויית אורח שמחברת הזמנה דיגיטלית, פרטי האירוע ואישור הגעה —
            בלי לדרוש מהאורחים לאשר חודשים מראש.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <TrackedCtaLink
              href="#examples"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#C9A962] px-8 py-3 text-base font-black text-[#1A150F] transition hover:bg-[#D4B56E]"
              location="wedding_hero_examples"
            >
              לצפייה בדוגמאות חיות
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-8 py-3 text-base font-black text-white transition hover:bg-white/10"
              location="wedding_hero_pricing"
            >
              לבדוק זמינות בחבילות
            </TrackedCtaLink>
          </motion.div>
        </div>
      </section>

      {/* Device duo */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">מחשב וטלפון — אותו אתר</h2>
            <p className="mt-4 leading-8 text-white/65">
              התצוגות למטה הן מהתבניות החיות במערכת. האורח מקבל חוויה מלאה בלי להתקין אפליקציה.
            </p>
            <ul className="mt-8 space-y-4 text-white/80">
              {CAPABILITIES.map((c) => (
                <li key={c.title}>
                  <p className="font-black text-[#C9A962]">{c.title}</p>
                  <p className="mt-1 leading-7 text-white/65">{c.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-[1.2fr_0.7fr] items-end gap-4">
            <DeviceFrame src={PRODUCT_SHOTS.weddingEternal} alt="אתר חתונה Eternal Gold במחשב" variant="laptop" />
            <DeviceFrame
              src={PRODUCT_SHOTS.weddingEternalMobile}
              alt="אתר חתונה Eternal Gold בטלפון"
              variant="phone"
            />
          </div>
        </div>
      </section>

      <AnswerFirst path="/wedding-website" tone="dark" />

      {/* Featured examples */}
      <section id="examples" className="border-t border-white/10 bg-[#0F0D0B] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">3 דוגמאות חיות לפחות</h2>
          <p className="mt-4 max-w-2xl leading-8 text-white/65">
            כל כרטיס מציג תצוגה חיה של התבנית. «לצפייה באתר לדוגמה» פותח אתר מלא לדוגמה — אותה חוויה שהאורחים מקבלים.
          </p>
          <div className="mt-12 grid gap-10 lg:grid-cols-3">
            {featured.map((template, index) => (
              <TemplateLivePreview
                key={template.id}
                template={template}
                index={index}
                previewSrc={
                  template.id === "eternal-gold"
                    ? PRODUCT_SHOTS.weddingEternal
                    : template.id === "midnight-velvet"
                      ? PRODUCT_SHOTS.weddingMidnight
                      : template.id === "garden-bloom"
                        ? PRODUCT_SHOTS.weddingGarden
                        : undefined
                }
              />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            {featured.map((t) => (
              <Link
                key={t.id}
                href={`/wedding-website/${t.id}`}
                className="text-sm font-bold text-[#C9A962] underline-offset-4 hover:underline"
              >
                לצפייה באתר לדוגמה: {t.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Guest journey */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">חוויית האורח</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {GUEST_FLOW.map((step, i) => (
            <li key={step.title}>
              <span className="text-3xl font-black text-[#C9A962]/80">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-lg font-black">{step.title}</h3>
              <p className="mt-2 leading-7 text-white/65">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Demo video */}
      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">כך נראה אתר החתונה</h2>
        <p className="mt-3 leading-8 text-white/65">
          גלילה באתר אישי מעוצב — פרטי האירוע, ניווט, וחיבור לאישורי הגעה.
        </p>
        <div className="mt-8">
          <DemoVideo
            src="/marketing/videos/reel-wedding-website.webm"
            poster={PRODUCT_SHOTS.weddingEternal}
            caption="אתר חתונה אישי — חוויית אורח"
            className="[&_figcaption]:text-white/55"
          />
        </div>
      </section>

      {/* How to create */}
      <section className="border-y border-white/10 bg-[#12100E] px-5 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">איך יוצרים אתר חתונה</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {CREATE_STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-[#C9A962]/40 pt-5">
                <span className="text-sm font-black text-[#C9A962]">שלב {i + 1}</span>
                <h3 className="mt-2 text-lg font-black">{step.title}</h3>
                <p className="mt-2 leading-7 text-white/65">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-white/50">
            הערה: בספרי הדוגמה, ברכות והצעות פלייליסט הן תצוגה מקומית. באתר החי ההודעות לזוג הן שרשור פרטי עם
            קישור אורח אישי.
          </p>
        </div>
      </section>

      {/* Full journey — light band for contrast */}
      <div className="bg-[#FBF6EE]">
        <EventJourney activeId="wedding-website" />
      </div>

      {/* More templates */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">עוד תבניות באוסף</h2>
          <p className="mt-4 max-w-2xl text-white/65">כל התבניות למטה חיות — אותן רכיבי מוצר, עיצוב שונה.</p>
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            {rest.map((template, index) => (
              <TemplateLivePreview key={template.id} template={template} index={index + featured.length} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 bg-[#0F0D0B] px-5 py-16 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">שאלות נפוצות</h2>
          <div className="mt-8 divide-y divide-white/10">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-white">{faq.q}</h3>
                </summary>
                <p className="mt-3 leading-8 text-white/65">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">רוצים אתר חתונה לאירוע שלכם?</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/65">
            בדקו במחשבון ובחשבון אילו הרשאות פתוחות אצלכם. אפשר גם להתחיל מאישורי הגעה והזמנה דיגיטלית, ולהוסיף אתר
            כשהאפשרות זמינה.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaPrimaryClass} location="wedding_footer_pricing">
              למחשבון החבילות
            </TrackedCtaLink>
            <TrackedCtaLink href="/invitations/chatuna" className={ctaSecondaryClass} location="wedding_footer_invitations">
              להזמנות דיגיטליות
            </TrackedCtaLink>
            <TrackedCtaLink href="/rsvp" className={ctaSecondaryClass} location="wedding_footer_rsvp">
              לאישורי הגעה
            </TrackedCtaLink>
          </div>
        </div>
      </section>
    </main>
  );
}
