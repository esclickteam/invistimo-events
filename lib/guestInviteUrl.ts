import {
  isPersonalRsvpSite,
  normalizeRsvpSiteMode,
  type RsvpSiteMode,
} from "@/types/rsvpSite";

export const DEFAULT_PUBLIC_ORIGIN = "https://www.invistimo.com";

export function getInvitationRsvpSiteMode(invitation?: {
  invitationSettings?: { rsvpSiteMode?: unknown };
  rsvpSiteMode?: unknown;
} | null): RsvpSiteMode {
  return normalizeRsvpSiteMode(
    invitation?.invitationSettings?.rsvpSiteMode ?? invitation?.rsvpSiteMode
  );
}

export function buildGuestInvitePath(
  shareId: string,
  rsvpSiteMode?: unknown
) {
  const cleanShareId = String(shareId || "").trim();
  if (!cleanShareId) return "";

  return isPersonalRsvpSite(rsvpSiteMode)
    ? `/w/${cleanShareId}`
    : `/invite/${cleanShareId}`;
}

export function buildGuestInviteUrl({
  shareId,
  token,
  rsvpSiteMode,
  origin = DEFAULT_PUBLIC_ORIGIN,
}: {
  shareId: string;
  token?: string;
  rsvpSiteMode?: unknown;
  origin?: string;
}) {
  const path = buildGuestInvitePath(shareId, rsvpSiteMode);
  if (!path) return "";

  const base = `${String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/$/, "")}${path}`;
  const cleanToken = String(token || "").trim();

  if (!cleanToken) return base;

  return `${base}?token=${encodeURIComponent(cleanToken)}`;
}
