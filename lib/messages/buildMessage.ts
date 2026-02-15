/* ================= TYPES ================= */

export type BuildMessageParams = {
  template: string;

  guest: {
    name?: string;
    tableName?: string;
    tableNumber?: number;
  };

  eventDate?: string;
  eventLocation?: string;
  rsvpLink?: string;
  navigationLink?: string;

  includeGiftLink?: boolean;
  giftLink?: string;
};

/* ================= FUNCTION ================= */

export function buildMessage({
  template,
  guest,
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
    .replace(/{{eventDate}}/g, eventDate)
    .replace(/{{eventLocation}}/g, eventLocation)
    .replace(/{{rsvpLink}}/g, rsvpLink)
    .replace(/{{navigationLink}}/g, navigationLink);

  if (includeGiftLink && giftLink) {
    text += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
  }

  return text.trim();
}
