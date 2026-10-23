/**
 * Temporary kill switch for customer notifications only.
 *
 * Off by default. Nothing is deleted: in-app rows, preferences, and push
 * subscriptions stay in place. Admin notifications, guest SMS, and other
 * business sends do not read this flag.
 *
 * Turn customer notifications back on by setting either:
 *   CUSTOMER_NOTIFICATIONS_ENABLED=true          (server, workers, crons)
 *   NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED=true  (customer dashboard UI)
 * Both should be set together. The website UI is compiled with the public
 * variable. The mobile app uses EXPO_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED
 * with the same default-off behavior.
 */
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function explicitEnabled(raw: string | undefined): boolean | null {
  if (raw === undefined || String(raw).trim() === "") return null;
  return ENABLED_VALUES.has(String(raw).trim().toLowerCase());
}

export function customerNotificationsEnabled() {
  // Static process.env reads so Next can inline the public flag in the browser.
  const server = explicitEnabled(process.env.CUSTOMER_NOTIFICATIONS_ENABLED);
  if (server !== null) return server;
  const website = explicitEnabled(process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED);
  if (website !== null) return website;
  return false;
}
