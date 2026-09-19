import mongoose from "mongoose";

import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { generateCheckInToken } from "@/lib/checkIn/token";

const missingTokenMatch = {
  $or: [
    { checkInToken: null },
    { checkInToken: { $exists: false } },
    { checkInToken: "" },
  ],
};

export async function ensureCheckInTokensForInvitation(
  invitationId: unknown
): Promise<number> {
  if (!invitationId) return 0;

  const guests = await InvitationGuest.find({
    invitationId,
    ...missingTokenMatch,
  }).select("_id");

  let created = 0;
  for (const guest of guests) {
    const result = await InvitationGuest.updateOne(
      {
        _id: guest._id,
        ...missingTokenMatch,
      },
      { $set: { checkInToken: generateCheckInToken() } }
    );
    if (result.modifiedCount > 0) created += 1;
  }

  return created;
}

export async function ensureCheckInTokensForEvent(
  eventId: unknown
): Promise<{ invitations: number; tokensCreated: number }> {
  if (!eventId || !mongoose.Types.ObjectId.isValid(String(eventId))) {
    return { invitations: 0, tokensCreated: 0 };
  }

  const invitations = await Invitation.find({ eventId })
    .select("_id")
    .lean();

  let tokensCreated = 0;
  for (const invitation of invitations) {
    tokensCreated += await ensureCheckInTokensForInvitation(invitation._id);
  }

  return { invitations: invitations.length, tokensCreated };
}

export async function checkInTokenIfEventEnabled(
  eventCheckInEnabled: boolean
): Promise<string | undefined> {
  if (!eventCheckInEnabled) return undefined;
  return generateCheckInToken();
}

export async function checkInTokenForInvitation(
  invitation: { eventId?: unknown } | null | undefined
): Promise<string | undefined> {
  const eventId = invitation?.eventId ? String(invitation.eventId) : "";
  if (!eventId) return undefined;
  const event = await Event.findById(eventId).select("checkInEnabled").lean();
  if (!(event as any)?.checkInEnabled) return undefined;
  return generateCheckInToken();
}
