import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { canManageInvitation } from "@/lib/canManageInvitation";
import {
  buildActiveInvitationMatch,
  findPrimaryInvitationLean,
} from "@/lib/pickPrimaryInvitation";

/**
 * Invitation access for check-in staff (owners + assigned staff + producers).
 */
export async function findCheckInInvitation(
  auth: any,
  invitationId?: string | null
): Promise<any | null> {
  if (!auth?.userId) return null;

  const userId = String(auth.userId);

  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (!invitation) return null;
    if (canManageInvitation(auth, invitation)) return invitation;
    if (await isAssignedToInvitationEvent(auth, invitation)) return invitation;
    return null;
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
