"use client";

import { getWeddingTemplateSite } from "./templates";
import { setLiveWeddingContent } from "./shared/weddingUtils";
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

  if (!Site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>תבנית לא נמצאה</p>
      </div>
    );
  }

  return (
    <>
      {live ? (
        <style>{`a[href="/wedding-website"]{display:none!important}`}</style>
      ) : null}
      <Site template={template} embed={embed} live={live} />
    </>
  );
}
