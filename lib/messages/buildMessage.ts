/* ================= TYPES ================= */

export type BuildMessageParams = {
  template: string;

  guest: {
    name?: string;
    tableName?: string;
    tableNumber?: number;
  };

  // Invitation / Event Title
  invitationTitle?: string; // ✅ חדש – העיקרי
  eventTitle?: string;       // ⚠️ תמיכה לאחור (fallback)

  // Event
  eventDate?: string;
  eventLocation?: string;

  // Links
  rsvpLink?: string;
  navigationLink?: string;

  // 🎁 Gift
  includeGiftLink?: boolean;
  giftLink?: string;
};

/* ================= FUNCTION ================= */

export function buildMessage({
  template,
  guest,

  invitationTitle = "",
  eventTitle = "",

  eventDate = "",
  eventLocation = "",

  rsvpLink = "",
  navigationLink = "",

  includeGiftLink = false,
  giftLink = "",
}: BuildMessageParams) {
  /* ================= TITLE ================= */

  // 🧠 תמיד מעדיפים invitationTitle, ואם אין – נופלים ל-eventTitle
  const titleToUse = invitationTitle || eventTitle;

  /* ================= TABLE NAME ================= */

  const tableName =
    guest.tableName ||
    (typeof guest.tableNumber === "number"
      ? `שולחן ${guest.tableNumber}`
      : "");

  /* ================= BASE REPLACEMENTS ================= */

  let text = template
    .replace(/{{name}}/g, guest.name || "")
    .replace(/{{tableName}}/g, tableName)
    .replace(/{{invitationTitle}}/g, titleToUse) // ✅ חדש
    .replace(/{{eventTitle}}/g, titleToUse)       // ⚠️ ישן – נשמר
    .replace(/{{eventDate}}/g, eventDate)
    .replace(/{{eventLocation}}/g, eventLocation)
    .replace(/{{rsvpLink}}/g, rsvpLink)
    .replace(/{{navigationLink}}/g, navigationLink);

  /* ================= 🎁 GIFT LINK ================= */

  if (includeGiftLink && giftLink.trim()) {
    text += `\n\n🎁 למתנה באשראי:\n${giftLink.trim()}`;
  }

  /* ================= CLEAN UNUSED PLACEHOLDERS ================= */

  text = text.replace(/{{[^}]+}}/g, "");

  /* ================= REMOVE EXTRA EMPTY LINES ================= */

  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => {
      if (line !== "") return true;
      return arr[index - 1] !== "";
    })
    .join("\n");

  return text.trim();
}