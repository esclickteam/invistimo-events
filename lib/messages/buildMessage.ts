/* ================= TYPES ================= */

export type BuildMessageParams = {
  template: string;

  guest: {
    name?: string;
    tableName?: string;
    tableNumber?: number;
  };

  // Event
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;

  // Links
  rsvpLink?: string;
  navigationLink?: string;

  // Optional
  includeGiftLink?: boolean;
  giftLink?: string;
};

/* ================= FUNCTION ================= */

export function buildMessage({
  template,
  guest,

  eventTitle = "",
  eventDate = "",
  eventLocation = "",

  rsvpLink = "",
  navigationLink = "",

  includeGiftLink = false,
  giftLink = "",
}: BuildMessageParams) {
  const tableName =
    guest.tableName ||
    (typeof guest.tableNumber === "number"
      ? `שולחן ${guest.tableNumber}`
      : "");

  let text = template
    .replace(/{{name}}/g, guest.name || "")
    .replace(/{{tableName}}/g, tableName)
    .replace(/{{eventTitle}}/g, eventTitle)
    .replace(/{{eventDate}}/g, eventDate)
    .replace(/{{eventLocation}}/g, eventLocation)
    .replace(/{{rsvpLink}}/g, rsvpLink)
    .replace(/{{navigationLink}}/g, navigationLink);

  // 🎁 Gift link append
  if (includeGiftLink && giftLink) {
    text += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
  }

  // 🧹 ניקוי משתנים שלא הוחלפו (אם נשארו {{something}})
  text = text.replace(/{{[^}]+}}/g, "");

  return text.trim();
}
