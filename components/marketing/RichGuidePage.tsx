import Link from "next/link";
import DemoVideo from "@/components/marketing/DemoVideo";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import EventJourney from "@/components/marketing/EventJourney";
import {
  GuideGallery,
  GuideMessageExamples,
  GuideMistakes,
  GuideProblem,
  GuideTimeline,
  GuideTips,
  GuideToc,
} from "@/components/marketing/RichGuideBlocks";
import {
  ctaOnDarkClass,
  ctaOnDarkSecondaryClass,
  ctaPrimaryClass,
  ctaSecondaryClass,
  layoutVariantForPath,
} from "@/components/marketing/brand";
import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import type { Guide } from "@/lib/seo/guides";
import { articleNode, breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { journeyActiveIdForPath } from "@/lib/seo/productVisuals";

export default function RichGuidePage({ guide, path }: { guide: Guide; path: string }) {
  const journeyActive = journeyActiveIdForPath(path);
  const toc = [
    guide.timeline?.length ? { id: "timeline", label: "לוח זמנים" } : null,
    guide.steps?.length ? { id: "steps", label: "שלב אחר שלב" } : null,
    guide.gallery?.length || guide.video ? { id: "gallery", label: "המחשות מהמערכת" } : null,
    guide.messageExamples?.length ? { id: "examples", label: "דוגמאות ניסוח" } : null,
    guide.mistakes?.length ? { id: "mistakes", label: "טעויות נפוצות" } : null,
    guide.tips?.length ? { id: "tips", label: "טיפים" } : null,
    guide.sections.length ? { id: "deep", label: "העמקה" } : null,
    guide.faqs.length ? { id: "faq", label: "שאלות נפוצות" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const breadcrumbs = [
    { name: "ראשי", path: "/" },
    { name: "מדריכים", path: "/info/guides" },
    { name: guide.h1, path },
  ];

  const data = graph([
    organizationNode(),
    breadcrumbNode(breadcrumbs),
    ...(guide.faqs.length ? [faqNode(guide.faqs)] : []),
    articleNode({ title: guide.h1, description: guide.description, path }),
  ]);

  const primary = guide.primaryCta || { href: "/try", label: "לצפייה בדמו" };
  const secondary = guide.secondaryCta || { href: "/pricing", label: "לחבילות" };
  const variant = layoutVariantForPath(path);
  const darkHero = variant === "timeline" || variant === "dark-hero";

  return (
    <main dir="rtl" className="overflow-x-hidden bg-[#F2F4F7] text-[#1A222D]">
      <JsonLd data={data} />

      {darkHero ? (
        <section className="relative isolate overflow-hidden bg-[#0B0E13] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(15,118,110,0.25),transparent_50%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-end gap-8 px-5 pb-12 pt-10 md:gap-10 md:px-8 md:pb-16 md:pt-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <nav aria-label="מיקום בעמוד" className="mb-5 text-sm font-semibold text-white/55">
                {breadcrumbs.map((item, index) => (
                  <span key={item.path}>
                    {index > 0 ? <span className="px-1.5 text-white/30">/</span> : null}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-white">{item.name}</span>
                    ) : (
                      <Link href={item.path} className="hover:text-white">
                        {item.name}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#7DD3C8]">מדריך מעשי</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.12] md:text-5xl">
                {guide.h1}
                {guide.titleAccent ? <span className="text-[#7DD3C8]"> {guide.titleAccent}</span> : null}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/70">{guide.lede}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink href={primary.href} className={ctaOnDarkClass} location={`hero_cta:${path}`}>
                  {primary.label}
                </TrackedCtaLink>
                <TrackedCtaLink href={secondary.href} className={ctaOnDarkSecondaryClass} location={`hero_cta:${path}`}>
                  {secondary.label}
                </TrackedCtaLink>
              </div>
            </div>
            <div className="relative min-h-[260px] border border-white/15 bg-[#141A22] p-2">
              {guide.media?.type === "video" ? (
                <DemoVideo src={guide.media.src} poster={guide.media.poster} caption={guide.media.caption} />
              ) : guide.media?.type === "image" ? (
                <DeviceFrame src={guide.media.src} alt={guide.media.alt || ""} variant={guide.media.variant === "phone" ? "phone" : "laptop"} priority />
              ) : guide.gallery?.[0]?.type === "image" ? (
                <DeviceFrame src={guide.gallery[0].src} alt={guide.gallery[0].alt || ""} variant={guide.gallery[0].device || "laptop"} priority />
              ) : (
                <div className="p-8">
                  <p className="text-sm font-bold text-[#7DD3C8]">Invistimo</p>
                  <p className="mt-3 font-display text-xl leading-8">מדריך מעשי עם דוגמאות מהמערכת.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-[#D5DBE3] bg-white">
          <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 pb-10 pt-8 md:gap-10 md:px-8 md:pb-12 md:pt-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <nav aria-label="מיקום בעמוד" className="mb-5 text-sm font-semibold text-[#6B7583]">
                {breadcrumbs.map((item, index) => (
                  <span key={item.path}>
                    {index > 0 ? <span className="px-1.5 text-[#D5DBE3]">/</span> : null}
                    {index === breadcrumbs.length - 1 ? (
                      <span>{item.name}</span>
                    ) : (
                      <Link href={item.path} className="hover:text-[#0F766E]">
                        {item.name}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">מדריך מעשי</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.12] text-[#0B0E13] md:text-5xl">
                {guide.h1}
                {guide.titleAccent ? <span className="text-[#0F766E]"> {guide.titleAccent}</span> : null}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#3D4754]">{guide.lede}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink href={primary.href} className={ctaPrimaryClass} location={`hero_cta:${path}`}>
                  {primary.label}
                </TrackedCtaLink>
                <TrackedCtaLink href={secondary.href} className={ctaSecondaryClass} location={`hero_cta:${path}`}>
                  {secondary.label}
                </TrackedCtaLink>
              </div>
            </div>
            <div className="relative min-h-[260px]">
              {guide.media?.type === "video" ? (
                <DemoVideo src={guide.media.src} poster={guide.media.poster} caption={guide.media.caption} />
              ) : guide.media?.type === "image" ? (
                <DeviceFrame src={guide.media.src} alt={guide.media.alt || ""} variant={guide.media.variant === "phone" ? "phone" : "laptop"} priority />
              ) : guide.gallery?.[0]?.type === "image" ? (
                <DeviceFrame src={guide.gallery[0].src} alt={guide.gallery[0].alt || ""} variant={guide.gallery[0].device || "laptop"} priority />
              ) : (
                <div className="border border-[#D5DBE3] bg-[#F2F4F7] p-8">
                  <p className="text-sm font-bold text-[#0F766E]">Invistimo</p>
                  <p className="mt-3 font-display text-xl leading-8 text-[#0B0E13]">
                    מדריך מעשי לאירוע — עם דוגמאות מהמערכת עצמה.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {guide.problem ? <GuideProblem text={guide.problem} /> : null}
      <GuideToc items={toc} />

      {guide.timeline?.length ? <GuideTimeline items={guide.timeline} /> : null}

      {guide.steps?.length ? (
        <section id="steps" className="bg-[#0B0E13] px-5 py-12 text-[#F2F4F7] md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black md:text-4xl">שלב אחר שלב</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {guide.steps.map((step, index) => (
                <li key={step.title}>
                  <span className="text-4xl font-black text-[#0F766E]/90">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 leading-7 text-[#C8CED6]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {guide.video ? (
        <section id="video" className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#0B0E13]">הדגמה קצרה</h2>
            <div className="mt-6">
              <DemoVideo
                src={guide.video.src}
                poster={guide.video.poster}
                caption={guide.video.caption}
              />
            </div>
          </div>
        </section>
      ) : null}

      {guide.gallery?.length ? <GuideGallery items={guide.gallery} /> : null}
      {guide.messageExamples?.length ? <GuideMessageExamples items={guide.messageExamples} /> : null}
      {guide.mistakes?.length ? <GuideMistakes items={guide.mistakes} /> : null}
      {guide.tips?.length ? <GuideTips tips={guide.tips} /> : null}

      <EventJourney activeId={journeyActive} compact />

      <AnswerFirst path={path} />

      <article id="deep" className="px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {guide.sections.map((section, index) => (
            <section
              key={section.heading}
              className={`mt-12 grid items-start gap-8 ${
                section.imageSrc ? "lg:grid-cols-[1fr_0.85fr]" : ""
              } ${index > 0 ? "border-t border-[#D5DBE3]/60 pt-12" : ""}`}
            >
              <div>
                <h2 className="text-2xl font-black text-[#0B0E13] md:text-3xl">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-8 text-[#3D4754] md:text-lg">
                    {paragraph}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-5 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 leading-7 text-[#3D4754]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F766E]" aria-hidden />
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

          {guide.faqs.length ? (
            <section id="faq" className="mt-14 border-t border-[#D5DBE3]/70 pt-12">
              <h2 className="text-3xl font-black text-[#0B0E13]">שאלות נפוצות</h2>
              <div className="mt-6 divide-y divide-[#D5DBE3]/80">
                {guide.faqs.map((faq) => (
                  <details key={faq.q} className="group py-5">
                    <summary className="cursor-pointer list-none">
                      <h3 className="flex items-start justify-between gap-4 text-lg font-black text-[#0B0E13]">
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

          <section className="relative mt-14 overflow-hidden px-1 py-10 md:py-12">
            <div
              className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#0B0E13_0%,#1A222D_45%,#0B0E13_100%)]"
              aria-hidden
            />
            <div className="relative px-6 text-[#F2F4F7] md:px-10">
              <p className="text-sm font-black tracking-wide text-[#0F766E]">הצעד הבא</p>
              <h2 className="mt-2 text-3xl font-black">{guide.ctaTitle || "רוצים לראות את זה במערכת?"}</h2>
              <p className="mt-3 max-w-2xl leading-8 text-[#C8CED6]">
                {guide.ctaLede ||
                  "התנסו בדמו כדי לראות את הדשבורד במערכת. המחיר עצמו נשאר במחשבון לפי רשומות וחבילה."}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href={primary.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0F766E] px-8 py-3 text-base font-black text-[#0B0E13] transition hover:bg-[#0F766E]"
                  location={`footer_cta:${path}`}
                >
                  {primary.label}
                </TrackedCtaLink>
                <TrackedCtaLink
                  href={secondary.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-8 py-3 text-base font-black text-white transition hover:bg-white/10"
                  location={`footer_cta:${path}`}
                >
                  {secondary.label}
                </TrackedCtaLink>
              </div>
            </div>
          </section>

          {guide.related?.length ? (
            <section className="mt-12 pb-16">
              <h2 className="text-xl font-black text-[#0B0E13]">מדריכים ושירותים קשורים</h2>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {guide.related.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-bold text-[#0F766E] underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </main>
  );
}
