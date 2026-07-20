const GENERIC_EVENT_TITLES = new Set([
  "אירוע חדש",
  "הזמנה חדשה",
  "האירוע שלך",
  "אירוע ללא שם",
  "אירוע שלנו",
  "ניהול אירוע",
]);

function cleanTitle(value: unknown) {
  return String(value || "").trim();
}

function isGenericEventTitle(value: unknown) {
  const title = cleanTitle(value);
  return !title || GENERIC_EVENT_TITLES.has(title);
}

function normalizeEventType(value: unknown) {
  return cleanTitle(value)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function titleFromEventType(eventType: unknown) {
  const normalized = normalizeEventType(eventType);

  if (normalized === "חתונה" || normalized === "wedding") return "החתונה שלנו";
  if (
    normalized === "ברית" ||
    normalized === "brit" ||
    normalized === "ברית מילה" ||
    normalized === "bris"
  ) {
    return "הברית שלנו";
  }
  if (
    normalized === "בר מצווה" ||
    normalized === "bar mitzvah" ||
    normalized === "bar mitzva" ||
    normalized === "bar-mitzvah"
  ) {
    return "בר המצווה שלנו";
  }
  if (
    normalized === "בת מצווה" ||
    normalized === "bat mitzvah" ||
    normalized === "bat mitzva" ||
    normalized === "bat-mitzvah"
  ) {
    return "בת המצווה שלנו";
  }
  if (normalized === "חינה" || normalized === "henna") return "החינה שלנו";

  return "";
}

/**
 * מחזיר את שם האירוע האמיתי לשימוש בהודעות WhatsApp/SMS.
 *
 * בעבר נשמר Event נפרד עם ברירת מחדל "אירוע חדש", בעוד שה-Invitation
 * עודכן לשם הנכון. לכן תמיד מעדיפים את שדות ה-Invitation,
 * ורק אחר כך את ה-Event המקושר.
 */
export function resolveInvitationTitle(
  invitation: any,
  linkedEvent?: any
): string {
  const event =
    linkedEvent ||
    invitation?.event ||
    invitation?.eventId ||
    invitation?.linkedEvent ||
    null;

  const candidates = [
    invitation?.title,
    invitation?.eventTitle,
    invitation?.eventName,
    invitation?.invitationTitle,
    event?.title,
    event?.eventTitle,
    event?.eventName,
  ]
    .map(cleanTitle)
    .filter(Boolean);

  for (const title of candidates) {
    if (!isGenericEventTitle(title)) {
      return title;
    }
  }

  const typeBasedTitle = titleFromEventType(
    invitation?.eventType || event?.eventType || event?.type
  );

  if (typeBasedTitle) {
    return typeBasedTitle;
  }

  return candidates[0] || "האירוע שלנו";
}

export { isGenericEventTitle };
