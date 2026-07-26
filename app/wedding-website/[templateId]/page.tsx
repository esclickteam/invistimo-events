import { notFound } from "next/navigation";
import WeddingWebsiteRenderer from "@/components/wedding-website/WeddingWebsiteRenderer";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";

type Props = {
  params: Promise<{ templateId: string }>;
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

export default async function WeddingTemplatePage({ params }: Props) {
  const { templateId } = await params;
  const template = getWeddingTemplate(templateId);

  if (!template) {
    notFound();
  }

  return <WeddingWebsiteRenderer template={template} />;
}
