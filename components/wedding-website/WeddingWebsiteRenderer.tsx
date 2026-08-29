"use client";

/**
 * Legacy entry — always delegates to the live template sites.
 * Keeps old imports from accidentally rendering WeddingNav + broken Unsplash media.
 */
import WeddingTemplateSiteRenderer from "./WeddingTemplateSiteRenderer";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
};

export default function WeddingWebsiteRenderer({ template }: Props) {
  return <WeddingTemplateSiteRenderer template={template} />;
}
