import Image from "next/image";
import Link from "next/link";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import EventJourney from "@/components/marketing/EventJourney";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import {
  ctaOnDarkClass,
  ctaOnDarkSecondaryClass,
  ctaPrimaryClass,
  ctaSecondaryClass,
  layoutVariantForPath,
} from "@/components/marketing/brand";
import AnswerFirst from "@/components/seo/AnswerFirst";
import FactTableView from "@/components/seo/FactTableView";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { tableFor, type FactTable } from "@/lib/seo/answers";
import { clusterSiblings } from "@/lib/seo/clusters";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { journeyActiveIdForPath, showcaseForPath } from "@/lib/seo/productVisuals";

export type { FactTable };

export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  imageSrc?: string;
  imageAlt?: string;
  imageDevice?: "laptop" | "phone";
};

export type ContentFaq = { q: string; a: string };
export type ContentLink = { href: string; label: string };
export type ContentBenefit = { title: string; text: string };
export type ContentStep = { title: string; text: string };

export type ContentMedia = {
  type: "video" | "image";
  src: string;
  alt?: string;
  caption?: string;
  variant?: "phone" | "wide";
  poster?: string;
};

export default function PublicContentPage({
  eyebrow,
  title,
  titleAccent,
  lede,
  sections,
  faqs,
  related,
  breadcrumbs,
  path,
  extraJsonLd = [],
  benefits = [],
  steps = [],
  media,
  showEventTypes = false,
  showJourney = true,
  ctaTitle = "רוצים להתקדם עם האירוע?",
  ctaLede = "המחיר נקבע לפי מספר הרשומות והחבילה במחשבון. אין כאן מחיר כללי לאירוע.",
  primaryCta = { href: "/pricing", label: "לצפייה בחבילות" },
  secondaryCta = { href: "/contact", label: "יצירת קשר" },
  serviceFits = [],
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  lede: string;
  sections: ContentSection[];
  faqs: ContentFaq[];
  related: ContentLink[];
  breadcrumbs: { name: string; path: string }[];
  path: string;
  extraJsonLd?: Record<string, unknown>[];
  benefits?: ContentBenefit[];
  steps?: ContentStep[];
  media?: ContentMedia;
  showEventTypes?: boolean;
  showJourney?: boolean;
  ctaTitle?: string;
  ctaLede?: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  serviceFits?: { href: string; label: string; note: string }[];
}) {
  const table = tableFor(path);
  const siblings = clusterSiblings(path);
  const showcase = showcaseForPath(path);
  const journeyActive = journeyActiveIdForPath(path);
  const variant = layoutVariantForPath(path);
  const data = graph([
    organizationNode(),
    breadcrumbNode(breadcrumbs),
    ...(faqs.length ? [faqNode(faqs)] : []),
    ...extraJsonLd,
  ]);

  const heroMedia = media || (showcase?.items[0]
    ? {
        type: "image" as const,
        src: showcase.items[0].src,
        alt: showcase.items[0].alt,
        variant: (showcase.items[0].device === "phone" ? "phone" : "wide") as "phone" | "wide",
      }
    : null);

  return (
    <main dir="rtl" className="overflow-x-hidden bg-[#F2F4F7] text-[#1A222D]">
      <JsonLd data={data} />

      {variant === "dark-hero" || variant === "gallery-first" ? (
        <section className="relative isolate min-h-[70svh] overflow-hidden bg-[#0B0E13] text-white">
          {heroMedia ? (
            <img
              src={heroMedia.src}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-top opacity-40"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-l from-[#0B0E13] via-[#0B0E13]/90 to-[#0B0E13]/45" aria-hidden />
          <div className="relative z-10 mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-end px-5 pb-12 pt-24 md:px-8 md:pb-16">
            <Breadcrumbs items={breadcrumbs} onDark />
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[#7DD3C8]">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.12] md:text-5xl lg:text-6xl">
              {title}
              {titleAccent ? <span className="text-[#7DD3C8]"> {titleAccent}</span> : null}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/75 md:text-lg">{lede}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href={primaryCta.href} className={ctaOnDarkClass} location={`hero_cta:${path}`}>
                {primaryCta.label}
              </TrackedCtaLink>
              <TrackedCtaLink href={secondaryCta.href} className={ctaOnDarkSecondaryClass} location={`hero_cta:${path}`}>
                {secondaryCta.label}
              </TrackedCtaLink>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-[#D5DBE3] bg-white">
          <div
            className={`mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:px-8 md:py-16 ${
              variant === "split-media" ? "lg:grid-cols-2" : "lg:grid-cols-[1.1fr_0.9fr]"
            }`}
          >
            <div className={variant === "split-media" ? "order-2 lg:order-1" : ""}>
              <Breadcrumbs items={breadcrumbs} />
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">{eyebrow}</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.12] text-[#0B0E13] md:text-5xl">
                {title}
                {titleAccent ? <span className="text-[#0F766E]"> {titleAccent}</span> : null}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#3D4754] md:text-lg">{lede}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink href={primaryCta.href} className={ctaPrimaryClass} location={`hero_cta:${path}`}>
                  {primaryCta.label}
                </TrackedCtaLink>
                <TrackedCtaLink href={secondaryCta.href} className={ctaSecondaryClass} location={`hero_cta:${path}`}>
                  {secondaryCta.label}
                </TrackedCtaLink>
              </div>
            </div>
            <div className={variant === "split-media" ? "order-1 lg:order-2" : ""}>
              {heroMedia ? <HeroMedia media={heroMedia} /> : <HeroAtmosphere />}
            </div>
          </div>
        </section>
      )}

      {showcase ? (
        <ProductShowcase
          heading={showcase.heading}
          lede={showcase.lede}
          items={showcase.items}
          layout={showcase.layout}
        />
      ) : null}

      {showJourney ? <EventJourney activeId={journeyActive} compact /> : null}

      <AnswerFirst path={path} hideTable />

      {serviceFits.length ? (
        <section className="bg-white px-5 py-14 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-medium text-[#0B0E13] md:text-4xl">מה מתאים לסוג האירוע הזה</h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#3D4754]">
              לא כל אירוע צריך את כל השלבים. אלה השירותים שמתאימים באמת לתרחיש הזה.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serviceFits.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block border border-[#D5DBE3] bg-[#F2F4F7] p-5 transition hover:border-[#0F766E]"
                  >
                    <span className="font-bold text-[#0B0E13]">{item.label}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#3D4754]">{item.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {benefits.length ? (
        <section className="px-5 py-14 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-medium text-[#0B0E13] md:text-4xl">מה מקבלים בפועל</h2>
            <ul className="mt-10 divide-y divide-[#D5DBE3] border-y border-[#D5DBE3]">
              {benefits.map((benefit, index) => (
                <li
                  key={benefit.title}
                  className="grid gap-3 py-6 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10 md:py-7"
                >
                  <h3 className="font-display text-xl text-[#0B0E13]">
                    <span className="ml-2 text-[#0F766E]">{String(index + 1).padStart(2, "0")}</span>
                    {benefit.title}
                  </h3>
                  <p className="leading-8 text-[#3D4754]">{benefit.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {steps.length ? (
        <section className="bg-[#0B0E13] px-5 py-14 text-white md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-medium md:text-4xl">איך זה עובד</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="font-display text-4xl text-[#0F766E]">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 leading-7 text-white/70">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {showEventTypes ? (
        <section className="bg-white px-5 py-14 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-medium text-[#0B0E13] md:text-4xl">{EVENT_TYPE_SECTION.heading}</h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#3D4754]">{EVENT_TYPE_SECTION.lede}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVENT_TYPES.map((item) => (
                <li key={item.label} className="border border-[#D5DBE3] p-5">
                  <h3 className="font-bold text-[#0B0E13]">
                    {item.href ? (
                      <Link href={item.href} className="hover:text-[#0F766E]">
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#3D4754]">{item.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <article className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {table ? <FactTableView table={table} /> : null}

          {sections.map((section, index) => (
            <section
              key={section.heading}
              className={`mt-12 grid items-start gap-8 ${
                section.imageSrc ? "lg:grid-cols-[1fr_0.85fr]" : ""
              } ${index > 0 ? "border-t border-[#D5DBE3] pt-12" : ""}`}
            >
              <div>
                <h2 className="font-display text-2xl font-medium text-[#0B0E13] md:text-3xl">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-8 text-[#3D4754] md:text-lg">
                    {paragraph}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-5 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 leading-7 text-[#3D4754]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#0F766E]" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {section.imageSrc ? (
                <DeviceFrame
                  src={section.imageSrc}
                  alt={section.imageAlt || ""}
                  variant={section.imageDevice || "laptop"}
                />
              ) : null}
            </section>
          ))}

          {faqs.length ? (
            <section className="mt-14 border-t border-[#D5DBE3] pt-12">
              <h2 className="font-display text-3xl font-medium text-[#0B0E13]">שאלות נפוצות</h2>
              <div className="mt-6 divide-y divide-[#D5DBE3]">
                {faqs.map((faq) => (
                  <details key={faq.q} className="group py-5">
                    <summary className="cursor-pointer list-none">
                      <h3 className="flex items-start justify-between gap-4 text-lg font-bold text-[#0B0E13]">
                        <span>{faq.q}</span>
                        <span className="text-[#0F766E] transition group-open:rotate-45" aria-hidden>
                          +
                        </span>
                      </h3>
                    </summary>
                    <p className="mt-3 leading-8 text-[#3D4754]">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <section className="relative mt-14 overflow-hidden bg-[#0B0E13] px-6 py-10 text-white md:px-10 md:py-12">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#7DD3C8]">הצטרפות</p>
            <h2 className="mt-2 font-display text-3xl font-medium">{ctaTitle}</h2>
            <p className="mt-3 max-w-2xl leading-8 text-white/70">{ctaLede}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href={primaryCta.href} className={ctaOnDarkClass} location={`footer_cta:${path}`}>
                {primaryCta.label}
              </TrackedCtaLink>
              <TrackedCtaLink
                href={secondaryCta.href}
                className={ctaOnDarkSecondaryClass}
                location={`footer_cta:${path}`}
              >
                {secondaryCta.label}
              </TrackedCtaLink>
            </div>
          </section>

          {siblings.length ? (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-[#0B0E13]">באותו נושא</h2>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {siblings.map((link) => (
                  <li key={link.path}>
                    <Link href={link.path} className="text-sm font-bold text-[#0F766E] underline-offset-4 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8 pb-16">
            <h2 className="text-xl font-bold text-[#0B0E13]">עמודים קשורים</h2>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {related.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-bold text-[#0F766E] underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </main>
  );
}

function Breadcrumbs({
  items,
  onDark = false,
}: {
  items: { name: string; path: string }[];
  onDark?: boolean;
}) {
  return (
    <nav
      aria-label="מיקום בעמוד"
      className={`text-sm font-semibold ${onDark ? "text-white/60" : "text-[#6B7583]"}`}
    >
      {items.map((item, index) => (
        <span key={item.path}>
          {index > 0 ? <span className={`px-1.5 ${onDark ? "text-white/35" : "text-[#D5DBE3]"}`}>/</span> : null}
          {index === items.length - 1 ? (
            <span className={onDark ? "text-white" : "text-[#1A222D]"}>{item.name}</span>
          ) : (
            <Link href={item.path} className={onDark ? "hover:text-white" : "hover:text-[#0F766E]"}>
              {item.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function HeroMedia({ media }: { media: ContentMedia }) {
  const isPhone = media.variant === "phone";
  return (
    <div className={`relative mx-auto w-full ${isPhone ? "max-w-[280px]" : "max-w-xl"}`}>
      <div
        className={`relative overflow-hidden border border-[#D5DBE3] bg-[#0B0E13] ${
          isPhone ? "rounded-md" : ""
        }`}
      >
        {media.type === "video" ? (
          <video
            src={media.src}
            poster={media.poster}
            muted
            loop
            playsInline
            preload="metadata"
            controls
            className={`h-full w-full object-cover ${isPhone ? "aspect-[9/16]" : "aspect-video"}`}
          />
        ) : (
          <Image
            src={media.src}
            alt={media.alt || ""}
            width={isPhone ? 680 : 1200}
            height={isPhone ? 1200 : 750}
            priority
            className={`h-full w-full object-cover ${isPhone ? "aspect-[9/16]" : "aspect-video"}`}
          />
        )}
      </div>
      {media.caption ? (
        <p className="mt-3 text-center text-sm font-semibold text-[#6B7583]">{media.caption}</p>
      ) : null}
    </div>
  );
}

function HeroAtmosphere() {
  return (
    <div className="relative mx-auto hidden min-h-[280px] w-full max-w-md border border-[#D5DBE3] bg-[#0B0E13] p-8 text-white lg:block">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#7DD3C8]">Invistimo</p>
      <p className="mt-4 font-display text-2xl leading-9">
        Save the Date מוקדם.
        <br />
        אישורי הגעה כשהזמן נכון.
      </p>
    </div>
  );
}
