"use client";

import { getWeddingTemplateSite } from "./templates";
import { setLiveWeddingContent } from "./shared/weddingUtils";
import { overlayWeddingTemplateImages } from "@/lib/weddingWebsite/images";
import type { GuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import type { ReactNode } from "react";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  embed?: boolean;
  live?: boolean;
  content?: WeddingDemoContent | null;
  rsvpController?: GuestRsvpController | null;
  guestMessageSlot?: ReactNode;
};

export default function WeddingTemplateSiteRenderer({
  template,
  embed,
  live,
  content,
  rsvpController,
  guestMessageSlot,
}: Props) {
  setLiveWeddingContent(content || null);

  const Site = getWeddingTemplateSite(template.id);
  const resolvedTemplate =
    overlayWeddingTemplateImages(template, content) || template;

  if (!Site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>תבנית לא נמצאה</p>
      </div>
    );
  }

  return (
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
        template={resolvedTemplate}
        embed={embed}
        live={live}
        rsvpController={rsvpController}
        guestMessageSlot={guestMessageSlot}
      />
    </div>
  );
}
