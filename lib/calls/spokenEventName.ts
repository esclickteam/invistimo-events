/**
 * Guest-facing event name used inside IVR narration.
 * Pure helper: safe to import from client screens. Audio hashing and ffmpeg
 * stay in the server module.
 */

import {
  eventTypeHeadline,
  isPlaceholderEventTitle,
  pickGuestFacingEventType,
  pickGuestFacingTitle,
} from "@/lib/eventDetails/centralEventDetails";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

/**
 * A real "שם האירוע" wins. If it is empty, the headline is built from the
 * event type and hosts already saved on the event (for example
 * "החתונה של דניאל ונועה").
 */
export function resolveSpokenIvrEventName(input: {
  invitation?: any;
  event?: any;
}): string {
  const title = pickGuestFacingTitle(input.event, input.invitation);
  if (title) return title;

  const hosts =
    clean(input.invitation?.hostsNames) || clean(input.event?.hostsNames);
  const eventType = pickGuestFacingEventType(input.event, input.invitation);
  const headline = clean(eventTypeHeadline(eventType, hosts, ""));
  if (headline && !isPlaceholderEventTitle(headline)) return headline;
  return "האירוע";
}
