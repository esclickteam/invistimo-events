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
import { ctaPrimaryClass, ctaSecondaryClass } from "@/components/marketing/brand";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import type { Guide } from "@/lib/seo/guides";
import { articleNode, breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { journeyActiveIdForPath } from "@/lib/seo/productVisuals";
import { answerFor } from "@/lib/seo/answers";

export default function RichGuidePage({ guide, path }: { guide: Guide; path: string }) {
  const answer = answerFor(path);
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

  return (
    <main dir="rtl" className="overflow-x-hidden bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd data={data} />

      <section className="relative isolate">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,#E9D4AF_0%,transparent_40%),linear-gradient(165deg,#FFFDF8_0%,#FBF6EE_55%,#F0E2CE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 pb-10 pt-12 md:gap-10 md:px-8 md:pb-14 md:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
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
            <p className="text-sm font-bold tracking-[0.14em] text-[#A67C3D]">מדריך מעשי</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.12] tracking-[-0.03em] text-[#2A211A] md:text-5xl">
              {guide.h1}
              {guide.titleAccent ? (
                <>
                  {" "}
                  <span className="bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
                    {guide.titleAccent}
                  </span>
                </>
              ) : null}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5C4A3A]">{guide.lede}</p>
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
              <DemoVideo
                src={guide.media.src}
                poster={guide.media.poster}
                caption={guide.media.caption}
              />
            ) : guide.media?.type === "image" ? (
              <DeviceFrame
                src={guide.media.src}
                alt={guide.media.alt || ""}
                variant={guide.media.variant === "phone" ? "phone" : "laptop"}
                priority
              />
            ) : guide.gallery?.[0]?.type === "image" ? (
              <DeviceFrame
                src={guide.gallery[0].src}
                alt={guide.gallery[0].alt || ""}
                variant={guide.gallery[0].device || "laptop"}
                priority
              />
            ) : (
              <div className="rounded-[2rem] border border-[#E6D2AA] bg-white/50 p-8 backdrop-blur">
                <p className="text-sm font-black text-[#A67C3D]">Invistimo</p>
                <p className="mt-3 text-xl font-black leading-8 text-[#2A211A]">
                  מדריך מעשי לאירוע — עם דוגמאות מהמערכת עצמה.
                </p>
              </div>
            )}
          </div>
        </div>

        {answer ? (
          <div className="border-y border-[#E8DFD2]/80 bg-white/50 px-5 py-8 md:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-lg leading-9 text-[#3F3025] md:text-xl">{answer}</p>
            </div>
          </div>
        ) : null}
      </section>

      {guide.problem ? <GuideProblem text={guide.problem} /> : null}
      <GuideToc items={toc} />

      {guide.timeline?.length ? <GuideTimeline items={guide.timeline} /> : null}

      {guide.steps?.length ? (
        <section id="steps" className="bg-[#2A211A] px-5 py-12 text-[#FBF6EE] md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black md:text-4xl">שלב אחר שלב</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {guide.steps.map((step, index) => (
                <li key={step.title}>
                  <span className="text-4xl font-black text-[#C7A56B]/90">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 leading-7 text-[#E8D9C4]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {guide.video ? (
        <section id="video" className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#2A211A]">הדגמה קצרה</h2>
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

      <article id="deep" className="px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {guide.sections.map((section, index) => (
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

          {guide.faqs.length ? (
            <section id="faq" className="mt-14 border-t border-[#E6D2AA]/70 pt-12">
              <h2 className="text-3xl font-black text-[#2A211A]">שאלות נפוצות</h2>
              <div className="mt-6 divide-y divide-[#E6D2AA]/80">
                {guide.faqs.map((faq) => (
                  <details key={faq.q} className="group py-5">
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
              <p className="text-sm font-black tracking-wide text-[#D3B47C]">הצעד הבא</p>
              <h2 className="mt-2 text-3xl font-black">{guide.ctaTitle || "רוצים לראות את זה במערכת?"}</h2>
              <p className="mt-3 max-w-2xl leading-8 text-[#E8D9C4]">
                {guide.ctaLede ||
                  "התנסו בדמו כדי לראות את הדשבורד במערכת. המחיר עצמו נשאר במחשבון לפי רשומות וחבילה."}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href={primary.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#C7A56B] px-8 py-3 text-base font-black text-[#2A211A] transition hover:bg-[#D3B47C]"
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
              <h2 className="text-xl font-black text-[#2A211A]">מדריכים ושירותים קשורים</h2>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {guide.related.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-bold text-[#A67C3D] underline-offset-4 hover:underline"
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
