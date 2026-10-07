/**
 * Invitation-only (pre-RSVP) helpers.
 *
 * Intentionally separate from RSVP round send paths.
 * Location reuses buildEventLocationLabel / cleanEventAddress from liveEventDetails
 * so invitation copy matches RSVP — without modifying RSVP send logic.
 *
 * Date/time for WhatsApp stay on the existing approved template variable:
 * a single eventDate string, unchanged from the current Meta template.
 */

import RoundGuestDelivery from "@/models/RoundGuestDelivery";
import WhatsappQueue from "@/models/WhatsappQueue";
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

/**
 * Guests who already had an invitation-only send attempt from the system
 * (queue insert or delivery tracking). Status alone is not used.
 */
export async function findGuestIdsWithInvitationSendAttempt(
  invitationId: string
): Promise<Set<string>> {
  const id = cleanString(invitationId);
  if (!id) return new Set();

  const [deliveries, queueRows] = await Promise.all([
    RoundGuestDelivery.find({
      invitationId: id,
      type: "invitation_only",
    })
      .select("guestId")
      .lean(),
    WhatsappQueue.find({
      invitationId: id,
      type: "invitation_only",
    })
      .select("guestId")
      .lean(),
  ]);

  const ids = new Set<string>();
  for (const row of deliveries) {
    if (row?.guestId) ids.add(String(row.guestId));
  }
  for (const row of queueRows) {
    if (row?.guestId) ids.add(String(row.guestId));
  }
  return ids;
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
