/**
 * Future transportation notification hooks.
 *
 * IMPORTANT: Do NOT send real SMS/email/WhatsApp from these helpers yet.
 * Staging external sends remain disabled / allowlisted.
 * Wire into the existing messaging infrastructure only after product approval.
 */

export type TransportNotificationKind =
  | "passenger_reminder"
  | "time_changed"
  | "pickup_changed"
  | "route_full"
  | "return_reminder";

export type TransportNotificationPayload = {
  kind: TransportNotificationKind;
  eventId: string;
  registrationId?: string;
  routeId?: string;
  stopId?: string;
  message?: string;
};

/**
 * Queues a transportation notification for future delivery.
 * Currently a no-op that only logs in non-production for observability.
 */
export async function queueTransportNotification(
  payload: TransportNotificationPayload
): Promise<{ queued: false; reason: "NOT_ENABLED" }> {
  if (process.env.NODE_ENV !== "production") {
    console.info("[transportation/notifications] stub queue", payload.kind, {
      eventId: payload.eventId,
      registrationId: payload.registrationId,
    });
  }

  return { queued: false, reason: "NOT_ENABLED" };
}
