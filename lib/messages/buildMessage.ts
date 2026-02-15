type BuildMessageParams = {
  template: string;
  guest: any;
  eventDate?: string;
  eventLocation?: string;
  includeGiftLink?: boolean;
  giftLink?: string;
};

export function buildMessage({
  template,
  guest,
  eventDate = "",
  eventLocation = "",
  includeGiftLink,
  giftLink,
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
    .replace(/{{eventLocation}}/g, eventLocation);

  if (includeGiftLink && giftLink) {
    text += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
  }

  return text.trim();
}
