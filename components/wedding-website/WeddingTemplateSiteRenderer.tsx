"use client";

import { getWeddingTemplateSite } from "./templates";
import { WeddingSiteProvider } from "./shared/WeddingSiteContext";
import { WeddingThemeProvider } from "./WeddingThemeProvider";
import { getDemoWeddingSiteContent } from "@/lib/weddingWebsite/resolveWeddingSiteContent";
import type {
  WeddingSectionToggles,
  WeddingSiteContent,
  WeddingTemplate,
  WeddingThemeOverrides,
  WeddingWebsiteGuestContext,
} from "@/types/weddingWebsite";
import type { WeddingEditApi } from "./editor/EditablePrimitives";
import EditFloatingToolbar from "./editor/EditFloatingToolbar";

type Props = {
  template: WeddingTemplate;
  embed?: boolean;
  content?: WeddingSiteContent;
  guest?: WeddingWebsiteGuestContext | null;
  sections?: WeddingSectionToggles;
  themeOverrides?: WeddingThemeOverrides;
  mode?: "demo" | "live" | "preview" | "edit";
  shareId?: string | null;
  hideDemoBadge?: boolean;
  edit?: WeddingEditApi | null;
};

export default function WeddingTemplateSiteRenderer({
  template,
  embed,
  content,
  guest = null,
  sections = {},
  themeOverrides = {},
  mode = "demo",
  shareId = null,
  hideDemoBadge = false,
  edit = null,
}: Props) {
  const Site = getWeddingTemplateSite(template.id);

  if (!Site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>תבנית לא נמצאה</p>
      </div>
    );
  }

  const resolvedContent = content || getDemoWeddingSiteContent(template.id);
  const siteMode = mode === "edit" ? "preview" : mode;

  return (
    <WeddingSiteProvider
      content={resolvedContent}
      guest={guest}
      sections={sections}
      themeOverrides={themeOverrides}
      mode={mode}
      shareId={shareId}
      edit={edit}
    >
      <WeddingThemeProvider
        template={template}
        content={resolvedContent}
        themeOverrides={themeOverrides}
      >
        <Site
          template={template}
          embed={embed || mode === "edit"}
          content={resolvedContent}
          guest={guest}
          mode={siteMode}
          shareId={shareId}
          hideDemoBadge={
            hideDemoBadge ||
            mode === "live" ||
            mode === "preview" ||
            mode === "edit"
          }
        />
        {mode === "edit" && edit?.enabled ? (
          <EditFloatingToolbar
            themeOverrides={themeOverrides}
            defaults={{
              accent: template.theme.accent,
              background: template.theme.bg,
              text: template.theme.text,
              button: template.theme.accent,
            }}
          />
        ) : null}
      </WeddingThemeProvider>
    </WeddingSiteProvider>
  );
}
