"use client";

import type { TemplateProps } from "../shared/weddingUtils";
import InteractiveWeddingSite from "../interactive/InteractiveWeddingSite";

export default function NoirChampagneSite(props: TemplateProps) {
  return <InteractiveWeddingSite {...props} themeId="noir-champagne" />;
}
