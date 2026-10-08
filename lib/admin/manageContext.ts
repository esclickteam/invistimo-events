import type { AuthPayload } from "@/lib/getUserIdFromRequest";

export const ADMIN_MANAGE_COOKIE = "adminManageUserId";
export const ADMIN_MANAGE_NAME_COOKIE = "adminManageUserName";

export type AdminManageContext = {
  isAdminManaging: boolean;
  adminUserId: string | null;
  managedUserId: string | null;
};

export function getAdminManageFromAuth(
  auth: (AuthPayload & { adminManagingUserId?: string | null }) | null
): AdminManageContext {
  const managedUserId = auth?.adminManagingUserId
    ? String(auth.adminManagingUserId)
    : null;
  const isAdmin =
    auth?.role === "admin" &&
    !auth?.impersonated &&
    !auth?.impersonatedByAdmin;

  return {
    isAdminManaging: Boolean(isAdmin && managedUserId),
    adminUserId: isAdmin && auth?.userId ? String(auth.userId) : null,
    managedUserId: isAdmin ? managedUserId : null,
  };
}

/**
 * Owner id for data scoping: managed user when admin is managing, else auth user.
 * Never grants manage context to non-admins.
 */
export function resolveDataOwnerUserId(
  auth: (AuthPayload & { adminManagingUserId?: string | null }) | null
): string | null {
  if (!auth?.userId) return null;
  const manage = getAdminManageFromAuth(auth);
  if (manage.isAdminManaging && manage.managedUserId) {
    return manage.managedUserId;
  }
  return String(auth.userId);
}
