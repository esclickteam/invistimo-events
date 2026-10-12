import mongoose from "mongoose";

import Invitation from "@/models/Invitation";

export function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

export function objectIdOrString(value: unknown) {
  const stringValue = cleanString(value);
  const objectIdValue = toObjectId(stringValue);

  return objectIdValue ? [objectIdValue, stringValue] : [stringValue];
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function uniqueValues(values: any[]) {
  return Array.from(
    new Map(
      values
        .filter((value) => value !== undefined && value !== null && String(value).trim())
        .map((value) => [String(value), value])
    ).values()
  );
}

export function getEventIdValues(eventId: string) {
  return uniqueValues(objectIdOrString(eventId));
}

function getInvitationIdValues(invitationId: string) {
  return uniqueValues(objectIdOrString(invitationId));
}

function getAuthUserIdValues(userId: string) {
  return uniqueValues(objectIdOrString(userId));
}

export function eventIdQuery(eventId: string) {
  return { eventId: { $in: getEventIdValues(eventId) } };
}

export async function findInvitationForSeating({
  eventId,
  invitationId,
}: {
  eventId: string;
  invitationId?: string;
}) {
  const eventIdValues = getEventIdValues(eventId);

  if (invitationId) {
    const invitationObjectId = toObjectId(invitationId);

    if (invitationObjectId) {
      const directInvitation = await Invitation.findById(invitationObjectId)
        .select(
          "_id ownerId userId producerId producers eventId venueClientEventId productionEventId linkedEventId guests"
        )
        .lean();

      if (directInvitation) return directInvitation;
    }
  }

  return Invitation.findOne({
    $or: [
      { eventId: { $in: eventIdValues } },
      { venueClientEventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
      { event: { $in: eventIdValues } },
      { event_id: { $in: eventIdValues } },
    ],
  })
    .select(
      "_id ownerId userId producerId producers eventId venueClientEventId productionEventId linkedEventId guests"
    )
    .lean();
}

async function findLinkedVenueEvent({
  authUserId,
  eventId,
  invitationId,
  invitation,
}: {
  authUserId: string;
  eventId: string;
  invitationId?: string;
  invitation?: any;
}) {
  const events = getCollection("events");

  if (!events) return null;

  const ownerValues = getAuthUserIdValues(authUserId);
  const eventIdValues = getEventIdValues(eventId);

  const invitationValues: any[] = [];

  if (invitationId) {
    invitationValues.push(...getInvitationIdValues(invitationId));
  }

  if (invitation?._id) {
    invitationValues.push(...objectIdOrString(invitation._id));
  }

  const orQuery: any[] = [
    { _id: { $in: eventIdValues } },
    { eventId: { $in: eventIdValues } },
    { venueClientEventId: { $in: eventIdValues } },
    { productionEventId: { $in: eventIdValues } },
    { linkedEventId: { $in: eventIdValues } },
  ];

  const uniqueInvitationValues = uniqueValues(invitationValues);

  if (uniqueInvitationValues.length) {
    orQuery.push({ venueClientInvitationId: { $in: uniqueInvitationValues } });
    orQuery.push({ invitationId: { $in: uniqueInvitationValues } });
  }

  return events.findOne({
    venueOwnerId: { $in: ownerValues },
    venueAccessStatus: "linked",
    $or: orQuery,
  });
}

export async function canSaveSeating({
  userId,
  eventId,
  invitationId,
  invitation,
  auth,
}: {
  userId: string;
  eventId: string;
  invitationId?: string;
  invitation: any;
  auth?: any;
}) {
  const isAdmin =
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    auth?.impersonatedByAdmin === true;

  if (isAdmin) {
    return true;
  }

  const ownerId = invitation?.ownerId ? String(invitation.ownerId) : "";
  const invitationUserId = invitation?.userId ? String(invitation.userId) : "";
  const producerId = invitation?.producerId ? String(invitation.producerId) : "";

  const isOwner =
    ownerId === userId ||
    invitationUserId === userId ||
    producerId === userId;

  const isProducer =
    Array.isArray(invitation?.producers) &&
    invitation.producers.some((producer: any) => {
      const currentProducerId = String(producer?.userId ?? producer ?? "");
      return currentProducerId === userId;
    });

  if (isOwner || isProducer) {
    return true;
  }

  const linkedVenueEvent = await findLinkedVenueEvent({
    authUserId: userId,
    eventId,
    invitationId,
    invitation,
  });

  return Boolean(linkedVenueEvent);
}
