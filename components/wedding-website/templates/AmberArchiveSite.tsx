"use client";

import type { TemplateProps } from "../shared/weddingUtils";
import InteractiveWeddingSite from "../interactive/InteractiveWeddingSite";

export default function AmberArchiveSite(props: TemplateProps) {
  return <InteractiveWeddingSite {...props} themeId="amber-archive" />;
}
