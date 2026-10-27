"use client";

import type { TemplateProps } from "../shared/weddingUtils";
import InteractiveWeddingSite from "../interactive/InteractiveWeddingSite";

export default function GardenMistSite(props: TemplateProps) {
  return <InteractiveWeddingSite {...props} themeId="garden-mist" />;
}
