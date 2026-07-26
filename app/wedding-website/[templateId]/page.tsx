import { notFound } from "next/navigation";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export async function generateStaticParams() {
  return [
    { templateId: "eternal-gold" },
    { templateId: "midnight-velvet" },
    { templateId: "garden-bloom" },
    { templateId: "coastal-breeze" },
    { templateId: "desert-rose" },
    { templateId: "minimal-noir" },
    { templateId: "royal-ivory" },
    { templateId: "sunset-blush" },
    { templateId: "forest-enchanted" },
    { templateId: "modern-glass" },
  ];
}

export async function generateMetadata({ params }: Props) {
  const { templateId } = await params;
  const template = getWeddingTemplate(templateId);

  if (!template) {
    return { title: "תבנית לא נמצאה" };
  }

  return {
    title: `${template.name} | אתר חתונה — Invistimo`,
    description: template.description,
    openGraph: {
      title: `${template.name} — ${template.tagline}`,
      description: template.description,
      images: [template.previewImage],
    },
  };
}

export default async function WeddingTemplatePage({ params, searchParams }: Props) {
  const { templateId } = await params;
  const { embed } = await searchParams;
  const template = getWeddingTemplate(templateId);

  if (!template) {
    notFound();
  }

  const isEmbed = embed === "1" || embed === "true";

  return <WeddingTemplateSiteRenderer template={template} embed={isEmbed} />;
}
