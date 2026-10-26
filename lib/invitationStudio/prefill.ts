import { hebrewDateFromIso } from "@/lib/invitationStudio/hebrewDate";
import type { StudioContent, StudioTemplate } from "@/lib/invitationStudio/types";

const EVENT_LABELS: Record<string, string> = {
  wedding: "חתונה",
  henna: "חינה",
  "bar-mitzvah": "בר מצווה",
  "bat-mitzvah": "בת מצווה",
  brit: "ברית",
  brita: "בריתה",
  birthday: "יום הולדת",
  business: "אירוע עסקי",
  bnai: "בר ובת מצווה",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isoDate(value: unknown) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = clean(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function formatGregorian(iso: string) {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  }).format(date);
}

export function contentFromEvent(
  template: StudioTemplate,
  invitation: any,
  event: any
): StudioContent {
  const content: StudioContent = { ...template.defaultContent };
  const title = clean(invitation?.title);
  if (title && title !== "הזמנה חדשה") content.hostNames = title;

  const eventType = clean(invitation?.eventType || event?.eventType);
  if (eventType) content.eventType = EVENT_LABELS[eventType] || eventType;

  const iso = isoDate(invitation?.eventDate || event?.date);
  if (iso) {
    content.gregorianDate = formatGregorian(iso);
    const hebrew = hebrewDateFromIso(iso);
    if (hebrew) content.hebrewDate = hebrew;
  }

  const time = clean(invitation?.eventTime || event?.time);
  if (time) content.receptionTime = `קבלת פנים ${time}`;

  const venue = clean(
    invitation?.location?.name || event?.location?.name || event?.venue
  );
  if (venue) content.venueName = venue;

  const addressValue = invitation?.location?.address || event?.location?.address || event?.location;
  const address = clean(addressValue);
  if (address) content.venueAddress = address;

  return content;
}
