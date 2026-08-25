import EventTransportation from "@/models/EventTransportation";
import Invitation from "@/models/Invitation";
import mongoose from "mongoose";

export async function getOrCreateEventTransportation(
  eventId: string,
  invitationId?: string | null
) {
  let doc = await EventTransportation.findOne({ eventId });
  if (doc) return doc;

  let resolvedInvitationId = invitationId || null;
  if (!resolvedInvitationId) {
    const invitation = await Invitation.findOne({ eventId })
      .select("_id")
      .lean();
    resolvedInvitationId = invitation?._id
      ? String(invitation._id)
      : null;
  }

  try {
    doc = await EventTransportation.create({
      eventId,
      invitationId: resolvedInvitationId,
      enabled: true,
      guestRegistrationEnabled: true,
      waitlistEnabled: true,
    });
  } catch (err: any) {
    // Race: unique eventId
    if (err?.code === 11000) {
      doc = await EventTransportation.findOne({ eventId });
      if (doc) return doc;
    }
    throw err;
  }

  return doc;
}

export function serializeDoc(doc: any) {
  if (!doc) return null;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    eventId: obj.eventId ? String(obj.eventId) : null,
    invitationId: obj.invitationId ? String(obj.invitationId) : null,
    routeId: obj.routeId ? String(obj.routeId) : null,
    invitationGuestId: obj.invitationGuestId
      ? String(obj.invitationGuestId)
      : null,
    outboundRouteId: obj.outboundRouteId ? String(obj.outboundRouteId) : null,
    outboundStopId: obj.outboundStopId ? String(obj.outboundStopId) : null,
    returnRouteId: obj.returnRouteId ? String(obj.returnRouteId) : null,
    returnStopId: obj.returnStopId ? String(obj.returnStopId) : null,
  };
}

export function isValidObjectId(id: unknown) {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}
