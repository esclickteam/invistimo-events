export type NotificationAccessUser = {
  role?: string | null;
  impersonated?: boolean | null;
  impersonatedByAdmin?: boolean | null;
  impersonationRole?: string | null;
  impersonationSourceRole?: string | null;
  adminManagingUserId?: string | null;
};

function roleOf(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/**
 * The in-app bell belongs to the super-admin interface.
 * The decision uses the session role, including impersonation and
 * "manage account" mode, and does not depend on the page URL.
 * A regular user, a producer, a producer-linked client, staff, a venue
 * user, or an admin who is currently acting as one of those accounts
 * does not see it.
 */
export function canSeeAdminNotificationCenter(
  user?: NotificationAccessUser | null
): boolean {
  if (!user) return false;
  if (roleOf(user.role) !== "admin") return false;
  if (user.impersonated || user.impersonatedByAdmin) return false;
  if (user.adminManagingUserId) return false;
  const actingAs = roleOf(user.impersonationRole);
  if (actingAs && actingAs !== "admin") return false;
  const source = roleOf(user.impersonationSourceRole);
  if (source && source !== "admin") return false;
  return true;
}

/**
 * Failed-message, WhatsApp, SMS, and other customer notices stay stored,
 * but they are not returned to any customer, producer, or mobile account.
 * Super-admin notices are served by the admin notification API.
 */
export function canExposeCustomerNotificationFeed(
  _user?: NotificationAccessUser | null
): boolean {
  return false;
}
