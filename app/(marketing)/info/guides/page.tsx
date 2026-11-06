import Link from "next/link";
import GuidesLibrary from "@/components/marketing/GuidesLibrary";
import JsonLd from "@/components/seo/JsonLd";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { GUIDE_CATEGORIES, categoryForSlug } from "@/lib/marketing/guideCatalog";
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

function readLabel(slug: string) {
  if (slug === "wedding-alcohol-calculator") return "למחשבון האלכוהול ←";
  if (slug === "wedding-seating-arrangements") return "למדריך ולמחשבון ההושבה ←";
  if (slug === "seating-plan") return "למדריך המעשי צעד אחר צעד ←";
  if (slug === "seating-cards-vs-qr") return "למדריך פתקיות הושבה או QR ←";
  return "לקריאת המדריך ←";
}

const libraryGuides = GUIDES.map((guide) => ({
  slug: guide.slug,
  href: guidePath(guide.slug),
  title: guide.h1,
  description: guide.description,
  categoryId: categoryForSlug(guide.slug)?.id ?? "planning",
  readLabel: readLabel(guide.slug),
}));

const ctaClass =
  "inline-flex min-h-12 items-center justify-center rounded-none bg-[#42182F] px-8 py-3 text-base font-black !text-[#FFF8F0] hover:bg-[#842B4C]";
const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-none border border-[#C5A582] bg-[#FFF8F0] px-8 py-3 text-base font-black !text-[#42182F]";

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
          <span className="mt-6 block text-[#842B4C]">
            להזמנות, הושבה וניהול אירוע
          </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            מרכז הידע של Invistimo: בחירת חברה, רשימת מוזמנים, מחיר לפי רשומות, תזמון, אורחים שלא
            עונים, הושבה, אתר חתונה וניהול האירוע. כל מדריך מסביר עניין אחד, ואפשר להמשיך ממנו אל
            השירות או אל המחשבון.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#5C4A3A]">
            מי שמחפש את השירות עצמו מתחיל ב־<Link href="/rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">מערכת אישורי הגעה</Link>
            {" "}או ב־<Link href="/" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">אישורי הגעה וסידורי הושבה במקום אחד</Link>
            . שאלות של מחיר נשארות במדריך «כמה עולים אישורי הגעה».
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#5C4A3A]">
            אפשר להתחיל ב־<Link
              href="/info/guides/how-to-choose-rsvp-company"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              איך בוחרים חברת אישורי הגעה
            </Link>
            , ב־<Link
              href="/info/guides/guest-list"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              רשימת מוזמנים
            </Link>
            , ב־<Link
              href="/info/guides/cost-rsvp-wedding"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              כמה עולים אישורי הגעה
            </Link>
            , ב־<Link
              href="/info/guides/wedding-seating-arrangements"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              החלטות הושבה
            </Link>
            {" "}וב־<Link
              href="/info/guides/seating-plan"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              ביצוע הושבה במערכת
            </Link>
            .
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaClass} location="hero_cta:/info/guides">
              לצפייה בחבילות
            </TrackedCtaLink>
            <TrackedCtaLink href="/rsvp" className={secondaryClass} location="hero_cta:/info/guides">
              למערכת אישורי הגעה
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-5 pb-20 md:px-8">
        <GuidesLibrary
          guides={libraryGuides}
          categories={GUIDE_CATEGORIES}
          serviceLinks={PILLARS.map((pillar) => ({
            name: pillar.name,
            path: pillar.path,
          }))}
        />

        <section className="border border-[#C5A582] bg-[#42182F] p-7 md:p-10">
          <h2 className="text-3xl font-black text-[#FFF8F0]">מוכנים להתקדם מהמדריך לשירות?</h2>
          <p className="mt-3 max-w-2xl leading-8 text-[#F5EEE8]">
            בדקו חבילות לפי מספר רשומות, או חזרו לעמודי השירות של אישורי הגעה, הזמנות והושבה.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-none bg-[#F5EEE8] px-8 py-3 text-base font-black !text-[#42182F] hover:bg-[#FFF8F0]" location="footer_cta:/info/guides">
              מחשבון חבילות
            </TrackedCtaLink>
            <TrackedCtaLink href="/faq" className="inline-flex min-h-12 items-center justify-center rounded-none border border-[#C5A582] px-8 py-3 text-base font-black !text-[#FFF8F0] hover:bg-[#842B4C]" location="footer_cta:/info/guides">
              שאלות נפוצות
            </TrackedCtaLink>
          </div>
        </section>
      </div>
    </main>
  );
}
