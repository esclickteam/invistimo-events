/**
 * Invitation-only (pre-RSVP) helpers — safe for Client Components (no DB models).
 *
 * Intentionally separate from RSVP round send paths.
 * Location reuses buildEventLocationLabel / cleanEventAddress from liveEventDetails
 * so invitation copy matches RSVP — without modifying RSVP send logic.
 *
 * Date/time for WhatsApp stay on the existing approved template variable:
 * a single eventDate string, unchanged from the current Meta template.
 *
 * Send-history queries live in a separate server-only module.
 */

import {
  buildEventLocationLabel,
  cleanEventAddress,
} from "@/lib/messages/liveEventDetails";

export type InvitationOnlyAudienceFilter = "all" | "never_invited";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

/** Same location label RSVP live-details uses (includes() guard, strip ישראל). */
export function buildInvitationLocationLabel(invitation?: any, event?: any) {
  return (
    cleanEventAddress(buildEventLocationLabel(invitation, event)) ||
    buildEventLocationLabel(invitation, event)
  );
}

export function resolveInvitationImageUrl(invitation?: any, event?: any) {
  return cleanString(
    invitation?.preRsvpMedia?.invitationOnlyImageUrl ||
      invitation?.headerImageUrl ||
      invitation?.previewImageUrl ||
      invitation?.imageUrl ||
      invitation?.canvasImageUrl ||
      invitation?.previewImage ||
      event?.headerImageUrl ||
      event?.imageUrl ||
      event?.coverImageUrl ||
      ""
  );
}

export function filterGuestsByInvitationAudience<T extends { _id?: unknown }>({
  guests,
  filter,
  alreadyInvitedGuestIds,
}: {
  guests: T[];
  filter: InvitationOnlyAudienceFilter;
  alreadyInvitedGuestIds: Set<string>;
}): T[] {
  if (filter !== "never_invited") return guests;

  return guests.filter((guest) => {
    const guestId = String(guest?._id || "");
    if (!guestId) return false;
    return !alreadyInvitedGuestIds.has(guestId);
  });
}

export function parseInvitationOnlyAudienceFilter(
  value: unknown
): InvitationOnlyAudienceFilter {
  return cleanString(value) === "never_invited" ? "never_invited" : "all";
}
