/**
 * Server-only: invitation-only send history from delivery + queue collections.
 * Keep this file out of Client Components — it imports mongoose models.
 */

import RoundGuestDelivery from "@/models/RoundGuestDelivery";
import WhatsappQueue from "@/models/WhatsappQueue";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
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
