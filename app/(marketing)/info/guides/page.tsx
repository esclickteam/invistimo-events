import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { PILLARS } from "@/lib/seo/clusters";
import { guidePath, GUIDES } from "@/lib/seo/guides";
import { breadcrumbNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/info/guides")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const ctaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3 text-base font-black text-white";
const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-8 py-3 text-base font-black text-[#5E4735]";

export default function GuidesPage() {
  return (
    <main dir="rtl" className="overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "מדריכים", path: "/info/guides" },
          ]),
        ])}
      />

      <section className="relative isolate px-5 pb-12 pt-14 md:px-8 md:pb-16 md:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#E9D4AF_0%,transparent_36%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_100%)]" />
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            מדריכים
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#EADDC8] bg-white/70 px-5 py-2 text-sm font-bold text-[#7A6042]">
            <span className="h-2 w-2 rounded-full bg-[#C7A56B]" />
            מרכז ידע
          </span>
          <h1 className="mt-6 text-4xl font-black leading-[1.12] text-[#35281F] md:text-6xl">
            מדריכים לאישורי הגעה{" "}
            <span className="mt-3 block bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
              להזמנות, הושבה וניהול אירוע
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            כל מדריך שייך לנושא אחד ומסביר איך Invistimo עובדת בפועל — לחתונות ולאירועים נוספים.
            המדריך מסביר; עמוד השירות והמחשבון הם המקום להתקדם לחבילה.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaClass} location="hero_cta:/info/guides">
              לצפייה בחבילות
            </TrackedCtaLink>
            <TrackedCtaLink href="/rsvp" className={secondaryClass} location="hero_cta:/info/guides">
              לעמוד אישורי הגעה
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-5 pb-20 md:px-8">
        {PILLARS.map((pillar) => {
          const guides = GUIDES.filter((guide) =>
            pillar.clusters.some((item) => item.path === guidePath(guide.slug))
          );
          return (
            <section key={pillar.id} className="rounded-[32px] border border-[#E6D2AA] bg-white/85 p-6 md:p-8">
              <h2 className="text-2xl font-black text-[#35281F] md:text-3xl">
                <Link href={pillar.path} className="hover:text-[#8A642E]">
                  {pillar.name}
                </Link>
              </h2>
              <p className="mt-3 leading-8 text-[#5C4A3A]">{pillar.summary}</p>
              {guides.length ? (
                <ul className="mt-6 grid gap-4">
                  {guides.map((guide) => (
                    <li
                      key={guide.slug}
                      className="rounded-[24px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF7] to-[#F7E8CA] p-5"
                    >
                      <h3 className="text-xl font-black text-[#35281F]">
                        <Link href={guidePath(guide.slug)} className="hover:text-[#8A642E]">
                          {guide.h1}
                        </Link>
                      </h3>
                      <p className="mt-2 leading-7 text-[#5C4A3A]">{guide.description}</p>
                      <Link
                        href={guidePath(guide.slug)}
                        className="mt-4 inline-flex text-sm font-black text-[#8A642E] underline-offset-4 hover:underline"
                      >
                        {guide.slug === "wedding-alcohol-calculator"
                          ? "למחשבון האלכוהול ←"
                          : "לקריאת המדריך ←"}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 leading-7 text-[#5C4A3A]">
                  הפירוט נמצא בעמוד {pillar.name}, בלי מדריך נפרד שמחזור אותו.
                </p>
              )}
            </section>
          );
        })}

        <section className="overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-7 md:p-10">
          <h2 className="text-3xl font-black text-[#35281F]">מוכנים להתקדם מהמדריך לשירות?</h2>
          <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
            בדקו חבילות לפי מספר רשומות, או חזרו לעמודי השירות של אישורי הגעה, הזמנות והושבה.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaClass} location="footer_cta:/info/guides">
              מחשבון חבילות
            </TrackedCtaLink>
            <TrackedCtaLink href="/faq" className={secondaryClass} location="footer_cta:/info/guides">
              שאלות נפוצות
            </TrackedCtaLink>
          </div>
        </section>
      </div>
    </main>
  );
}
