import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import FactTableView from "@/components/seo/FactTableView";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { answerFor, tableFor, type FactTable } from "@/lib/seo/answers";
import { clusterSiblings } from "@/lib/seo/clusters";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { btnPrimaryDark, btnSecondary } from "@/lib/ui/buttonClasses";
import { formatReadingTime, minutesFromText } from "@/lib/blog/reading";
import StickyToc from "@/components/marketing/guides/StickyToc";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";

/** Turns a markdown link to an internal path into a real link. Plain paragraphs stay text. */
function ParagraphText({ text }: { text: string }) {
  const pattern = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  if (!pattern.test(text)) return text;
  pattern.lastIndex = 0;
  const nodes: Array<string | ReactElement> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <Link
        key={index}
        href={match[2]}
        className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
      >
        {match[1]}
      </Link>
    );
    last = match.index + match[0].length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export type { FactTable };

export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  /** Side-by-side comparison cards (e.g. family record vs individuals). */
  compare?: { title: string; text: string }[];
  /** Visual timeline / stage strip. */
  timeline?: { title: string; text: string; tone?: "pre" | "rsvp" }[];
  /** Stacked formula / callout lines. */
  callout?: { title?: string; lines: string[] };
  /** Plain comparison or example grid. */
  table?: { caption?: string; headers: string[]; rows: string[][] };
  /** Direct file download. No account. */
  download?: { href: string; label: string };
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
};

const ctaClass = btnPrimaryDark;
const secondaryClass = btnSecondary;

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
  cover,
  magazine = false,
  showEventTypes = false,
  ctaTitle = "רוצים להתקדם עם האירוע?",
  ctaLede = "המחיר נקבע לפי מספר הרשומות והחבילה במחשבון. אין כאן מחיר כללי לאירוע.",
  primaryCta = { href: "/pricing", label: "לצפייה בחבילות" },
  secondaryCta = { href: "/contact", label: "יצירת קשר" },
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
  cover?: { src: string; alt: string };
  magazine?: boolean;
  showEventTypes?: boolean;
  ctaTitle?: string;
  ctaLede?: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
}) {
  const answer = answerFor(path);
  const table = tableFor(path);
  const siblings = clusterSiblings(path);
  const readingMinutes = minutesFromText(
    [
      title,
      titleAccent || "",
      lede,
      answer || "",
      ...sections.flatMap((section) => [
        section.heading,
        ...section.paragraphs,
        ...(section.bullets || []),
        ...(section.table ? [...section.table.headers, ...section.table.rows.flat()] : []),
      ]),
      ...faqs.flatMap((faq) => [faq.q, faq.a]),
      ...benefits.flatMap((benefit) => [benefit.title, benefit.text]),
      ...steps.flatMap((step) => [step.title, step.text]),
    ].join("\n")
  );
  const toc = [
    ...sections.map((section, index) => ({ id: `section-${index}`, label: section.heading })),
    ...(faqs.length ? [{ id: "faq", label: "שאלות נפוצות" }] : []),
  ];
  const data = graph([
    organizationNode(),
    breadcrumbNode(breadcrumbs),
    ...(faqs.length ? [faqNode(faqs)] : []),
    ...extraJsonLd,
  ]);
  const radius = magazine ? "" : "rounded-[28px]";
  const panel = magazine ? "" : "rounded-[32px]";
  const tile = magazine ? "" : "rounded-[24px]";
  const pill = magazine ? "" : "rounded-full";
  const soft = magazine ? "" : "rounded-2xl";

  return (
    <main dir="rtl" className="overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd data={data} />

      {/* ===== HERO ===== */}
      {magazine ? (
      <section className="relative isolate px-5 pb-6 pt-8 md:px-8 md:pb-8 md:pt-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#E9D4AF_0%,transparent_36%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_100%)]" />

        <div className="mx-auto max-w-6xl">
          <nav aria-label="מיקום בעמוד" className="mb-6 text-sm font-semibold text-[#7A6042]">
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

          <span className="inline-flex border border-[#E6D2AA] bg-white px-4 py-1.5 text-sm font-bold text-[#7A6042]">
            {eyebrow}
          </span>

          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-[#35281F] md:text-4xl">
            {title}
          </h1>
          {titleAccent ? (
            <p className="mt-3 max-w-3xl text-lg font-bold leading-8 text-[#842B4C] md:text-xl">{titleAccent}</p>
          ) : null}
          <div className="mt-5">
            <GuideToolbar title={title} path={path} readingMinutes={readingMinutes} />
          </div>

          {cover ? (
            <figure className="mt-8 overflow-hidden border border-[#E6D2AA] bg-white">
              <Image
                src={cover.src}
                alt={cover.alt}
                width={1600}
                height={900}
                priority
                fetchPriority="high"
                sizes="(min-width: 1024px) 768px, 100vw"
                className="aspect-[16/9] w-full object-cover"
              />
            </figure>
          ) : media ? (
            <div className="mt-8">
              <HeroMedia media={media} />
            </div>
          ) : null}

          {answer ? (
            <p className="mt-8 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">{answer}</p>
          ) : null}

          <p className={`max-w-3xl text-lg leading-8 text-[#5C4A3A] ${answer ? "mt-4" : "mt-6"}`}>{lede}</p>
        </div>
      </section>
      ) : (
      <section className="relative isolate px-5 pb-12 pt-14 md:px-8 md:pb-16 md:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#E9D4AF_0%,transparent_36%),radial-gradient(circle_at_top_left,#F5E8D3_0%,transparent_32%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_55%,#F6EBDD_100%)]" />
        <div className="absolute left-[8%] top-24 -z-10 h-56 w-56 rounded-full bg-[#D8B77C]/20 blur-3xl" />
        <div className="absolute bottom-10 right-[12%] -z-10 h-64 w-64 rounded-full bg-[#B59668]/15 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <nav aria-label="מיקום בעמוד" className="mb-6 text-sm font-semibold text-[#7A6042]">
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
            <span className="inline-flex items-center gap-2 rounded-full border border-[#EADDC8] bg-white/70 px-5 py-2 text-sm font-bold text-[#7A6042] shadow-[0_12px_35px_rgba(91,63,32,0.08)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[#C7A56B]" />
              {eyebrow}
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.12] tracking-[-0.03em] text-[#35281F] md:text-6xl">
              {title}
              {titleAccent ? (
                <>
                  {" "}
                  <span className="mt-3 block text-[#842B4C]">{titleAccent}</span>
                </>
              ) : null}
            </h1>
            <p className="mt-4 text-sm font-bold text-[#7A6042]">{formatReadingTime(readingMinutes)}</p>
            {answer ? (
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">{answer}</p>
            ) : null}
            <p className={`max-w-2xl text-lg leading-8 text-[#5C4A3A] ${answer ? "mt-4" : "mt-6"}`}>{lede}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href={primaryCta.href} className={ctaClass} location={`hero_cta:${path}`}>
                {primaryCta.label}
              </TrackedCtaLink>
              <TrackedCtaLink href={secondaryCta.href} className={secondaryClass} location={`hero_cta:${path}`}>
                {secondaryCta.label}
              </TrackedCtaLink>
            </div>
          </div>
          {media ? <HeroMedia media={media} /> : <HeroAtmosphere />}
        </div>
      </section>
      )}

      {!magazine && benefits.length ? (
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-black text-[#35281F] md:text-4xl">מה מקבלים</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center leading-8 text-[#5C4A3A]">
              מה שקורה בחשבון אחרי שבוחרים את השירות: רשימה, הודעות ותשובות במקום אחד.
            </p>
            <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {benefits.map((benefit) => (
                <li
                  key={benefit.title}
                  className={`${radius} border border-[#E6D2AA] p-6 ${magazine ? "bg-[#FFFDF8]" : "bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF7] to-[#F7E8CA] shadow-[0_16px_40px_rgba(151,108,49,0.08)]"}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C7A56B] text-sm font-black text-white">
                    ✓
                  </div>
                  <h3 className="mt-4 text-xl font-black text-[#35281F]">{benefit.title}</h3>
                  <p className="mt-3 leading-7 text-[#5C4A3A]">{benefit.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {!magazine && steps.length ? (
        <section className="bg-[#FFFDF8]/70 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">איך זה עובד</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className={`${radius} border border-[#E6D2AA] bg-white p-6`}>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#3F3A34] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-black text-[#35281F]">{step.title}</h3>
                  <p className="mt-3 leading-7 text-[#5C4A3A]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {!magazine && showEventTypes ? (
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">{EVENT_TYPE_SECTION.heading}</h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#5C4A3A]">{EVENT_TYPE_SECTION.lede}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVENT_TYPES.map((item) => (
                <li key={item.label} className={`${tile} border border-[#E6D2AA] bg-white/90 p-5`}>
                  <h3 className="text-lg font-black text-[#35281F]">{item.label}</h3>
                  <p className="mt-2 leading-7 text-[#5C4A3A]">{item.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <article className="px-5 py-6 md:px-8 md:py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {toc.length > 1 ? <StickyToc items={toc} /> : <div className="hidden lg:block" />}
          <div className="min-w-0 max-w-3xl">
          {table ? <FactTableView table={table} /> : null}

          {sections.map((section, index) => (
            <section
              key={section.heading}
              id={`section-${index}`}
              className={`mt-12 scroll-mt-28 ${panel} border border-[#E6D2AA]/80 p-6 md:p-8 ${
                index % 2 === 0 ? "bg-white/80" : "bg-[#FFF8EA]/55"
              }`}
            >
              <h2 className="text-2xl font-black text-[#35281F] md:text-3xl">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
                  <ParagraphText text={paragraph} />
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className={`flex items-start gap-3 ${soft} border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-3 leading-7`}
                    >
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7A56B] text-[11px] font-black text-white">
                        ✓
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.table ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-right text-sm">
                    {section.table.caption ? (
                      <caption className="mb-3 text-right text-sm font-bold text-[#7A6042]">
                        {section.table.caption}
                      </caption>
                    ) : null}
                    <thead>
                      <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA]">
                        {section.table.headers.map((header) => (
                          <th key={header} className="px-3 py-2 font-black text-[#35281F]">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row.join("|")} className="border-b border-[#F0E4D0]">
                          {row.map((cell, cellIndex) => (
                            <td key={`${cell}-${cellIndex}`} className="px-3 py-2 leading-6 text-[#5C4A3A]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {section.download ? (
                <p className="mt-6">
                  <a
                    href={section.download.href}
                    download
                    className="inline-flex min-h-12 items-center justify-center bg-[#35281F] px-6 py-3 text-base font-black text-white hover:bg-[#5C4632]"
                  >
                    {section.download.label}
                  </a>
                </p>
              ) : null}
              {section.compare?.length ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {section.compare.map((item) => (
                    <li
                      key={item.title}
                      className={`${tile} border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_12px_28px_rgba(95,68,34,0.06)]`}
                    >
                      <p className="text-sm font-black tracking-wide text-[#A67C3D]">{item.title}</p>
                      <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{item.text}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.timeline?.length ? (
                <ol className="mt-6 space-y-3">
                  {section.timeline.map((item, stepIndex) => (
                    <li
                      key={item.title}
                      className={`relative flex gap-4 ${tile} border border-[#E6D2AA] bg-[#FFFDF8] p-4 md:p-5`}
                    >
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                          item.tone === "rsvp" ? "bg-[#3F3A34]" : "bg-[#C7A56B]"
                        }`}
                      >
                        {stepIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-black text-[#35281F]">{item.title}</p>
                        <p className="mt-1 text-[15px] leading-7 text-[#5C4A3A]">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              {section.callout ? (
                <div className={`mt-6 overflow-hidden ${tile} border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-5 md:p-6`}>
                  {section.callout.title ? (
                    <p className="text-sm font-black tracking-wide text-[#A67C3D]">{section.callout.title}</p>
                  ) : null}
                  <ul className="mt-3 space-y-2">
                    {section.callout.lines.map((line, lineIndex) => {
                      const isTotal = lineIndex === section.callout!.lines.length - 1;
                      return (
                        <li
                          key={line}
                          className={`flex items-start gap-3 text-[15px] leading-7 md:text-base ${
                            isTotal
                              ? "mt-2 border-t border-[#E6D2AA] pt-3 font-black text-[#35281F]"
                              : "font-semibold text-[#5C4A3A]"
                          }`}
                        >
                          <span className="mt-0.5 w-4 shrink-0 text-center font-black text-[#A67C3D]">
                            {isTotal ? "=" : lineIndex === 0 ? "" : "+"}
                          </span>
                          <span>{line}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}

          {faqs.length ? (
            <section id="faq" className="mt-14 scroll-mt-28">
              <h2 className="text-3xl font-black text-[#35281F]">שאלות נפוצות</h2>
              <div className="mt-6 space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.q} className={`${tile} border border-[#E6D2AA] bg-white px-5 py-4`} open>
                    <summary className="cursor-pointer list-none">
                      <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                    </summary>
                    <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {magazine && benefits.length ? (
            <section className="mt-14">
              <h2 className="text-2xl font-black text-[#35281F]">מה מקבלים</h2>
              <ul className="mt-5 grid gap-4 md:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit.title} className="border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                    <h3 className="text-lg font-black text-[#35281F]">{benefit.title}</h3>
                    <p className="mt-2 leading-7 text-[#5C4A3A]">{benefit.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {magazine && steps.length ? (
            <section className="mt-12">
              <h2 className="text-2xl font-black text-[#35281F]">איך זה עובד</h2>
              <ol className="mt-5 grid gap-4 md:grid-cols-2">
                {steps.map((step, index) => (
                  <li key={step.title} className="border border-[#E6D2AA] bg-white p-5">
                    <p className="text-sm font-black text-[#8A642E]">{index + 1}</p>
                    <h3 className="mt-2 text-lg font-black text-[#35281F]">{step.title}</h3>
                    <p className="mt-2 leading-7 text-[#5C4A3A]">{step.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {magazine && showEventTypes ? (
            <section className="mt-12">
              <h2 className="text-2xl font-black text-[#35281F]">{EVENT_TYPE_SECTION.heading}</h2>
              <p className="mt-3 leading-8 text-[#5C4A3A]">{EVENT_TYPE_SECTION.lede}</p>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {EVENT_TYPES.map((item) => (
                  <li key={item.label} className="border border-[#E6D2AA] bg-white p-5">
                    <h3 className="text-lg font-black text-[#35281F]">{item.label}</h3>
                    <p className="mt-2 leading-7 text-[#5C4A3A]">{item.blurb}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-14 border border-[#C5A582] bg-[#42182F] p-7 md:p-10">
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#C5A582]">הצטרפות</p>
            <h2 className="mt-2 text-3xl font-black text-[#FFF8F0]">{ctaTitle}</h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#F5EEE8]">{ctaLede}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink
                href={primaryCta.href}
                className="inline-flex min-h-12 items-center justify-center rounded-none bg-[#F5EEE8] px-8 py-3 text-base font-black !text-[#42182F] hover:bg-[#FFF8F0]"
                location={`footer_cta:${path}`}
              >
                {primaryCta.label}
              </TrackedCtaLink>
              <TrackedCtaLink
                href={secondaryCta.href}
                className="inline-flex min-h-12 items-center justify-center rounded-none border border-[#C5A582] bg-transparent px-8 py-3 text-base font-black !text-[#FFF8F0] hover:bg-[#842B4C]"
                location={`footer_cta:${path}`}
              >
                {secondaryCta.label}
              </TrackedCtaLink>
            </div>
          </section>

          {!magazine && siblings.length ? (
            <section className="mt-12">
              <h2 className="text-xl font-black text-[#35281F]">באותו נושא</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {siblings.map((link) => (
                  <li key={link.path}>
                    <Link
                      href={link.path}
                      className={`inline-flex min-h-11 items-center ${pill} border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!magazine ? (
          <section className="mt-10 pb-16">
            <h2 className="text-xl font-black text-[#35281F]">עמודים קשורים</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {related.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`inline-flex ${pill} border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          ) : null}
        </div>
        </div>
      </article>
    </main>
  );
}

function HeroMedia({ media }: { media: ContentMedia }) {
  const isPhone = media.variant === "phone";
  return (
    <div className={`relative mx-auto w-full ${isPhone ? "max-w-[340px]" : "max-w-xl"}`}>
      <div className="absolute -inset-6 rounded-[46px] bg-[radial-gradient(circle_at_top,#E8D4AF_0%,transparent_55%),linear-gradient(135deg,#F8EFE1,#FFFFFF)] opacity-90 blur-2xl" />
      <div className="relative rounded-[36px] border border-white/80 bg-gradient-to-br from-[#F8EFE1] via-[#FFFDF9] to-[#E7D7BF] p-[10px] shadow-[0_35px_95px_rgba(58,39,20,0.2)]">
        <div className="overflow-hidden rounded-[28px] border border-[#221811]/10 bg-[#17120E]">
          {media.type === "video" ? (
            <video
              src={media.src}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              controls
              className={`h-full w-full object-cover ${isPhone ? "aspect-[9/16]" : "aspect-video"}`}
            />
          ) : (
            <Image
              src={media.src}
              alt={media.alt || ""}
              width={isPhone ? 680 : 1200}
              height={isPhone ? 1200 : 750}
              className={`h-full w-full object-cover ${isPhone ? "aspect-[9/16]" : "aspect-video"}`}
            />
          )}
        </div>
      </div>
      {media.caption ? (
        <p className="mt-4 text-center text-sm font-semibold text-[#7A6042]">{media.caption}</p>
      ) : null}
    </div>
  );
}

function HeroAtmosphere() {
  return (
    <div className="relative mx-auto hidden min-h-[320px] w-full max-w-md lg:block">
      <div className="absolute inset-0 rounded-[40px] border border-[#E6D2AA] bg-[radial-gradient(circle_at_30%_20%,#FFF8EA,transparent_45%),linear-gradient(160deg,#FFFDF8,#F3E4CB)] shadow-[0_30px_80px_rgba(95,68,34,0.12)]" />
      <div className="absolute inset-8 rounded-[32px] border border-white/70 bg-white/50 backdrop-blur-xl" />
      <div className="absolute bottom-12 left-10 right-10 rounded-3xl border border-[#E6D2AA] bg-white/90 p-5 shadow-[0_16px_40px_rgba(95,68,34,0.1)]">
        <p className="text-sm font-black text-[#A67C3D]">Invistimo</p>
        <p className="mt-2 text-lg font-black leading-7 text-[#35281F]">
          קישור אישי לכל אורח.
          <br />
          תשובות במקום אחד.
        </p>
      </div>
    </div>
  );
}
