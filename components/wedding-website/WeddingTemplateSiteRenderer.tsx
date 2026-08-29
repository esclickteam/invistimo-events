"use client";

import "@/app/wedding-website/wedding-website.css";
import { getWeddingTemplateSite } from "./templates";
import { setLiveWeddingContent } from "./shared/weddingUtils";
import { overlayWeddingTemplateImages } from "@/lib/weddingWebsite/images";
import type { GuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import type { ReactNode } from "react";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";
import { WeddingSiteProvider, useWeddingSite } from "./editable/WeddingSiteContext";
import { WeddingSiteHydrator, WeddingSiteRuntimeStyles } from "./editable/SiteHydrator";

type Props = {
  template: WeddingTemplate;
  embed?: boolean;
  live?: boolean;
  content?: WeddingDemoContent | null;
  rsvpController?: GuestRsvpController | null;
  guestMessageSlot?: ReactNode;
};

export default function WeddingTemplateSiteRenderer(props: Props) {
  setLiveWeddingContent(props.content || null);
  const existing = useWeddingSite();
  const resolvedTemplate =
    overlayWeddingTemplateImages(props.template, props.content) || props.template;

  const tree = <RenderedSite {...props} template={resolvedTemplate} />;

  if (existing) return tree;

  return (
    <WeddingSiteProvider
      mode="public"
      template={resolvedTemplate}
      content={props.content || ({} as WeddingDemoContent)}
      editor={null}
    >
      {tree}
    </WeddingSiteProvider>
  );
}

function RenderedSite({
  template,
  embed,
  live,
  rsvpController,
  guestMessageSlot,
}: Props) {
  const Site = getWeddingTemplateSite(template.id);

  if (!Site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>תבנית לא נמצאה</p>
      </div>
    );
  }

  return (
    <>
      <WeddingSiteRuntimeStyles />
      <WeddingSiteHydrator>
        <div className="ww-site overflow-x-hidden">
          <style>{`
            a[href="/wedding-website"]{display:none!important}
            a[href="/"]{ }
            img[src=""], img:not([src]){display:none!important}
            .ww-site img {
              max-width: 100%;
            }
            .ww-site .ww-cover,
            .ww-site .ww-cover img,
            .ww-hero-media {
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
            }
            .ww-site header.invistimo-header,
            .ww-site footer.invistimo-footer,
            [data-invistimo-chrome] {
              display: none !important;
            }
          `}</style>
          <Site
            template={template}
            embed={embed}
            live={live}
            rsvpController={rsvpController}
            guestMessageSlot={guestMessageSlot}
          />
        </div>
      </WeddingSiteHydrator>
    </>
  );
}
