import Link from "next/link";
import DemoVideo from "@/components/marketing/DemoVideo";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import EventJourney from "@/components/marketing/EventJourney";
import {
  GuideGallery,
  GuideProblem,
  GuideTimeline,
} from "@/components/marketing/RichGuideBlocks";
import { ctaPrimaryClass, ctaSecondaryClass } from "@/components/marketing/brand";
import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import type { EventLanding } from "@/lib/seo/eventLandings";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { journeyActiveIdForPath, showcaseForPath } from "@/lib/seo/productVisuals";
import ProductShowcase from "@/components/marketing/ProductShowcase";

export default function EventLandingView({ landing }: { landing: EventLanding }) {
  const path = landing.path;
  const showcase = showcaseForPath(path);
  const journeyActive = landing.journeyActiveId || journeyActiveIdForPath(path);
  const breadcrumbs = [
    { name: "ראשי", path: "/" },
    { name: "אישורי הגעה", path: "/rsvp" },
    { name: landing.eyebrow, path },
  ];
  const data = graph([
    organizationNode(),
    breadcrumbNode(breadcrumbs),
    ...(landing.faqs.length ? [faqNode(landing.faqs)] : []),
    serviceNode({
      name: landing.h1,
      description: landing.description,
      path,
      serviceType: landing.serviceType,
    }),
  ]);

  return (
    <main dir="rtl" className="overflow-x-hidden bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd data={data} />

      <section className="relative isolate">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,#E9D4AF_0%,transparent_42%),linear-gradient(165deg,#FFFDF8_0%,#FBF6EE_50%,#F0E2CE_100%)]"
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
            <p className="text-sm font-bold tracking-[0.14em] text-[#A67C3D]">{landing.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.1] tracking-[-0.03em] text-[#2A211A] md:text-5xl">
              {landing.h1}{" "}
              <span className="bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
                {landing.titleAccent}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5C4A3A]">{landing.lede}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href="/try" className={ctaPrimaryClass} location={`hero_cta:${path}`}>
                לצפייה בדמו
              </TrackedCtaLink>
              <TrackedCtaLink href="/pricing" className={ctaSecondaryClass} location={`hero_cta:${path}`}>
                לחבילות
              </TrackedCtaLink>
            </div>
          </div>
          <DeviceFrame
            src={landing.showcaseSrc}
            alt={landing.showcaseAlt}
            variant={landing.showcaseSrc.includes("mobile") ? "phone" : "laptop"}
            priority
          />
        </div>
      </section>

      {landing.problem ? <GuideProblem text={landing.problem} /> : null}

      {showcase ? (
        <ProductShowcase
          heading={showcase.heading}
          lede={showcase.lede}
          items={showcase.items}
          layout={showcase.layout}
        />
      ) : null}

      <EventJourney activeId={journeyActive} compact />

      <AnswerFirst path={path} />

      <section className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#2A211A] md:text-4xl">מה מתאים לסוג האירוע הזה</h2>
          <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
            לא כל אירוע צריך את כל השלבים. אלה השירותים שמתאימים באמת לתרחיש הזה.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landing.servicesThatFit.map((item) => (
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

      {landing.timeline?.length ? <GuideTimeline items={landing.timeline} /> : null}

      {landing.benefits.length ? (
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#2A211A]">מה מקבלים בפועל</h2>
            <ul className="mt-10 divide-y divide-[#E6D2AA]/80 border-y border-[#E6D2AA]/80">
              {landing.benefits.map((benefit, index) => (
                <li
                  key={benefit.title}
                  className="grid gap-3 py-6 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10"
                >
                  <h3 className="text-lg font-black text-[#2A211A]">
                    <span className="ml-2 text-[#C7A56B]">{String(index + 1).padStart(2, "0")}</span>
                    {benefit.title}
                  </h3>
                  <p className="leading-8 text-[#5C4A3A]">{benefit.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {landing.steps.length ? (
        <section className="bg-[#2A211A] px-5 py-12 text-[#FBF6EE] md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black">איך זה עובד</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {landing.steps.map((step, index) => (
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

      {landing.video ? (
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#2A211A]">הדגמה מהמערכת</h2>
            <div className="mt-6">
              <DemoVideo
                src={landing.video.src}
                poster={landing.video.poster}
                caption={landing.video.caption}
              />
            </div>
          </div>
        </section>
      ) : null}

      {landing.gallery?.length ? <GuideGallery items={landing.gallery} /> : null}

      <article className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {landing.sections.map((section, index) => (
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

          {landing.faqs.length ? (
            <section className="mt-14 border-t border-[#E6D2AA]/70 pt-12">
              <h2 className="text-3xl font-black text-[#2A211A]">שאלות נפוצות</h2>
              <div className="mt-6 divide-y divide-[#E6D2AA]/80">
                {landing.faqs.map((faq) => (
                  <details key={faq.q} className="group py-5">
                    <summary className="cursor-pointer list-none">
                      <h3 className="flex items-start justify-between gap-4 text-lg font-black">
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

          <section className="relative mt-14 overflow-hidden px-1 py-10">
            <div
              className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#2A211A_0%,#4A382C_45%,#3A2B22_100%)]"
              aria-hidden
            />
            <div className="relative px-6 text-[#FBF6EE] md:px-10">
              <h2 className="text-3xl font-black">מוכנים לנהל {landing.eyebrow}?</h2>
              <p className="mt-3 max-w-2xl leading-8 text-[#E8D9C4]">
                התנסו בדמו כדי לראות את המערכת, או עברו למחשבון לפי מספר רשומות.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href="/try"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#C7A56B] px-8 py-3 text-base font-black text-[#2A211A]"
                  location={`footer_cta:${path}`}
                >
                  לצפייה בדמו
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-8 py-3 text-base font-black text-white"
                  location={`footer_cta:${path}`}
                >
                  לחבילות
                </TrackedCtaLink>
              </div>
            </div>
          </section>

          <section className="mt-10 pb-16">
            <h2 className="text-xl font-black text-[#2A211A]">עמודים קשורים</h2>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {landing.related.map((link) => (
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
        </div>
      </article>
    </main>
  );
}
