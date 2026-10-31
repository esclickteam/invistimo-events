"use client";

import type { TemplateProps } from "../shared/weddingUtils";
import InteractiveWeddingSite from "../interactive/InteractiveWeddingSite";

export default function CoastalPearlSite(props: TemplateProps) {
  return <InteractiveWeddingSite {...props} themeId="coastal-pearl" />;
}
