"use client";

import WeddingVisualEditor from "@/components/wedding-website/editor/WeddingVisualEditor";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import { moveGalleryImage } from "@/components/wedding-website/editor/EditorSidebar";

export default function DashboardWeddingWebsitePage() {
  return <WeddingVisualEditor />;
}

export const WEDDING_WEBSITE_EDITOR_COMPAT = {
  hasWeddingWebsiteFeature,
  moveGalleryImage,
  mediaApi: "/api/wedding-website/media",
  heroImage: "heroImage",
  galleryImages: "galleryImages",
  renderer: "WeddingTemplateSiteRenderer",
};
