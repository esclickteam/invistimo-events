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
    return ids.length;
  }

  const query = buildScheduledGuestsQuery({ schedule, invitationId });
  const guests = await InvitationGuest.find(query).select("_id").lean();

  if (needsNeverInvitedPostFilter(schedule)) {
    const alreadyInvited = await findGuestIdsWithInvitationSendAttempt(
      String(invitationId)
    );
    return filterGuestsByInvitationAudience({
      guests,
      filter: "never_invited",
      alreadyInvitedGuestIds: alreadyInvited,
    }).length;
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
    return filterGuestsByInvitationAudience({
      guests,
      filter: deliveryFilter,
      deliveryStatusGuestIds: deliveryIds,
    }).length;
  }

  return guests.length;
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
