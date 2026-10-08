/**
 * Server-only: invitation-only send history from delivery + queue collections.
 * Keep this file out of Client Components — it imports mongoose models.
 */

import RoundGuestDelivery from "@/models/RoundGuestDelivery";
import WhatsappQueue from "@/models/WhatsappQueue";
import {
  filterGuestsByInvitationAudience,
  type InvitationOnlyAudienceFilter,
} from "@/lib/messages/invitationOnlyDetails";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function phoneSuffix(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const local = digits.startsWith("972")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return local.slice(-9);
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

export type InvitationDeliveryWhatsappStatus = "FAILED" | "NOT_SENT";

/**
 * Guests whose latest invitation_only RoundGuestDelivery WhatsApp status
 * matches the report (נכשל / לא נשלח).
 */
export async function findGuestIdsWithInvitationDeliveryStatus(
  invitationId: string,
  statuses: InvitationDeliveryWhatsappStatus[]
): Promise<Set<string>> {
  const id = cleanString(invitationId);
  if (!id || !statuses.length) return new Set();

  const rows = await RoundGuestDelivery.find({
    invitationId: id,
    type: "invitation_only",
    "whatsapp.status": { $in: statuses },
  })
    .select("guestId")
    .lean();

  const ids = new Set<string>();
  for (const row of rows) {
    if (row?.guestId) ids.add(String(row.guestId));
  }
  return ids;
}

/**
 * Resolve invitation_only audience from filter and/or a single phone.
 * Phone wins when provided (exact guest match by last 9 digits).
 */
export async function resolveInvitationOnlyAudienceGuests<
  T extends { _id?: unknown; phone?: unknown; phoneNumber?: unknown; mobile?: unknown; whatsapp?: unknown; contactPhone?: unknown },
>({
  invitationId,
  guests,
  filter,
  phone,
}: {
  invitationId: string;
  guests: T[];
  filter: InvitationOnlyAudienceFilter;
  phone?: unknown;
}): Promise<{ guests: T[]; resolvedFilter: InvitationOnlyAudienceFilter | "phone" }> {
  const phoneRaw = cleanString(phone);
  if (phoneRaw) {
    const suffix = phoneSuffix(phoneRaw);
    if (!suffix) {
      return { guests: [], resolvedFilter: "phone" };
    }

    const matched = guests.filter((guest) => {
      const candidates = [
        guest?.phone,
        guest?.phoneNumber,
        guest?.mobile,
        guest?.whatsapp,
        guest?.contactPhone,
      ];
      return candidates.some((value) => phoneSuffix(value) === suffix);
    });

    return { guests: matched, resolvedFilter: "phone" };
  }

  if (filter === "never_invited") {
    const alreadyInvited = await findGuestIdsWithInvitationSendAttempt(
      invitationId
    );
    return {
      guests: filterGuestsByInvitationAudience({
        guests,
        filter: "never_invited",
        alreadyInvitedGuestIds: alreadyInvited,
      }),
      resolvedFilter: "never_invited",
    };
  }

  if (filter === "failed" || filter === "not_sent") {
    const status =
      filter === "failed"
        ? (["FAILED"] as InvitationDeliveryWhatsappStatus[])
        : (["NOT_SENT"] as InvitationDeliveryWhatsappStatus[]);
    const deliveryIds = await findGuestIdsWithInvitationDeliveryStatus(
      invitationId,
      status
    );
    return {
      guests: filterGuestsByInvitationAudience({
        guests,
        filter,
        deliveryStatusGuestIds: deliveryIds,
      }),
      resolvedFilter: filter,
    };
  }

  return { guests, resolvedFilter: "all" };
}
