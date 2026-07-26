"use client";

import { getWeddingTemplateSite } from "./templates";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  embed?: boolean;
};

export default function WeddingTemplateSiteRenderer({ template, embed }: Props) {
  const Site = getWeddingTemplateSite(template.id);

  if (!Site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>תבנית לא נמצאה</p>
      </div>
    );
  }

  return <Site template={template} embed={embed} />;
}
