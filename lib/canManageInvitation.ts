import type { AuthPayload } from "@/lib/getUserIdFromRequest";

function normalizeId(value: unknown): string {
  return value ? String(value) : "";
}

export function canManageInvitation(
  auth: AuthPayload | null,
  invitation: any
): boolean {
  if (!auth?.userId || !invitation) return false;

  const authUserId = normalizeId(auth.userId);
  const ownerId = normalizeId(invitation.ownerId);
  const userId = normalizeId(invitation.userId);
  const producerId = normalizeId(invitation.producerId);

  if (ownerId && ownerId === authUserId) return true;
  if (userId && userId === authUserId) return true;
  if (producerId && producerId === authUserId) return true;

  if (
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    Boolean(auth.impersonatedBy)
  ) {
    return true;
  }

  if (auth.role === "producer" || auth.impersonationRole === "producer") {
    return true;
  }

  return false;
}
