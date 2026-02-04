import { shortenUrl } from "@/lib/shortenUrl";
import SeatingTable from "@/models/SeatingTable";

type BuildSmsParams = {
  messageTemplate: string;

 guest: {
  name?: string;
  token: string;
  tableId?: string;      // ⭐ חדש – לא חובה
  tableName?: string;
  tableNumber?: number;
};

  invitation: {
    shareId: string;
    eventLocation?: {
      lat?: number;
      lng?: number;
    };
  };

  event?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };

  includeGiftLink?: boolean;
  giftLink?: string;
};

export async function buildFinalSmsText({
  messageTemplate,
  guest,
  invitation,
  event,
  includeGiftLink,
  giftLink,
}: BuildSmsParams): Promise<string> {

  
  /* ================= TABLE ================= */
let tableName =
  guest.tableName ||
  (typeof guest.tableNumber === "number"
    ? `שולחן ${guest.tableNumber}`
    : "");

// ⭐ אם יש tableId – נשלוף את השולחן העדכני
if (guest.tableId) {
  const table = await SeatingTable.findById(guest.tableId).lean();

  if (table?.number) {
    tableName = `שולחן ${table.number}`;
  }
}


  /* ================= NAVIGATION ================= */
  const location = invitation.eventLocation ?? event?.location;
  const hasLocation = !!(location?.lat && location?.lng);

  let navigationLink = "";

  if (hasLocation) {
    const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
    navigationLink = await shortenUrl(wazeUrl);
  }

  /* ================= RSVP ================= */
  const personalRsvpUrl =
    `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

  const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

  /* ================= BASE TEMPLATE ================= */
  let finalText = messageTemplate
    .replace(/{{name}}/g, guest.name || "")
    .replace(/{{rsvpLink}}/g, shortRsvpUrl)
    .replace(/{{tableName}}/g, tableName)
    .replace(/{{navigationLink}}/g, navigationLink);

  /* ================= GIFT LINK ================= */
  if (includeGiftLink && giftLink) {
    const shortGiftLink = await shortenUrl(giftLink);
    finalText += `\n\n🎁 למתנה באשראי:\n${shortGiftLink}`;
  }

  return finalText;
}
