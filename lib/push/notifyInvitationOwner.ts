import Invitation from "@/models/Invitation";
import { notifyNativeUser } from "@/lib/push/sendNativePush";
import type { NativePushType } from "@/lib/push/nativePush";

export function notifyInvitationOwnerNative(
  invitation: { ownerId?: unknown } | null | undefined,
  type: NativePushType
) {
  const ownerId = invitation?.ownerId ? String(invitation.ownerId) : "";
  if (!ownerId) return;
  notifyNativeUser(ownerId, type);
}

export async function notifyInvitationOwnerByIdNative(
  invitationId: string | null | undefined,
  type: NativePushType
) {
  try {
    if (!invitationId) return;
    const invitation = await Invitation.findById(invitationId)
      .select("ownerId")
      .lean();
    notifyInvitationOwnerNative(invitation, type);
  } catch {
    // Native push must never affect guest or website flows.
  }
}
