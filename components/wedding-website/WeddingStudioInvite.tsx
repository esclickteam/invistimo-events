"use client";

import type { ReactNode } from "react";
import InvitationArt from "@/components/invitation-studio/InvitationArt";
import type { StudioSnapshot } from "@/lib/invitationStudio/types";
import { useWeddingSite } from "./editable/WeddingSiteContext";

export default function WeddingStudioInvite({
  children,
  className = "mx-auto mt-8 w-full max-w-md",
}: {
  children: ReactNode;
  className?: string;
}) {
  const site = useWeddingSite();
  const snapshot = site?.live?.studioDesign?.snapshot as StudioSnapshot | undefined;
  if (snapshot?.plate || (snapshot && snapshot.layers?.length)) {
    return (
      <div className={className} data-testid="wedding-studio-invite">
        <InvitationArt snapshot={snapshot} play />
      </div>
    );
  }
  return <>{children}</>;
}
