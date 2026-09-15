import { canManageInvitation } from "@/lib/canManageInvitation";
import {
  buildActiveInvitationMatch,
  findPrimaryInvitationId,
  findPrimaryInvitationLean,
} from "@/lib/pickPrimaryInvitation";
import Invitation from "@/models/Invitation";

/**
 * Resolves the invitation a logged-in user should manage when no
 * explicit invitationId is provided. Always prefers invitations that
 * actually have guests over empty shells.
 */
export async function findManagedPrimaryInvitation(
  auth: any,
  invitationId?: string | null
): Promise<any | null> {
  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (invitation && canManageInvitation(auth, invitation)) {
      return invitation;
    }
  }

  if (!auth?.userId) return null;

  const invitation = await findPrimaryInvitationLean(
    buildActiveInvitationMatch({
      $or: [{ ownerId: auth.userId }, { userId: auth.userId }],
    })
  );

  if (invitation && canManageInvitation(auth, invitation)) {
    return invitation;
  }

  // Fallback without active filters (legacy docs) — still guest-ranked.
  const fallbackId = await findPrimaryInvitationId({
    $or: [{ ownerId: auth.userId }, { userId: auth.userId }],
  });
  if (!fallbackId) return null;

  const fallback = await Invitation.findById(fallbackId).lean();
  if (fallback && canManageInvitation(auth, fallback)) {
    return fallback;
  }

  return null;
}
