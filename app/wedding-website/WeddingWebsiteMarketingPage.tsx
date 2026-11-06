import type { ReactNode } from "react";
import DeferredShot from "./components/DeferredShot";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuestJourneyPhone from "./components/GuestJourneyPhone";
import SiteAnatomyPreview from "./components/SiteAnatomyPreview";
import WeddingDesignGallery from "./components/WeddingDesignGallery";
import WeddingWebsiteHero from "./components/WeddingWebsiteHero";
import { wwPrimary } from "./components/wwButtons";
import { WEDDING_WEBSITE_FAQS } from "./weddingFaqs";
import {
  COMPARE_ROWS,
  CUSTOM_DESIGN_POINTS,
  SITE_ANATOMY,
  STEPS,
  VERIFIED_CAPABILITIES,
  WW_LINKS,
  WW_MEDIA,
  WW_PATH,
  resolveFeaturedStyles,
  resolveHeroTemplate,
} from "./content";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import {
  btnPrimary,
  btnSecondaryOnDark,
} from "@/lib/ui/buttonClasses";

const ctaOnDark = btnPrimary;
const ctaOnDarkSecondary = btnSecondaryOnDark;

function Eyebrow({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
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
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}

export default function WeddingWebsiteMarketingPage() {
  const heroTemplate = resolveHeroTemplate();
  const featured = resolveFeaturedStyles();
  const mobileTemplate =
    getWeddingTemplate(WW_MEDIA.mobileDemoTemplateId) || heroTemplate;

  return (
    <article
      dir="rtl"
      className="ww-marketing min-h-screen overflow-x-clip bg-[#F5EEE8] text-[#42182F]"
    >
      <WeddingWebsiteHero
        templateId={heroTemplate.id}
        name={heroTemplate.name}
        desktopPoster={WW_MEDIA.heroDesktop}
        mobilePoster={WW_MEDIA.heroMobile}
      />

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
                אתר חתונה אישי מרכז סיפור, תמונות, לוח זמנים, כתובת וניווט בקישור אחד
                שהאורחים פותחים מהטלפון — במקום לענות שוב ושוב על אותן שאלות.
              </p>
              <p>
                זה קישור משותף. את{" "}
                <Link href={WW_LINKS.invitations} className="font-bold text-[#842B4C] underline-offset-4 hover:underline">
                  ההזמנה הדיגיטלית
                </Link>{" "}
                שולחים בנפרד, ואת התשובות אוספים ב־<Link href={WW_LINKS.rsvpWedding} className="font-bold text-[#842B4C] underline-offset-4 hover:underline">אישורי הגעה לחתונה</Link>{" "}
                עם קישור אישי לרשומה.
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

          <FadeIn delay={0.08}>
            <SiteAnatomyPreview
              templateId={WW_MEDIA.mobileDemoTemplateId}
              shots={[
                {
                  src: WW_MEDIA.anatomyPrimary,
                  alt: "אתר חתונה לדוגמה — תצוגת מחשב עם שמות, תמונה ותאריך",
                  label: "Garden Bloom · אתר לדוגמה",
                },
                {
                  src: WW_MEDIA.anatomyStory,
                  alt: "מקטע הסיפור הזוגי באתר חתונה לדוגמה",
                  label: "הסיפור שלנו",
                },
                {
                  src: WW_MEDIA.anatomyGallery,
                  alt: "גלריית תמונות באתר חתונה לדוגמה",
                  label: "גלריה",
                },
              ]}
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
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#D8CBB8] md:text-lg">
              שלושה דברים נפרדים: אתר משותף לחוויה ולפרטים, הזמנה שמתמקדת באירוע עצמו,
              וקישור אישי שאוסף תשובה מאורח מסוים.
            </p>
          </FadeIn>

          <FadeIn className="mt-10">
            <table className="w-full table-fixed border-collapse text-right text-xs sm:text-sm md:text-base">
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
            קישור RSVP אישי אינו אתר חתונה. באתר ציבורי משותף לא מוצגים שמות אורחים,
            מספרי טלפון או נתוני RSVP.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
            <Link href={WW_LINKS.invitations} className="text-[#E8D5A8] underline-offset-4 hover:underline">
              להזמנות דיגיטליות
            </Link>
            <Link href={WW_LINKS.rsvpWedding} className="text-[#E8D5A8] underline-offset-4 hover:underline">
              לאישורי הגעה לחתונה
            </Link>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section
        id="gallery"
        aria-labelledby="gallery-heading"
        className="relative bg-[#F5EEE8] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="relative mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <Eyebrow>גלריית עיצובים</Eyebrow>
            <h2
              id="gallery-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#42182F] md:text-5xl"
            >
              ארבעה אתרים חיים. כל אחד בסגנון אחר.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#6B5360]">
              גללו בתוך כל עיצוב, או פתחו את האתר המלא. אלה אותן דוגמאות פעילות — לא תמונה סטטית.
            </p>
          </FadeIn>

          <div id="examples" className="mt-14 scroll-mt-24">
            <WeddingDesignGallery styles={featured} />
          </div>

          <div className="mt-14 flex flex-col items-start gap-3 border border-[#C5A582] bg-[#FFF8F0] p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <p className="max-w-xl font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#42182F]">
              רוצים אתר חתונה כזה משלכם?
            </p>
            <TrackedCtaLink href={WW_LINKS.contact} className={wwPrimary} location={`gallery_contact:${WW_PATH}`}>
              דברו איתנו
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <section
        id="guest"
        aria-labelledby="guest-heading"
        className="bg-[#FFF8F0] px-5 py-16 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <Eyebrow>מסלול האורח</Eyebrow>
            <h2
              id="guest-heading"
              className="mt-3 font-['Cormorant_Garamond'] text-3xl font-semibold text-[#42182F] md:text-5xl"
            >
              כך האורח עובר מהקישור ועד אישור ההגעה
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6B5360] md:text-lg">
              רוב האורחים פותחים את הקישור מהטלפון. כאן אפשר לעבור על הפרטים, התמונות, הניווט ודמו אישור ההגעה — בלי לשלוח הודעה.
            </p>
          </FadeIn>
          <div className="mt-10">
            <GuestJourneyPhone templateId={mobileTemplate.id} name={mobileTemplate.name} />
          </div>
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
              הפרטים וההיקף נקבעים בתיאום אישי.
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
              אלה חלק מהמקטעים שאפשר לכלול באתר החתונה שלכם — סיפור, תמונות, פרטי אירוע
              ומידע שימושי לאורחים.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <FadeIn className="overflow-hidden rounded-[24px] border border-[#D9C7A8]/60 bg-[#FFFDF8] shadow-[0_20px_50px_rgba(42,30,18,0.10)]">
              <DeferredShot
                src={WW_MEDIA.anatomyGallery}
                alt="גלריה באתר חתונה לדוגמה"
                width={1280}
                height={900}
                className="block h-auto w-full"
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
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A]">
              מומלץ להתחיל אחרי שנקבעו התאריך ומקום האירוע, כדי לבחור עיצוב ולנסח את התוכן בנחת.
            </p>
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
              { href: "/info/guides/wedding-website-guide", label: "איך מכינים אתר חתונה" },
              { href: "/info/guides/wedding-website-vs-digital-invitation", label: "אתר מול הזמנה" },
              { href: "/info/guides/send-digital-invitation", label: "איך שולחים הזמנה" },
              { href: "/info/guides/save-the-date-vs-invitation", label: "Save the Date מול הזמנה" },
              { href: WW_LINKS.saveTheDate, label: "Save the Date" },
              { href: WW_LINKS.rsvp, label: "אישורי הגעה" },
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
