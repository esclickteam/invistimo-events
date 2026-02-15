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

  // 🎁 Gift
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
    .replace(/{{eventTitle}}/g, eventTitle)
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
      // מסיר שורות ריקות כפולות
      if (line !== "") return true;
      return arr[index - 1] !== "";
    })
    .join("\n");

  return text.trim();
}
