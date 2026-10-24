import Image from "next/image";
import Link from "next/link";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import EventJourney from "@/components/marketing/EventJourney";
import ProductShowcase from "@/components/marketing/ProductShowcase";
import { ctaPrimaryClass, ctaSecondaryClass } from "@/components/marketing/brand";
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
  /** Optional inline product image next to this section. */
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

const ctaClass = ctaPrimaryClass;
const secondaryClass = ctaSecondaryClass;

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
  const data = graph([
    organizationNode(),
    breadcrumbNode(breadcrumbs),
    ...(faqs.length ? [faqNode(faqs)] : []),
    ...extraJsonLd,
  ]);

  return (
    {/* Landmark <main> lives in LayoutShell — avoid nested <main>. */}
    <div dir="rtl" className="overflow-x-hidden bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd data={data} />

      {/* ===== HERO — brand + one headline + one lede + CTA + dominant visual ===== */}
      <section className="relative isolate">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,#E9D4AF_0%,transparent_42%),linear-gradient(165deg,#FFFDF8_0%,#FBF6EE_50%,#F0E2CE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 pb-10 pt-8 md:gap-10 md:px-8 md:pb-12 md:pt-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="pb-2">
            <nav aria-label="מיקום בעמוד" className="mb-5 text-sm font-semibold text-[#7A6042]">
              {breadcrumbs.map((item, index) => (
                <span key={item.path}>
                  {index > 0 ? <span className="px-1.5 text-[#C7A56B]">/</span> : null}
                  {index === breadcrumbs.length - 1 ? (
                    <span>{item.name}</span>
                  ) : (
                    <Link href={item.path} className="hover:text-[#8A642E]">
                      {item.name}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            <p className="text-sm font-bold tracking-[0.14em] text-[#A67C3D]">{eyebrow}</p>

            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.1] tracking-[-0.03em] text-[#2A211A] md:text-5xl lg:text-[3.35rem]">
              {title}
              {titleAccent ? (
                <>
                  {" "}
                  <span className="bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
                    {titleAccent}
                  </span>
                </>
              ) : null}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5C4A3A]">{lede}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href={primaryCta.href} className={ctaClass} location={`hero_cta:${path}`}>
                {primaryCta.label}
              </TrackedCtaLink>
              <TrackedCtaLink href={secondaryCta.href} className={secondaryClass} location={`hero_cta:${path}`}>
                {secondaryCta.label}
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative min-h-[280px]">
            {media ? (
              <HeroMedia media={media} />
            ) : showcase?.items[0] ? (
              <DeviceFrame
                src={showcase.items[0].src}
                alt={showcase.items[0].alt}
                variant={showcase.items[0].device || "laptop"}
                priority
              />
            ) : (
              <HeroAtmosphere />
            )}
          </div>
        </div>
      </section>

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
        <section className="px-5 py-12 md:px-8 md:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#2A211A] md:text-4xl">מה מתאים לסוג האירוע הזה</h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
              לא כל אירוע צריך את כל השלבים. אלה השירותים שמתאימים באמת לתרחיש הזה — לפי מה שקיים במערכת.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serviceFits.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block border-b border-[#E6D2AA] pb-4 transition hover:border-[#C7A56B]"
                  >
                    <span className="font-black text-[#2A211A]">{item.label}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#5C4A3A]">{item.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {benefits.length ? (
        <section className="px-5 py-12 md:px-8 md:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#2A211A] md:text-4xl">מה מקבלים בפועל</h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
              יתרונות שמבוססים על יכולות המערכת — בלי הבטחות מספריות שלא פורסמו.
            </p>
            <ul className="mt-10 divide-y divide-[#E6D2AA]/80 border-y border-[#E6D2AA]/80">
              {benefits.map((benefit, index) => (
                <li
                  key={benefit.title}
                  className="grid gap-3 py-6 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10 md:py-7"
                >
                  <h3 className="text-lg font-black text-[#2A211A] md:text-xl">
                    <span className="ml-2 font-black text-[#C7A56B]">{String(index + 1).padStart(2, "0")}</span>
                    {benefit.title}
                  </h3>
                  <p className="leading-8 text-[#5C4A3A]">{benefit.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {steps.length ? (
        <section className="bg-[#2A211A] px-5 py-12 text-[#FBF6EE] md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black md:text-4xl">איך זה עובד</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="relative">
                  <span className="text-4xl font-black text-[#C7A56B]/90">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 leading-7 text-[#E8D9C4]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {showEventTypes ? (
        <section className="px-5 py-12 md:px-8 md:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#2A211A] md:text-4xl">{EVENT_TYPE_SECTION.heading}</h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#5C4A3A]">{EVENT_TYPE_SECTION.lede}</p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {EVENT_TYPES.map((item) => (
                <li
                  key={item.label}
                  className="max-w-sm border-b border-[#E6D2AA] pb-3 pl-1 pr-4 pt-1"
                >
                  <h3 className="font-black text-[#2A211A]">
                    {item.href ? (
                      <Link href={item.href} className="hover:text-[#A67C3D]">
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">{item.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <article className="px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {table ? <FactTableView table={table} /> : null}

          {sections.map((section, index) => (
            <section
              key={section.heading}
              className={`mt-12 grid items-start gap-8 ${
                section.imageSrc ? "lg:grid-cols-[1fr_0.85fr]" : ""
              } ${index > 0 ? "border-t border-[#E6D2AA]/60 pt-12" : ""}`}
            >
              <div>
                <h2 className="text-2xl font-black text-[#2A211A] md:text-3xl">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
                    {paragraph}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-5 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 leading-7 text-[#5C4A3A]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
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
            <section className="mt-14 border-t border-[#E6D2AA]/70 pt-12">
              <h2 className="text-3xl font-black text-[#2A211A]">שאלות נפוצות</h2>
              <div className="mt-6 divide-y divide-[#E6D2AA]/80">
                {faqs.map((faq) => (
                  <details key={faq.q} className="group py-5" open={false}>
                    <summary className="cursor-pointer list-none">
                      <h3 className="flex items-start justify-between gap-4 text-lg font-black text-[#2A211A]">
                        <span>{faq.q}</span>
                        <span className="text-[#C7A56B] transition group-open:rotate-45" aria-hidden>
                          +
                        </span>
                      </h3>
                    </summary>
                    <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <section className="relative mt-14 overflow-hidden px-1 py-10 md:py-12">
            <div
              className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#2A211A_0%,#4A382C_45%,#3A2B22_100%)]"
              aria-hidden
            />
            <div className="relative px-6 text-[#FBF6EE] md:px-10">
              <p className="text-sm font-black tracking-wide text-[#D3B47C]">הצטרפות</p>
              <h2 className="mt-2 text-3xl font-black">{ctaTitle}</h2>
              <p className="mt-3 max-w-2xl leading-8 text-[#E8D9C4]">{ctaLede}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href={primaryCta.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#C7A56B] px-8 py-3 text-base font-black text-[#2A211A] transition hover:bg-[#D3B47C]"
                  location={`footer_cta:${path}`}
                >
                  {primaryCta.label}
                </TrackedCtaLink>
                <TrackedCtaLink
                  href={secondaryCta.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-8 py-3 text-base font-black text-white transition hover:bg-white/10"
                  location={`footer_cta:${path}`}
                >
                  {secondaryCta.label}
                </TrackedCtaLink>
              </div>
            </div>
          </section>

          {siblings.length ? (
            <section className="mt-12">
              <h2 className="text-xl font-black text-[#2A211A]">באותו נושא</h2>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {siblings.map((link) => (
                  <li key={link.path}>
                    <Link href={link.path} className="text-sm font-bold text-[#A67C3D] underline-offset-4 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8 pb-16">
            <h2 className="text-xl font-black text-[#2A211A]">עמודים קשורים</h2>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {related.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-bold text-[#A67C3D] underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
}

function HeroMedia({ media }: { media: ContentMedia }) {
  const isPhone = media.variant === "phone";
  return (
    <div className={`relative mx-auto w-full ${isPhone ? "max-w-[300px]" : "max-w-xl"}`}>
      <div className="absolute -inset-5 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,rgba(199,165,107,0.35),transparent_55%)] blur-2xl" aria-hidden />
      <div
        className={`relative overflow-hidden border border-[#2A211A]/12 bg-[#17120E] shadow-[0_28px_70px_rgba(42,33,26,0.28)] ${
          isPhone ? "rounded-[2rem] border-[8px] border-[#1C1612]" : "rounded-2xl"
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
      {media.caption ? <p className="mt-3 text-center text-sm font-semibold text-[#7A6042]">{media.caption}</p> : null}
    </div>
  );
}

function HeroAtmosphere() {
  return (
    <div className="relative mx-auto hidden min-h-[300px] w-full max-w-md lg:block">
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,#FFF8EA,transparent_45%),linear-gradient(160deg,#FFFDF8,#EAD9BC)]" />
      <div className="absolute inset-6 rounded-[1.5rem] border border-white/60 bg-white/40 backdrop-blur-md" />
      <div className="absolute bottom-10 left-8 right-8">
        <p className="text-sm font-black text-[#A67C3D]">Invistimo</p>
        <p className="mt-2 text-xl font-black leading-8 text-[#2A211A]">
          Save the Date והזמנה מוקדם.
          <br />
          אישורי הגעה כשהזמן נכון.
        </p>
      </div>
    </div>
  );
}
