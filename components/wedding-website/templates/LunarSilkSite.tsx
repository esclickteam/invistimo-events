"use client";

import type { TemplateProps } from "../shared/weddingUtils";
import InteractiveWeddingSite from "../interactive/InteractiveWeddingSite";

export default function LunarSilkSite(props: TemplateProps) {
  return <InteractiveWeddingSite {...props} themeId="lunar-silk" />;
}
