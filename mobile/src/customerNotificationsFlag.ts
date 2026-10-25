/**
 * Same temporary customer-notification switch as
 * lib/customerNotifications/featureFlag.ts. Off unless
 * EXPO_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED is explicitly true.
 * Admin notifications are not sent through this app path.
 */
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export function customerNotificationsEnabled() {
  const raw = process.env.EXPO_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  if (raw === undefined || String(raw).trim() === "") return false;
  return ENABLED_VALUES.has(String(raw).trim().toLowerCase());
}
