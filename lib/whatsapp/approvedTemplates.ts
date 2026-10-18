/**
 * Meta-approved WhatsApp template copy used by Invistimo.
 *
 * Preview UI and the 360dialog send payload MUST share this module.
 * Do not invent body text in dashboard components. If the fixed wording
 * needs to change, update the template in Meta first, then update it here.
 */

import { locationNameVariants } from "@/lib/messages/locationText";

export const SAVE_THE_DATE_TEMPLATE_NAME = "save_the_date_image_he";
export const EVENT_INVITATION_TEMPLATE_NAME = "event_invitation_image_he";

/**
 * Approved body of `event_invitation_image_he` (language: he),
 * copied from the Meta template editor Body field.
 *
 * {{1}} event title, {{2}} date DD.MM.YYYY, {{3}} hall display name.
 */
export const EVENT_INVITATION_BODY = [
  "משפחה וחברים יקרים,",
  "שמחים ונרגשים להזמינכם לחגוג איתנו את {{1}}",
  "בתאריך: {{2}}",
  "📍 במיקום: {{3}}",
  "נשמח לראותכם איתנו, לשמוח, לרקוד וליהנות",
  "ערב מיוחד ביחד!",
].join("\n");

export type EventInvitationVariables = {
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
};

export type SaveTheDateVariables = {
  saveTheDateTitle: string;
  eventDate: string;
};

function cleanString(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hall name for Meta {{3}} — Hebrew side of a bilingual name, no street. */
export function formatWhatsappLocationVariable(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return "";

  const variants = locationNameVariants(raw);
  const hebrewSides = variants.filter(
    (variant) => /[\u0590-\u05FF]/.test(variant) && !/[|∣│｜]/.test(variant)
  );
  if (hebrewSides.length === 1) return hebrewSides[0];
  if (hebrewSides.length > 1) {
    return [...hebrewSides].sort((a, b) => b.length - a.length)[0];
  }

  const withoutPipe = variants.find((variant) => !/[|∣│｜]/.test(variant));
  return withoutPipe || variants[0] || raw;
}

/**
 * Date value for Meta {{2}} on pre-RSVP templates.
 * The approved invitation body is `בתאריך: {{2}}` with a date only (no time).
 */
export function formatWhatsappDateVariable(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const dotted = raw.match(/^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
  if (dotted) {
    const [d, m, y] = dotted[1].split(/[./-]/);
    return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = parsed.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  return cleanString(raw);
}

export function resolveEventInvitationVariables(input: {
  invitationTitle?: unknown;
  eventDate?: unknown;
  eventLocation?: unknown;
}): EventInvitationVariables {
  return {
    invitationTitle: cleanString(input.invitationTitle),
    eventDate: formatWhatsappDateVariable(input.eventDate),
    eventLocation: formatWhatsappLocationVariable(input.eventLocation),
  };
}

export function resolveSaveTheDateVariables(input: {
  saveTheDateTitle?: unknown;
  eventDate?: unknown;
}): SaveTheDateVariables {
  return {
    saveTheDateTitle: cleanString(input.saveTheDateTitle),
    eventDate: formatWhatsappDateVariable(input.eventDate),
  };
}

export function renderApprovedTemplateBody(
  body: string,
  values: readonly string[]
): string {
  let text = body;
  values.forEach((value, index) => {
    text = text.replaceAll(`{{${index + 1}}}`, value ?? "");
  });
  return text;
}

export function renderEventInvitationPreview(vars: EventInvitationVariables) {
  return renderApprovedTemplateBody(EVENT_INVITATION_BODY, [
    vars.invitationTitle,
    vars.eventDate,
    vars.eventLocation,
  ]);
}

export function eventInvitationBodyParameters(vars: EventInvitationVariables) {
  return [
    { type: "text" as const, text: vars.invitationTitle },
    { type: "text" as const, text: vars.eventDate },
    { type: "text" as const, text: vars.eventLocation },
  ];
}

export function saveTheDateBodyParameters(vars: SaveTheDateVariables) {
  return [
    { type: "text" as const, text: vars.saveTheDateTitle },
    { type: "text" as const, text: vars.eventDate },
  ];
}
