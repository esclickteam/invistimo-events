import mongoose from "mongoose";

import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { canManageInvitation } from "@/lib/canManageInvitation";
import {
  buildActiveInvitationMatch,
  findPrimaryInvitationLean,
} from "@/lib/pickPrimaryInvitation";

function cleanId(value: unknown) {
  const id = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(id) ? id : "";
}

/**
 * When several invitations exist, scan the event that actually has Check-in on.
 * A primary invitation with more guests must not hide an enabled event.
 */
export function selectCheckInEventId({
  preferredEventId,
  enabledEventIds,
}: {
  preferredEventId?: string | null;
  enabledEventIds: string[];
}): string | null {
  const enabled = enabledEventIds.map((id) => String(id || "").trim()).filter(Boolean);
  if (!enabled.length) return null;
  const preferred = String(preferredEventId || "").trim();
  if (preferred && enabled.includes(preferred)) return preferred;
  return enabled[0];
}

/**
 * Invitation access for check-in staff (owners + assigned staff + producers).
 */
export async function findCheckInInvitation(
  auth: any,
  invitationId?: string | null,
  eventId?: string | null
): Promise<any | null> {
  if (!auth?.userId) return null;

  const userId = String(auth.userId);

  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (invitation) {
      const allowed =
        canManageInvitation(auth, invitation) ||
        (await isAssignedToInvitationEvent(auth, invitation));
      if (allowed && (await invitationCheckInEnabled(invitation))) {
        return invitation;
      }
    }
  }

  const enabled = await findEnabledCheckInInvitation(auth, eventId);
  if (enabled) return enabled;

  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (
      invitation &&
      (canManageInvitation(auth, invitation) ||
        (await isAssignedToInvitationEvent(auth, invitation)))
    ) {
      return invitation;
    }
  }

  const requestedEventId = cleanId(eventId);
  if (requestedEventId) {
    const byEvent = await invitationForAccessibleEvent(auth, requestedEventId);
    if (byEvent) return byEvent;
  }

  // Prefer owned invitation
  const owned = await findPrimaryInvitationLean(
    buildActiveInvitationMatch({
      $or: [{ ownerId: userId }, { userId }],
    })
  );
  if (owned && canManageInvitation(auth, owned)) return owned;

  // Assigned staff: find an event where they are assigned and check-in is on
  const event = await Event.findOne({
    assignedStaffIds: userId,
    checkInEnabled: true,
    status: { $ne: "archived" },
  })
    .sort({ updatedAt: -1 })
    .select("_id")
    .lean();

  if (event?._id) {
    const invitation = await Invitation.findOne({ eventId: event._id })
      .sort({ updatedAt: -1 })
      .lean();
    if (invitation) return invitation;
  }

  // Producer staff / producer
  if (auth.role === "producer" || auth.impersonationRole === "producer") {
    const producerEvent = await Event.findOne({
      producerId: userId,
      checkInEnabled: true,
    })
      .sort({ updatedAt: -1 })
      .select("_id")
      .lean();
    if (producerEvent?._id) {
      return Invitation.findOne({ eventId: producerEvent._id })
        .sort({ updatedAt: -1 })
        .lean();
    }
  }

  return null;
}

async function invitationCheckInEnabled(invitation: any) {
  const eventId = cleanId(invitation?.eventId);
  if (!eventId) return false;
  const event = await Event.findById(eventId).select("checkInEnabled").lean();
  return Boolean((event as any)?.checkInEnabled);
}

async function invitationForAccessibleEvent(auth: any, eventId: string) {
  const invitation = await Invitation.findOne({ eventId })
    .sort({ updatedAt: -1 })
    .lean();
  if (!invitation) return null;
  if (canManageInvitation(auth, invitation)) return invitation;
  if (await isAssignedToInvitationEvent(auth, invitation)) return invitation;
  return null;
}

async function findEnabledCheckInInvitation(auth: any, preferredEventId?: string | null) {
  const userId = String(auth.userId || "");
  if (!userId) return null;

  const owned = await Invitation.find({
    eventId: { $ne: null },
    $or: [{ ownerId: userId }, { userId }, { producerId: userId }],
  })
    .select("_id eventId")
    .lean();

  const linkedEvents = await Event.find({
    checkInEnabled: true,
    $or: [
      { userId },
      { producerId: userId },
      { assignedStaffIds: userId },
    ],
  })
    .select("_id")
    .sort({ updatedAt: -1 })
    .lean();

  const ownedEventIds = owned
    .map((invitation: any) => cleanId(invitation.eventId))
    .filter(Boolean);
  const enabledOwned = ownedEventIds.length
    ? await Event.find({
        _id: { $in: ownedEventIds },
        checkInEnabled: true,
      })
        .select("_id")
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  const chosenEventId = selectCheckInEventId({
    preferredEventId,
    enabledEventIds: [
      ...enabledOwned.map((event: any) => String(event._id)),
      ...linkedEvents.map((event: any) => String(event._id)),
    ],
  });
  if (!chosenEventId) return null;

  const ownedMatch = owned.find(
    (invitation: any) => String(invitation.eventId) === chosenEventId
  );
  if (ownedMatch?._id) {
    return Invitation.findById(ownedMatch._id).lean();
  }

  return invitationForAccessibleEvent(auth, chosenEventId);
}

async function isAssignedToInvitationEvent(auth: any, invitation: any) {
  const userId = String(auth.userId || "");
  if (!userId) return false;

  if (
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonatedByAdmin === true
  ) {
    return true;
  }

  const eventId = invitation?.eventId ? String(invitation.eventId) : "";
  if (!eventId) return false;

  const event = await Event.findById(eventId)
    .select("userId producerId assignedStaffIds checkInEnabled")
    .lean();

  if (!event) return false;

  if (String((event as any).userId || "") === userId) return true;
  if (String((event as any).producerId || "") === userId) return true;
  if (
    Array.isArray((event as any).assignedStaffIds) &&
    (event as any).assignedStaffIds.some((id: any) => String(id) === userId)
  ) {
    return true;
  }

  return false;
}
