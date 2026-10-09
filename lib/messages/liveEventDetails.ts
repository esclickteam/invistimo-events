/**
 * Live event details for unsent messages.
 *
 * Scheduled WhatsApp jobs historically stored a snapshot (payload.eventDate,
 * payload.eventLocation, payload.components, templateVariables) at schedule
 * time. SMS schedules sometimes baked {{invitationTitle}} into messageContent.
 *
 * Every unsent send path must overlay these values from the invitation/event
 * as they exist at send time — never from the snapshot.
 */

import {
  pickGuestFacingDate,
  pickGuestFacingTime,
  pickGuestFacingTitle,
} from "@/lib/eventDetails/centralEventDetails";

export const MESSAGE_ROUNDS = [
  { key: "save_the_date", channel: "whatsapp", label: "Save the Date" },
  { key: "invitation_only", channel: "whatsapp", label: "הזמנה מוקדמת" },
  { key: "rsvp_1", type: "rsvp", round: 1, channels: ["whatsapp", "sms"], label: "RSVP סבב 1" },
  { key: "rsvp_2", type: "rsvp", round: 2, channels: ["whatsapp", "sms"], label: "RSVP סבב 2" },
  { key: "rsvp_3", type: "rsvp", round: 3, channels: ["whatsapp", "sms"], label: "RSVP סבב 3" },
  { key: "reminder", type: "reminder", channels: ["whatsapp", "sms"], label: "תזכורת / מספר שולחן" },
  { key: "thankyou", type: "thankyou", channels: ["whatsapp", "sms"], label: "הודעת תודה" },
  { key: "wedding_challenges_sms", channel: "sms", label: "Wedding Challenges SMS" },
] as const;

export type LiveEventMessageDetails = {
  eventTitle: string;
  invitationTitle: string;
  eventDate: string;
  eventTime: string;
  eventDateTime: string;
  eventLocation: string;
  venueName: string;
  venueAddress: string;
  headerImageUrl: string;
  shareId: string;
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export function cleanEventAddress(address?: string) {
  if (!address) return "";

  return address
    .replace(/,?\s*ישראל/gi, "")
    .replace(/\b\d{5,7}\b/g, "")
    .replace(/,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,$/, "");
}

function parseEventDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const asDate = new Date(String(value));
  return Number.isNaN(asDate.getTime()) ? null : asDate;
}

export function formatEventDate(dateValue?: unknown): string {
  const date = parseEventDate(dateValue);
  if (!date) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatEventDateTime(
  dateValue?: unknown,
  timeValue?: unknown
): string {
  const formattedDate = formatEventDate(dateValue);
  if (!formattedDate) return "";

  const time = cleanString(timeValue);
  return time ? `${formattedDate} ${time}` : formattedDate;
}

function pickLocation(source: any) {
  const loc = source?.location;
  if (!loc) return { name: "", address: "" };
  if (typeof loc === "string") {
    return { name: "", address: loc };
  }
  return {
    name: cleanString(loc.name || loc.placeName || source?.venueHallName),
    address: cleanString(
      loc.address || loc.formattedAddress || source?.address || source?.eventLocation
    ),
  };
}

function pickTitle(invitation: any, event: any) {
  return pickGuestFacingTitle(event, invitation) || "האירוע שלנו";
}

function pickDate(invitation: any, event: any) {
  return pickGuestFacingDate(event, invitation) || null;
}

function pickTime(invitation: any, event: any) {
  return pickGuestFacingTime(event, invitation);
}

export function buildEventLocationLabel(invitation?: any, event?: any) {
  const fromInvitation = pickLocation(invitation);
  const fromEvent = pickLocation(event);
  const venueName =
    fromInvitation.name ||
    cleanString(invitation?.venueHallName) ||
    fromEvent.name ||
    cleanString(event?.venueHallName);
  const venueAddress = cleanEventAddress(
    fromInvitation.address || fromEvent.address
  );

  if (venueName && venueAddress) {
    if (venueAddress.includes(venueName)) return venueAddress;
    return `${venueName}, ${venueAddress}`;
  }

  return venueAddress || venueName;
}

export function resolveLiveEventMessageDetails(
  invitation?: any,
  event?: any
): LiveEventMessageDetails {
  const eventTitle = pickTitle(invitation, event);
  const eventDate = formatEventDate(pickDate(invitation, event));
  const eventTime = pickTime(invitation, event);
  const eventDateTime = formatEventDateTime(
    pickDate(invitation, event),
    eventTime
  );
  const fromInvitation = pickLocation(invitation);
  const fromEvent = pickLocation(event);
  const venueName =
    fromInvitation.name ||
    cleanString(invitation?.venueHallName) ||
    fromEvent.name ||
    cleanString(event?.venueHallName);
  const venueAddress = cleanEventAddress(
    fromInvitation.address || fromEvent.address
  );
  const eventLocation = buildEventLocationLabel(invitation, event);

  const headerImageUrl = cleanString(
    invitation?.headerImageUrl ||
      invitation?.previewImageUrl ||
      invitation?.imageUrl ||
      invitation?.canvasImageUrl ||
      event?.headerImageUrl
  );

  return {
    eventTitle,
    invitationTitle: eventTitle,
    eventDate,
    eventTime,
    eventDateTime,
    eventLocation,
    venueName,
    venueAddress,
    headerImageUrl,
    shareId: cleanString(invitation?.shareId),
  };
}

export function liveEventPlaceholderValues(live: LiveEventMessageDetails) {
  return {
    invitationTitle: live.invitationTitle,
    eventTitle: live.eventTitle,
    eventDate: live.eventDateTime || live.eventDate,
    eventTime: live.eventTime,
    eventLocation: live.eventLocation,
    venueName: live.venueName,
    venueAddress: live.venueAddress,
  };
}

export function applyLiveEventPlaceholders(
  template: string,
  live: LiveEventMessageDetails,
  extra: Record<string, string> = {}
) {
  const values = { ...liveEventPlaceholderValues(live), ...extra };
  let text = String(template || "");
  for (const [key, value] of Object.entries(values)) {
    text = text.replace(new RegExp(`{{${key}}}`, "g"), value ?? "");
  }
  return text;
}

function replaceIfPresent(text: string, previous: string, next: string) {
  const from = cleanString(previous);
  const to = cleanString(next);
  if (!from || from === to) return text;
  return text.split(from).join(to);
}

export function rewriteBakedEventDetails(
  text: string,
  previous: LiveEventMessageDetails | null | undefined,
  live: LiveEventMessageDetails
) {
  if (!previous) return text;
  let next = String(text || "");
  next = replaceIfPresent(next, previous.eventDateTime, live.eventDateTime);
  next = replaceIfPresent(next, previous.eventDate, live.eventDate);
  next = replaceIfPresent(next, previous.eventLocation, live.eventLocation);
  next = replaceIfPresent(next, previous.venueAddress, live.venueAddress);
  next = replaceIfPresent(next, previous.venueName, live.venueName);
  next = replaceIfPresent(next, previous.eventTitle, live.eventTitle);
  next = replaceIfPresent(next, previous.invitationTitle, live.invitationTitle);
  next = replaceIfPresent(next, previous.eventTime, live.eventTime);
  return next;
}

function rewriteComponents(
  components: any,
  previous: Record<string, string>,
  live: LiveEventMessageDetails
): any {
  if (!Array.isArray(components)) return components;
  const mapped = JSON.parse(JSON.stringify(components));
  const replacements = [
    [previous.eventDateTime, live.eventDateTime],
    [previous.eventDate, live.eventDate],
    [previous.eventLocation, live.eventLocation],
    [previous.venueAddress, live.venueAddress],
    [previous.venueName, live.venueName],
    [previous.eventTitle, live.eventTitle],
    [previous.invitationTitle, live.invitationTitle],
    [previous.saveTheDateTitle, live.eventTitle],
  ]
    .filter(([from, to]) => from && to && from !== to)
    .sort((a, b) => String(b[0]).length - String(a[0]).length);

  const walk = (value: any): any => {
    if (typeof value === "string") {
      let next = value;
      for (const [from, to] of replacements) {
        next = next.split(String(from)).join(String(to));
      }
      return next;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v);
      return out;
    }
    return value;
  };
  return walk(mapped);
}

/**
 * Overlay live invitation/event fields onto a stored WhatsApp payload.
 * Guest-specific fields (name, tableName, rsvpLink, urlSuffix) are kept.
 */
export function overlayLiveEventDetailsOnWhatsappPayload(
  payload: Record<string, any> | null | undefined,
  live: LiveEventMessageDetails
): Record<string, any> {
  const current = payload && typeof payload === "object" ? { ...payload } : {};
  const prevTitle = cleanString(
    current.eventTitle || current.templateVariables?.invitationTitle
  );
  const prevSaveTheDate = cleanString(
    current.templateVariables?.saveTheDateTitle
  );
  const previous = {
    eventTitle: prevTitle,
    invitationTitle: cleanString(current.templateVariables?.invitationTitle || prevTitle),
    eventDateTime: cleanString(current.eventDate),
    eventDate: cleanString(current.templateVariables?.eventDate || current.eventDate),
    eventLocation: cleanString(
      current.eventLocation || current.templateVariables?.eventLocation
    ),
    venueAddress: "",
    venueName: "",
    saveTheDateTitle: prevSaveTheDate,
  };

  current.eventTitle = live.eventTitle;
  current.eventDate = live.eventDateTime || live.eventDate;
  current.eventLocation = live.eventLocation;
  if (live.headerImageUrl) {
    current.headerImageUrl = live.headerImageUrl;
    if (current.imageUrl) current.imageUrl = live.headerImageUrl;
  }

  const templateVariables = {
    ...(current.templateVariables || {}),
  };
  templateVariables.invitationTitle = live.eventTitle;
  templateVariables.eventDate = live.eventDateTime || live.eventDate;
  templateVariables.eventLocation = live.eventLocation;
  if (
    !prevSaveTheDate ||
    prevSaveTheDate === prevTitle ||
    prevSaveTheDate === cleanString(current.templateVariables?.invitationTitle)
  ) {
    templateVariables.saveTheDateTitle = live.eventTitle;
  }
  current.templateVariables = templateVariables;

  if (Array.isArray(current.components)) {
    current.components = rewriteComponents(current.components, previous, live);
  }

  return current;
}

export function pickSmsTemplateWithPlaceholders(schedule: {
  messageOverride?: unknown;
  messageContent?: unknown;
  text?: unknown;
  type?: unknown;
  templateKey?: unknown;
  round?: unknown;
  roundNumber?: unknown;
}) {
  const override = cleanString(schedule.messageOverride);
  const content = cleanString(schedule.messageContent || schedule.text);
  if (
    override &&
    override !== "__AUTO_REMINDER_BY_TABLE__" &&
    !override.startsWith("whatsapp:") &&
    override.includes("{{")
  ) {
    return override;
  }
  if (content.includes("{{")) return content;
  return override || content;
}
