import { notFound } from "next/navigation";
import PublicContentPage from "@/components/marketing/PublicContentPage";
import { articleNode } from "@/lib/seo/jsonld";
import { getGuide, GUIDES, guidePath } from "@/lib/seo/guides";
import { pageMetadata } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Dedicated routes under app/(marketing)/info/guides/<slug>/page.tsx
  const dedicated = new Set([
    "when-to-send-rsvp",
    "guests-who-dont-reply",
    "guest-list",
    "wedding-venue-guest-guarantee",
    "wedding-seating-arrangements",
    "cost-rsvp-wedding",
    "whatsapp-vs-sms-rsvp",
    "how-to-choose-rsvp-company",
    "wedding-alcohol-calculator",
    "wedding-planning",
    "wedding-vendors-contracts",
    "table-number-message",
  ]);
  return GUIDES.filter((guide) => !dedicated.has(guide.slug)).map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const path = guidePath(guide.slug);
  return pageMetadata({
    title: `${guide.title} | Invistimo`,
    description: guide.description,
    path,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const path = guidePath(guide.slug);

  return (
    <PublicContentPage
      eyebrow="מדריך"
      title={guide.h1}
      titleAccent={guide.titleAccent}
      lede={guide.lede}
      sections={guide.sections}
      faqs={guide.faqs}
      benefits={guide.benefits}
      steps={guide.steps}
      media={guide.media}
      showEventTypes={guide.showEventTypes}
      ctaTitle={guide.ctaTitle}
      ctaLede={guide.ctaLede}
      breadcrumbs={[
        { name: "ראשי", path: "/" },
        { name: "מדריכים", path: "/info/guides" },
        { name: guide.h1, path },
      ]}
      path={path}
      related={
        guide.related?.length
          ? guide.related
          : [
              { href: "/info/guides", label: "כל המדריכים" },
              { href: "/pricing", label: "חבילות ומחירים" },
              { href: "/rsvp", label: "אישורי הגעה" },
              { href: "/faq", label: "שאלות נפוצות" },
            ]
      }
      extraJsonLd={[articleNode({ title: guide.h1, description: guide.description, path })]}
    />
  );
}
