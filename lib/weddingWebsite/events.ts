export type WeddingInternalEventName =
  | "wedding_guest_message_received"
  | "wedding_site_opened"
  | "wedding_site_rsvp_started"
  | "wedding_site_rsvp_completed"
  | "wedding_site_transport_requested";

export type WeddingInternalEvent = {
  name: WeddingInternalEventName;
  invitationId?: string;
  eventId?: string;
  guestId?: string;
  shareId?: string;
  [key: string]: unknown;
};

/**
 * Hook פנימי לאוטומציות/התראות עתידיות.
 * לא מחליף RSVP/status של האורח — רק אירוע מערכת נוסף.
 */
export function emitWeddingInternalEvent(event: WeddingInternalEvent) {
  try {
    console.info("[invistimo-event]", event.name, {
      invitationId: event.invitationId || null,
      eventId: event.eventId || null,
      guestId: event.guestId || null,
      shareId: event.shareId || null,
    });
  } catch {
    // analytics must never break guest actions
  }
}
