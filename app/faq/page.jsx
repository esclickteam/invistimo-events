import { Frank_Ruhl_Libre } from "next/font/google";
import Link from "next/link";

import FaqKnowledgeCenter from "./components/FaqKnowledgeCenter";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { WHATSAPP_URL } from "@/app/contact/contactContent";
import {
  ALL_FAQ_ITEMS,
  FAQ_CATEGORIES,
  FAQ_CONTENT_UPDATED,
  allFaqItems,
} from "@/lib/seo/publicFaq";
import { breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import {
  absoluteUrl,
  findCoreRoute,
  pageMetadata,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo/site";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-faq-display",
});

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

function webpageNode() {
  return {
    "@type": "WebPage",
    "@id": `${absoluteUrl("/faq")}#webpage`,
    url: absoluteUrl("/faq"),
    name: route.title,
    description: route.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "he-IL",
    dateModified: FAQ_CONTENT_UPDATED,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export default function FAQPage() {
  const serializableItems = ALL_FAQ_ITEMS.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    q: item.q,
    a: item.a,
    links: item.links,
    media: item.media,
    keywords: item.keywords,
    updatedAt: item.updatedAt,
    published: item.published,
    service: item.service,
  }));

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          webpageNode(),
          breadcrumbNode([
            { name: "בית", path: "/" },
            { name: "שאלות ותשובות", path: "/faq" },
          ]),
          faqNode(allFaqItems()),
        ])}
      />
      <main
        dir="rtl"
        className={`${display.variable} overflow-x-hidden bg-[#FBF6EE] text-[#3F3025]`}
      >
        <section className="relative isolate px-5 pb-8 pt-12 md:px-8 md:pb-10 md:pt-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(231,212,175,0.45)_0%,transparent_42%),radial-gradient(circle_at_80%_0%,rgba(255,253,248,0.9)_0%,transparent_35%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_100%)]" />
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                בית
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              שאלות ותשובות
            </p>
            <h1 className="mt-5 font-[family-name:var(--font-faq-display)] text-[2rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[#35281F] md:text-5xl">
              שאלות ותשובות על אישורי הגעה, הושבה וניהול אירועים
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
              כל מה שחשוב לדעת על הזמנות דיגיטליות, אישורי הגעה, סידורי הושבה, ניהול מוזמנים
              ושירותי {SITE_NAME} — עם הסברים ברורים, דוגמאות והדרכות.
            </p>
            <p className="mt-3 text-sm text-[#7A6042]">
              {FAQ_CATEGORIES.length} קטגוריות · {ALL_FAQ_ITEMS.length} שאלות
            </p>
          </div>
        </section>

        <FaqKnowledgeCenter items={serializableItems} />

        <section className="px-5 pb-16 md:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-7 md:p-10">
            <h2 className="font-[family-name:var(--font-faq-display)] text-3xl font-semibold text-[#35281F]">
              לא מצאתם את התשובה שחיפשתם?
            </h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
              אנחנו כאן כדי לעזור לכם לבחור את השירות המתאים ולהבין איך להשתמש במערכת. שעות
              מענה: א׳–ה׳ 09:00–18:00, שישי וערבי חג 09:00–12:00.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href={WHATSAPP_URL}
                className={ctaClass}
                location="footer_cta:/faq"
              >
                שיחה ב־WhatsApp
              </TrackedCtaLink>
              <TrackedCtaLink href="/contact" className={secondaryClass} location="footer_cta:/faq">
                יצירת קשר
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/info/guides"
                className={secondaryClass}
                location="footer_cta:/faq"
              >
                מרכז המדריכים
              </TrackedCtaLink>
            </div>
          </div>
        </section>
      </main>
      <ServiceLinks current="/faq" />
    </>
  );
}
