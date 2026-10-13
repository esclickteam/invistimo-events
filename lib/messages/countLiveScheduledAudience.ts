/**
 * Server-only: live intended-recipient count for a ScheduledMessage.
 * Same criteria the worker uses at send time.
 */

import InvitationGuest from "@/models/InvitationGuest";
import { filterGuestsByInvitationAudience } from "@/lib/messages/invitationOnlyDetails";
import {
  findGuestIdsWithInvitationDeliveryStatus,
  findGuestIdsWithInvitationSendAttempt,
} from "@/lib/messages/invitationOnlySendHistory";
import {
  buildScheduledGuestsQuery,
  needsInvitationDeliveryStatusPostFilter,
  needsNeverInvitedPostFilter,
  scheduleUsesExplicitGuestIds,
} from "@/lib/messages/resolveScheduledAudience";
import { splitGuestsBySendPhone } from "@/lib/messages/sendPhoneEligibility";

const PHONE_FIELDS = "phone phoneNormalized phoneLengthApproved requiresPhoneReview";

function countSendable(
  guests: Array<{
    phone?: unknown;
    phoneNormalized?: unknown;
    phoneLengthApproved?: unknown;
    requiresPhoneReview?: unknown;
  }>
) {
  return splitGuestsBySendPhone(guests).sendable.length;
}

export async function countLiveScheduledAudience(schedule: {
  invitationId?: unknown;
  type?: unknown;
  templateKey?: unknown;
  round?: unknown;
  roundNumber?: unknown;
  filter?: unknown;
  guestIds?: unknown;
}): Promise<number> {
  const invitationId = schedule?.invitationId;
  if (!invitationId) return 0;

  if (scheduleUsesExplicitGuestIds(schedule)) {
    const ids = (Array.isArray(schedule.guestIds) ? schedule.guestIds : [])
      .map((id) => String(id || ""))
      .filter(Boolean);
    if (!ids.length) return 0;
    const guests = await InvitationGuest.find({
      invitationId,
      _id: { $in: ids },
    })
      .select(PHONE_FIELDS)
      .lean();
    return countSendable(guests);
  }

  const query = buildScheduledGuestsQuery({ schedule, invitationId });
  const guests = await InvitationGuest.find(query).select(`_id ${PHONE_FIELDS}`).lean();

  if (needsNeverInvitedPostFilter(schedule)) {
    const alreadyInvited = await findGuestIdsWithInvitationSendAttempt(
      String(invitationId)
    );
    return countSendable(
      filterGuestsByInvitationAudience({
        guests,
        filter: "never_invited",
        alreadyInvitedGuestIds: alreadyInvited,
      })
    );
  }

  const deliveryFilter = needsInvitationDeliveryStatusPostFilter(schedule);
  if (deliveryFilter) {
    const status =
      deliveryFilter === "failed"
        ? (["FAILED"] as const)
        : (["NOT_SENT"] as const);
    const deliveryIds = await findGuestIdsWithInvitationDeliveryStatus(
      String(invitationId),
      [...status]
    );
    return countSendable(
      filterGuestsByInvitationAudience({
        guests,
        filter: deliveryFilter,
        deliveryStatusGuestIds: deliveryIds,
      })
    );
  }

  return countSendable(guests);
}

export async function attachLiveGuestsCountToSchedules<
  T extends Record<string, any>,
>(schedules: T[]): Promise<Array<T & { liveGuestsCount: number }>> {
  return Promise.all(
    schedules.map(async (schedule) => ({
      ...schedule,
      liveGuestsCount: await countLiveScheduledAudience(schedule),
    }))
  );
}
