import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import { loadPublicWeddingSite } from "@/lib/weddingWebsite/loadPublicWeddingSite";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import "../wedding-website/wedding-website.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ token?: string; preview?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const payload = await loadPublicWeddingSite({
    shareId,
    allowDraft: false,
  });

  if (!payload) {
    return { title: "אתר חתונה | Invistimo" };
  }

  const title = `${payload.content.coupleNames || "החתונה שלנו"} | אתר חתונה`;
  const description =
    payload.content.heroSubtitle ||
    `פרטי האירוע, הגעה ואישור הגעה — ${payload.content.coupleNames}`;

  const ogImage =
    payload.content.heroImageUrl ||
    getWeddingTemplate(payload.templateId)?.previewImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: "he_IL",
      type: "website",
    },
  };
}

export default async function LiveWeddingWebsitePage({
  params,
  searchParams,
}: PageProps) {
  const { shareId } = await params;
  const sp = await searchParams;
  const allowDraft = sp.preview === "1" || sp.preview === "draft";

  const payload = await loadPublicWeddingSite({
    shareId,
    token: sp.token,
    allowDraft,
  });

  if (!payload) notFound();
  if (payload.status !== "published" && !allowDraft) notFound();

  const template = getWeddingTemplate(payload.templateId);
  if (!template) notFound();

  // Prefer resolved hero on template clone for display
  const liveTemplate = {
    ...template,
    heroImage: payload.content.heroImageUrl || template.heroImage,
    galleryImages:
      payload.content.galleryUrls.length > 0
        ? payload.content.galleryUrls
        : template.galleryImages,
  };

  return (
    <div dir="rtl" lang="he">
      <WeddingTemplateSiteRenderer
        template={liveTemplate}
        content={payload.content}
        guest={payload.guest}
        sections={payload.sections}
        mode="live"
        shareId={payload.shareId}
        hideDemoBadge
      />
    </div>
  );
}
