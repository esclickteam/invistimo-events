import { notFound } from "next/navigation";
import PublicContentPage from "@/components/marketing/PublicContentPage";
import { articleNode } from "@/lib/seo/jsonld";
import { getGuide, GUIDES, guidePath } from "@/lib/seo/guides";
import { pageMetadata } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
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
      lede={guide.lede}
      sections={guide.sections}
      faqs={guide.faqs}
      breadcrumbs={[
        { name: "ראשי", path: "/" },
        { name: "מדריכים", path: "/info/guides" },
        { name: guide.h1, path },
      ]}
      path={path}
      related={[
        { href: "/info/guides", label: "כל המדריכים" },
        { href: "/pricing", label: "חבילות ומחירים" },
        { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
        { href: "/faq", label: "שאלות נפוצות" },
      ]}
      extraJsonLd={[articleNode({ title: guide.h1, description: guide.description, path })]}
    />
  );
}
