import FAQAccordion from "../components/FAQAccordion";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { allFaqItems } from "@/lib/seo/publicFaq";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import Link from "next/link";

const route = findCoreRoute("/faq");
if (!route) throw new Error("Missing SEO route /faq");

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const ctaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)]";
const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3 text-base font-black text-[#5E4735]";

export default function FAQPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode([
            { name: "בית", path: "/" },
            { name: "שאלות ותשובות", path: "/faq" },
          ]),
          faqNode(allFaqItems()),
        ])}
      />
      <main dir="rtl" className="overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
        <section className="relative isolate px-5 pb-10 pt-8 md:px-8 md:pb-12 md:pt-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#E9D4AF_0%,transparent_36%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_100%)]" />
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                בית
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              שאלות ותשובות
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#EADDC8] bg-white/70 px-5 py-2 text-sm font-bold text-[#7A6042]">
              <span className="h-2 w-2 rounded-full bg-[#C7A56B]" />
              מרכז תשובות
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.12] tracking-[-0.03em] text-[#35281F] md:text-6xl">
              שאלות ותשובות{" "}
              <span className="mt-3 block bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
                על אישורי הגעה, הזמנות והושבה
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
              ריכזנו תשובות מדויקות על Invistimo: אישורי הגעה, וואטסאפ, הזמנות דיגיטליות, Save the Date,
              סידורי הושבה, חבילות ותמיכה — לחתונות ולכל סוגי האירועים שהמערכת תומכת בהם.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href="/pricing" className={ctaClass} location="hero_cta:/faq">
                לצפייה בחבילות
              </TrackedCtaLink>
              <TrackedCtaLink href="/contact" className={secondaryClass} location="hero_cta:/faq">
                יצירת קשר
              </TrackedCtaLink>
            </div>
          </div>
        </section>

        <AnswerFirst path="/faq" />

        <section className="px-5 pb-8 md:px-8">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-[#E6D2AA] bg-white/90 p-6 md:p-8">
            <h2 className="text-2xl font-black text-[#35281F]">איך להשתמש בעמוד</h2>
            <p className="mt-3 leading-8 text-[#5C4A3A]">
              כל תשובה מבוססת על מה שהמערכת באמת עושה. אין כאן דירוגים מומצאים או מחיר אחיד.
              לשאלות על סכום ספציפי —{" "}
              <Link href="/pricing" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מחשבון החבילות
              </Link>
              . למדריכים מפורטים —{" "}
              <Link href="/info/guides" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מרכז המדריכים
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-4xl">
            <FAQAccordion />
          </div>
        </section>

        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F]">{EVENT_TYPE_SECTION.heading}</h2>
            <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">{EVENT_TYPE_SECTION.lede}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVENT_TYPES.map((item) => (
                <li key={item.label} className="rounded-[24px] border border-[#E6D2AA] bg-white/90 p-5">
                  <h3 className="text-lg font-black text-[#35281F]">{item.label}</h3>
                  <p className="mt-2 leading-7 text-[#5C4A3A]">{item.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-5 pb-16 md:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-7 md:p-10">
            <p className="text-sm font-black tracking-wide text-[#A67C3D]">לא מצאתם תשובה?</p>
            <h2 className="mt-2 text-3xl font-black text-[#35281F]">נשמח לעזור אישית</h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
              פנו דרך יצירת קשר, בדוא״ל support@invistimo.com או בוואטסאפ השירות. שעות מענה: א׳–ה׳ 09:00–18:00,
              שישי וערבי חג 09:00–12:00.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href="/contact" className={ctaClass} location="footer_cta:/faq">
                יצירת קשר
              </TrackedCtaLink>
              <TrackedCtaLink href="/rsvp" className={secondaryClass} location="footer_cta:/faq">
                לעמוד אישורי הגעה
              </TrackedCtaLink>
            </div>
          </div>
        </section>
      </main>
      <ServiceLinks current="/faq" />
    </>
  );
}
