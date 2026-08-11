"use client";

import { getWeddingTemplateSite } from "./templates";
import { WeddingSiteProvider } from "./shared/WeddingSiteContext";
import { getDemoWeddingSiteContent } from "@/lib/weddingWebsite/resolveWeddingSiteContent";
import type {
  WeddingSectionToggles,
  WeddingSiteContent,
  WeddingTemplate,
  WeddingWebsiteGuestContext,
} from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  embed?: boolean;
  content?: WeddingSiteContent;
  guest?: WeddingWebsiteGuestContext | null;
  sections?: WeddingSectionToggles;
  mode?: "demo" | "live";
  shareId?: string | null;
  hideDemoBadge?: boolean;
};

export default function WeddingTemplateSiteRenderer({
  template,
  embed,
  content,
  guest = null,
  sections = {},
  mode = "demo",
  shareId = null,
  hideDemoBadge = false,
}: Props) {
  const Site = getWeddingTemplateSite(template.id);

  if (!Site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>תבנית לא נמצאה</p>
      </div>
    );
  }

  const resolvedContent =
    content || getDemoWeddingSiteContent(template.id);

  return (
    <WeddingSiteProvider
      content={resolvedContent}
      guest={guest}
      sections={sections}
      mode={mode}
      shareId={shareId}
    >
      <Site
        template={template}
        embed={embed}
        content={resolvedContent}
        guest={guest}
        mode={mode}
        shareId={shareId}
        hideDemoBadge={hideDemoBadge || mode === "live"}
      />
    </WeddingSiteProvider>
  );
}
