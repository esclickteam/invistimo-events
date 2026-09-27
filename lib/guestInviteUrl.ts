import {
  isPersonalRsvpSite,
  normalizeRsvpSiteMode,
  type RsvpSiteMode,
} from "@/types/rsvpSite";

export const DEFAULT_PUBLIC_ORIGIN = "https://www.invistimo.com";

export type GuestInvitationSource = {
  invitationSettings?: {
    rsvpSiteMode?: unknown;
    guestExperienceType?: unknown;
  };
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
} | null;

export function getInvitationRsvpSiteMode(
  invitation?: GuestInvitationSource
): RsvpSiteMode {
  return normalizeRsvpSiteMode(
    invitation?.invitationSettings?.rsvpSiteMode ??
      invitation?.invitationSettings?.guestExperienceType ??
      invitation?.rsvpSiteMode ??
      invitation?.guestExperienceType
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

type GuestInvitationUrlInput = {
  shareId: string;
  token?: string;
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
  /**
   * Public origin for messages and copy-link.
   * Pass `""` for a same-origin relative URL (dashboard preview, staff).
   */
  origin?: string | null;
  preview?: string | null;
  extraParams?: Record<string, string | number | boolean | null | undefined>;
};

function appendSearchParams(
  base: string,
  params: URLSearchParams
) {
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Single source of truth for the guest-facing invitation URL.
 *
 * personal_invitation → `/invite/[shareId]?token=`
 * wedding_website     → `/w/[shareId]?token=`
 *
 * Tokens are never rewritten when guestExperienceType changes.
 */
export function getGuestInvitationUrl({
  shareId,
  token,
  rsvpSiteMode,
  guestExperienceType,
  origin = DEFAULT_PUBLIC_ORIGIN,
  preview,
  extraParams,
}: GuestInvitationUrlInput) {
  const path = buildGuestInvitePath(
    shareId,
    rsvpSiteMode ?? guestExperienceType
  );
  if (!path) return "";

  const originValue =
    origin === "" || origin === null
      ? ""
      : String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/$/, "");
  const base = `${originValue}${path}`;
  const params = new URLSearchParams();

  const cleanToken = String(token || "").trim();
  if (cleanToken) params.set("token", cleanToken);

  const cleanPreview = String(preview || "").trim();
  if (cleanPreview) params.set("preview", cleanPreview);

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value === undefined || value === null || value === false) continue;
      const text = String(value).trim();
      if (!text) continue;
      params.set(key, text);
    }
  }

  return appendSearchParams(base, params);
}

/**
 * WhatsApp template buttons are fixed to `/invite/{{1}}`, so guests of a wedding-website
 * invitation land on `/invite/[shareId]`. Returns the `/w/[shareId]` path (query/token kept)
 * when the guest should be forwarded, or null to keep rendering the personal invitation.
 */
export function getPersonalSiteRedirectPath(input: {
  invitation:
    | (NonNullable<GuestInvitationSource> & { weddingWebsite?: { published?: boolean } | null })
    | null
    | undefined;
  shareId: string;
  search?: string;
  isStaffPreview?: boolean;
}) {
  const { invitation, isStaffPreview } = input;
  if (!invitation || isStaffPreview) return null;
  if (!isPersonalRsvpSite(getInvitationRsvpSiteMode(invitation))) return null;
  if (invitation.weddingWebsite?.published === false) return null;

  const path = buildGuestInvitePath(input.shareId, "personal");
  if (!path) return null;

  const params = new URLSearchParams(String(input.search || "").replace(/^\?/, ""));
  if (params.get("preview")) return null;
  return appendSearchParams(path, params);
}

/** @deprecated Use getGuestInvitationUrl — kept as a compatible alias. */
export const buildGuestInviteUrl = getGuestInvitationUrl;
