"use client";

import { useWeddingSite } from "../editable/WeddingSiteContext";
import type { GuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";

/** Public guest links hide RSVP until a guest token exists. The visual editor always shows it. */
export function showWeddingRsvpSection(
  live?: boolean,
  rsvpController?: GuestRsvpController | null,
  isEditor?: boolean
) {
  if (isEditor) return true;
  return !(live && !rsvpController);
}

export function useShowWeddingRsvp(
  live?: boolean,
  rsvpController?: GuestRsvpController | null
) {
  const site = useWeddingSite();
  return showWeddingRsvpSection(live, rsvpController, site?.mode === "editor");
}
