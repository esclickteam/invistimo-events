import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";

export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ContentFaq = { q: string; a: string };

export type ContentLink = { href: string; label: string };

const ctaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3 text-base font-black text-white";

const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-8 py-3 text-base font-black text-[#5E4735]";

export default function PublicContentPage({
  eyebrow,
  title,
  lede,
  sections,
  faqs,
  related,
  breadcrumbs,
  extraJsonLd = [],
}: {
  eyebrow: string;
  title: string;
  lede: string;
  sections: ContentSection[];
  faqs: ContentFaq[];
  related: ContentLink[];
  breadcrumbs: { name: string; path: string }[];
  extraJsonLd?: Record<string, unknown>[];
}) {
  const data = graph([
    organizationNode(),
    breadcrumbNode(breadcrumbs),
    ...(faqs.length ? [faqNode(faqs)] : []),
    ...extraJsonLd,
  ]);

  return (
    <main dir="rtl" className="bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd data={data} />
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <nav aria-label="מיקום בעמוד" className="mb-8 text-sm font-semibold text-[#7A6042]">
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

        <p className="text-sm font-black tracking-wide text-[#A67C3D]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-[#35281F] md:text-5xl">{title}</h1>
        <p className="mt-6 text-lg leading-8 text-[#5C4A3A]">{lede}</p>

        {sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="text-2xl font-black text-[#35281F]">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-4 leading-8 text-[#5C4A3A]">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-4 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 leading-7">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {faqs.length ? (
          <section className="mt-14">
            <h2 className="text-2xl font-black text-[#35281F]">שאלות נפוצות</h2>
            <div className="mt-5 space-y-4">
              {faqs.map((faq) => (
                <details key={faq.q} className="rounded-2xl border border-[#E6D2AA] bg-white px-5 py-4" open>
                  <summary className="cursor-pointer text-lg font-black text-[#35281F]">{faq.q}</summary>
                  <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14 rounded-[28px] border border-[#E3C990] bg-white p-6 md:p-8">
          <h2 className="text-2xl font-black text-[#35281F]">רוצים להתקדם עם האירוע?</h2>
          <p className="mt-3 leading-8 text-[#5C4A3A]">
            המחיר נקבע לפי מספר הרשומות והחבילה במחשבון. אין כאן מחיר כללי לחתונה.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/pricing" className={ctaClass}>
              לצפייה בחבילות
            </Link>
            <Link href="/contact" className={secondaryClass}>
              יצירת קשר
            </Link>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-black text-[#35281F]">עמודים קשורים</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
