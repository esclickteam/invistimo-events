/**
 * Invitation-only (pre-RSVP) helpers.
 *
 * Intentionally separate from RSVP round send paths.
 * Location reuses buildEventLocationLabel / cleanEventAddress from liveEventDetails
 * so invitation copy matches RSVP — without modifying RSVP send logic.
 */

import RoundGuestDelivery from "@/models/RoundGuestDelivery";
import WhatsappQueue from "@/models/WhatsappQueue";
import {
  buildEventLocationLabel,
  cleanEventAddress,
  formatEventDate,
  resolveLiveEventMessageDetails,
} from "@/lib/messages/liveEventDetails";

export type InvitationOnlyAudienceFilter = "all" | "never_invited";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

/** Display date as DD/MM/YYYY (matches invitation preview). */
export function formatInvitationDisplayDate(dateValue?: unknown): string {
  const raw = cleanString(dateValue);
  if (!raw) return "";

  // Already formatted from the UI / a previous pass.
  if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(raw)) {
    return raw.replace(/\./g, "/");
  }

  const dotted = formatEventDate(dateValue);
  if (!dotted) return raw;
  return dotted.replace(/\./g, "/");
}

export function formatInvitationDisplayTime(timeValue?: unknown): string {
  return cleanString(timeValue);
}

/**
 * WhatsApp Meta templates expose a single "date" body variable and strip
 * newlines from text params. Keep date and time as clearly labeled parts
 * so guests never see a bare "תאריך: DD/MM/YYYY HH:mm" blob.
 */
export function formatInvitationWhatsappDateParam(
  dateValue?: unknown,
  timeValue?: unknown
): string {
  const rawDate = cleanString(dateValue);
  if (/🕒|שעה:/.test(rawDate)) return rawDate;

  const date = formatInvitationDisplayDate(dateValue);
  const time = formatInvitationDisplayTime(timeValue);

  if (date && time) {
    return `${date} · 🕒 שעה: ${time}`;
  }

  return date || time;
}

export function formatInvitationPreviewDateBlock(
  dateValue?: unknown,
  timeValue?: unknown
): string {
  const date = formatInvitationDisplayDate(dateValue);
  const time = formatInvitationDisplayTime(timeValue);
  const lines: string[] = [];

  if (date) lines.push(`📅 תאריך: ${date}`);
  if (time) lines.push(`🕒 שעה: ${time}`);

  return lines.join("\n");
}

/** Same location label RSVP live-details uses (includes() guard, strip ישראל). */
export function buildInvitationLocationLabel(invitation?: any, event?: any) {
  return cleanEventAddress(buildEventLocationLabel(invitation, event)) ||
    buildEventLocationLabel(invitation, event);
}

export function resolveInvitationImageUrl(invitation?: any, event?: any) {
  return cleanString(
    invitation?.preRsvpMedia?.invitationOnlyImageUrl ||
      invitation?.headerImageUrl ||
      invitation?.previewImageUrl ||
      invitation?.imageUrl ||
      invitation?.canvasImageUrl ||
      invitation?.previewImage ||
      event?.headerImageUrl ||
      event?.imageUrl ||
      event?.coverImageUrl ||
      ""
  );
}

export function resolveInvitationOnlyMessageDetails(
  invitation?: any,
  event?: any
) {
  const live = resolveLiveEventMessageDetails(invitation, event);
  const eventDateRaw =
    invitation?.eventDate ||
    invitation?.date ||
    event?.date ||
    event?.eventDate ||
    null;
  const eventTime =
    cleanString(invitation?.eventTime) ||
    cleanString(invitation?.time) ||
    cleanString(event?.time) ||
    cleanString(event?.eventTime) ||
    live.eventTime;

  return {
    eventTitle: live.eventTitle,
    invitationTitle: live.invitationTitle,
    eventDate: formatInvitationDisplayDate(eventDateRaw),
    eventTime: formatInvitationDisplayTime(eventTime),
    eventDateWhatsapp: formatInvitationWhatsappDateParam(eventDateRaw, eventTime),
    eventDatePreviewBlock: formatInvitationPreviewDateBlock(
      eventDateRaw,
      eventTime
    ),
    eventLocation: buildInvitationLocationLabel(invitation, event),
    headerImageUrl: resolveInvitationImageUrl(invitation, event) || live.headerImageUrl,
  };
}

/**
 * Guests who already had an invitation-only send attempt from the system
 * (queue insert or delivery tracking). Status alone is not used.
 */
export async function findGuestIdsWithInvitationSendAttempt(
  invitationId: string
): Promise<Set<string>> {
  const id = cleanString(invitationId);
  if (!id) return new Set();

  const [deliveries, queueRows] = await Promise.all([
    RoundGuestDelivery.find({
      invitationId: id,
      type: "invitation_only",
    })
      .select("guestId")
      .lean(),
    WhatsappQueue.find({
      invitationId: id,
      type: "invitation_only",
    })
      .select("guestId")
      .lean(),
  ]);

  const ids = new Set<string>();
  for (const row of deliveries) {
    if (row?.guestId) ids.add(String(row.guestId));
  }
  for (const row of queueRows) {
    if (row?.guestId) ids.add(String(row.guestId));
  }
  return ids;
}

export function filterGuestsByInvitationAudience<T extends { _id?: unknown }>({
  guests,
  filter,
  alreadyInvitedGuestIds,
}: {
  guests: T[];
  filter: InvitationOnlyAudienceFilter;
  alreadyInvitedGuestIds: Set<string>;
}): T[] {
  if (filter !== "never_invited") return guests;

  return guests.filter((guest) => {
    const guestId = String(guest?._id || "");
    if (!guestId) return false;
    return !alreadyInvitedGuestIds.has(guestId);
  });
}

export function parseInvitationOnlyAudienceFilter(
  value: unknown
): InvitationOnlyAudienceFilter {
  return cleanString(value) === "never_invited" ? "never_invited" : "all";
}
