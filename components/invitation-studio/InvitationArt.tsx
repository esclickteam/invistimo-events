"use client";

import { useEffect } from "react";
import { STUDIO_FONT_STYLESHEET } from "@/lib/invitationStudio/fonts";
import { renderSnapshot } from "@/lib/invitationStudio/render";
import { renderModelToSvg } from "@/lib/invitationStudio/svg";
import type { StudioSnapshot } from "@/lib/invitationStudio/types";

export default function InvitationArt({
  snapshot,
  guestName,
  className = "",
}: {
  snapshot: StudioSnapshot;
  guestName?: string;
  className?: string;
}) {
  useEffect(() => {
    if (document.getElementById("studio-fonts")) return;
    const link = document.createElement("link");
    link.id = "studio-fonts";
    link.rel = "stylesheet";
    link.href = STUDIO_FONT_STYLESHEET;
    document.head.appendChild(link);
  }, []);

  const model = renderSnapshot(snapshot, guestName);
  const svg = renderModelToSvg(model).replace(/^\s*<\?xml[^>]*>\s*/i, "");

  return (
    <div
      className={className}
      data-testid="invitation-art"
      style={{ aspectRatio: `${model.width} / ${model.height}`, width: "100%" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
