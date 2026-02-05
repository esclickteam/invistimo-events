import { shortenUrl } from "@/lib/shortenUrl";

type BuildSmsParams = {
  messageTemplate: string;

  guest: {
    name?: string;
    token: string;

    // ⚠️ אין שימוש ב־tableId
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
  /* ================= TABLE =================
     🔒 מקור אמת יחיד:
     1. guest.tableName (אם קיים)
     2. guest.tableNumber
     ❌ אין חישוב מחדש
     ❌ אין displayName
     ❌ אין DB
  ========================================= */

  let tableName = "";

  if (typeof guest.tableName === "string" && guest.tableName.trim()) {
    tableName = guest.tableName.trim();
  } else if (typeof guest.tableNumber === "number") {
    tableName = `שולחן ${guest.tableNumber}`;
  }

  /* ================= NAVIGATION ================= */

  const location = invitation.eventLocation ?? event?.location;
  let navigationLink = "";

  if (location?.lat && location?.lng) {
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
