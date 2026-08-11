/**
 * Hard boundary between Regular Events and Venue-linked Events.
 *
 * Regular Event:
 *  - must NOT receive venueAccessStatus = "linked"
 *  - must NOT require venueId / VenueEvent / VenueMembership
 *
 * Venue-linked Event:
 *  - MUST have a deterministic, verified relation to:
 *      VenueHall + VenueEvent + linkedEventId
 */

import mongoose from "mongoose";
import VenueEvent from "@/models/VenueEvent";
import VenueHall from "@/models/VenueHall";

export type VenueLinkClassification =
  | "REGULAR"
  | "TRUE_VENUE_LINK"
  | "FALSE_VENUE_LINK";

export type VenueLinkAssessment = {
  classification: VenueLinkClassification;
  eventId: string;
  venueAccessStatus: string;
  venueHallId: string;
  venueOwnerId: string;
  venueEventId: string | null;
  venueEventHallId: string | null;
  hallExists: boolean;
  hallMatches: boolean;
  linkedEventIdMatches: boolean;
  reason: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function idsEqual(a: unknown, b: unknown) {
  return cleanString(a) !== "" && cleanString(a) === cleanString(b);
}

export function isLinkedStatus(value: unknown) {
  return cleanString(value).toLowerCase() === "linked";
}

/**
 * Resolve a VenueHall by slug `id` or Mongo `_id`.
 */
export async function findVenueHallByAnyId(hallIdRaw: unknown) {
  const hallId = cleanString(hallIdRaw);
  if (!hallId) return null;

  const or: Record<string, unknown>[] = [{ id: hallId }];
  if (mongoose.Types.ObjectId.isValid(hallId)) {
    or.push({ _id: hallId });
  }

  return VenueHall.findOne({ $or: or }).lean();
}

/**
 * True only when Event ↔ VenueEvent(linkedEventId) ↔ VenueHall is consistent.
 */
export function isDeterministicVenueLink(input: {
  event: any;
  venueEvent: any | null | undefined;
  hall: any | null | undefined;
}): boolean {
  const { event, venueEvent, hall } = input;
  if (!event || !venueEvent || !hall) return false;

  const eventId = cleanString(event._id);
  const linked = cleanString(venueEvent.linkedEventId);
  if (!eventId || !idsEqual(eventId, linked)) return false;

  const eventHallId = cleanString(event.venueHallId);
  const veHallId = cleanString(venueEvent.hallId || venueEvent.venueId);
  const hallKey = cleanString(hall.id || hall._id);

  if (!hallKey) return false;

  // Hall must match VenueEvent.hallId; Event.venueHallId if present must agree.
  if (!idsEqual(veHallId, hallKey) && !idsEqual(veHallId, hall._id)) {
    return false;
  }

  if (
    eventHallId &&
    !idsEqual(eventHallId, hallKey) &&
    !idsEqual(eventHallId, hall._id) &&
    !idsEqual(eventHallId, veHallId)
  ) {
    return false;
  }

  return true;
}

/**
 * Load VenueEvent + Hall for an Event and classify the link.
 */
export async function assessEventVenueLink(
  event: any
): Promise<VenueLinkAssessment> {
  const eventId = cleanString(event?._id);
  const venueAccessStatus = cleanString(event?.venueAccessStatus) || "none";
  const venueHallId = cleanString(event?.venueHallId);
  const venueOwnerId = cleanString(event?.venueOwnerId);

  const venueEvent = eventId
    ? await VenueEvent.findOne({
        linkedEventId: mongoose.Types.ObjectId.isValid(eventId)
          ? new mongoose.Types.ObjectId(eventId)
          : eventId,
      }).lean()
    : null;

  // Also try string linkedEventId for legacy rows
  const venueEventResolved =
    venueEvent ||
    (eventId
      ? await VenueEvent.findOne({ linkedEventId: eventId }).lean()
      : null);

  const veHallId = cleanString(
    (venueEventResolved as any)?.hallId ||
      (venueEventResolved as any)?.venueId
  );
  const hall =
    (await findVenueHallByAnyId(venueHallId)) ||
    (await findVenueHallByAnyId(veHallId));

  const hallExists = Boolean(hall);
  const linkedEventIdMatches = Boolean(
    venueEventResolved &&
      idsEqual((venueEventResolved as any).linkedEventId, eventId)
  );
  const hallMatches = isDeterministicVenueLink({
    event,
    venueEvent: venueEventResolved,
    hall,
  });

  const base = {
    eventId,
    venueAccessStatus,
    venueHallId,
    venueOwnerId,
    venueEventId: venueEventResolved
      ? cleanString((venueEventResolved as any)._id)
      : null,
    venueEventHallId: veHallId || null,
    hallExists,
    hallMatches,
    linkedEventIdMatches,
  };

  if (!isLinkedStatus(venueAccessStatus)) {
    return {
      ...base,
      classification: "REGULAR",
      reason: "venueAccessStatus is not linked",
    };
  }

  if (hallMatches) {
    return {
      ...base,
      classification: "TRUE_VENUE_LINK",
      reason: "VenueHall + VenueEvent.linkedEventId verified",
    };
  }

  let reason = "linked without deterministic VenueHall + VenueEvent";
  if (!venueEventResolved) reason = "linked but no VenueEvent with linkedEventId";
  else if (!hallExists) reason = "linked VenueEvent but VenueHall missing";
  else reason = "linked but hall / linkedEventId mismatch";

  return {
    ...base,
    classification: "FALSE_VENUE_LINK",
    reason,
  };
}

/**
 * Only true venue links may keep / receive venueAccessStatus=linked.
 */
export async function eventHasVerifiedVenueLink(event: any): Promise<boolean> {
  const assessment = await assessEventVenueLink(event);
  return assessment.classification === "TRUE_VENUE_LINK";
}

/**
 * Fields that must never be written by Regular invitation sync.
 */
export const VENUE_LINK_WRITE_FIELDS = [
  "venueAccessStatus",
  "venueLinkedAt",
  "venueOwnerId",
  "venueHallId",
  "venueHallName",
  "venueClientInvitationId",
  "venueClientEventId",
  "venueClientUserId",
  "venueClientRecordsCount",
] as const;
