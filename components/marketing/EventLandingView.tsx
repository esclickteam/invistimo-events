import Link from "next/link";
import PublicContentPage from "@/components/marketing/PublicContentPage";
import { serviceNode } from "@/lib/seo/jsonld";
import type { EventLanding } from "@/lib/seo/eventLandings";

export default function EventLandingView({ landing }: { landing: EventLanding }) {
  return (
    <PublicContentPage
      eyebrow={landing.eyebrow}
      title={landing.h1}
      titleAccent={landing.titleAccent}
      lede={landing.lede}
      sections={landing.sections}
      faqs={landing.faqs}
      related={landing.related}
      breadcrumbs={[
        { name: "ראשי", path: "/" },
        { name: "אישורי הגעה", path: "/rsvp" },
        { name: landing.eyebrow, path: landing.path },
      ]}
      path={landing.path}
      benefits={landing.benefits}
      steps={landing.steps}
      media={{
        type: "image",
        src: landing.showcaseSrc,
        alt: landing.showcaseAlt,
        variant: landing.showcaseSrc.includes("mobile") ? "phone" : "wide",
        caption: "צילום ממסך הדמו — נתונים פיקטיביים בלבד",
      }}
      showEventTypes={false}
      showJourney={true}
      primaryCta={{ href: "/try", label: "לצפייה בדמו" }}
      secondaryCta={{ href: "/pricing", label: "לחבילות" }}
      ctaTitle={`מוכנים לנהל ${landing.eyebrow}?`}
      ctaLede="המחיר במחשבון לפי מספר רשומות וחבילה. אפשר גם להתחיל מהדמו בלי לשלוח הודעות אמיתיות."
      serviceFits={landing.servicesThatFit}
      extraJsonLd={[
        serviceNode({
          name: landing.h1,
          description: landing.description,
          path: landing.path,
          serviceType: landing.serviceType,
        }),
      ]}
    />
  );
}

/** Compact link strip used when embedding event fits outside PublicContentPage. */
export function ServiceFitStrip({
  items,
}: {
  items: { href: string; label: string; note: string }[];
}) {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
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
  );
}
