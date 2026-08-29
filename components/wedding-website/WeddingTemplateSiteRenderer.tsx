"use client";

import { getWeddingTemplateSite } from "./templates";
import { setLiveWeddingContent } from "./shared/weddingUtils";
import { overlayWeddingTemplateImages } from "@/lib/weddingWebsite/images";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  embed?: boolean;
  live?: boolean;
  content?: WeddingDemoContent | null;
};

export default function WeddingTemplateSiteRenderer({
  template,
  embed,
  live,
  content,
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
    <>
      <style>{`
        a[href="/wedding-website"]{display:none!important}
        img[src=""], img:not([src]){display:none!important}
        .ww-site img {
          max-width: 100%;
        }
      `}</style>
      <Site template={resolvedTemplate} embed={embed} live={live} />
    </>
  );
}
