import { shortenUrl } from "@/lib/shortenUrl";
import { getGuestInvitationUrl, getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { getWazeLink } from "@/lib/navigationLinks";
import { resolveAndPersistEventLocation } from "@/lib/persistEventMapPin";
import { buildReminderNavigationUrl } from "@/lib/messages/reminderNavigationLink";

type BuildSmsParams = {
  messageTemplate: string;

  guest: {
    name?: string;
    token: string;
    checkInToken?: string | null;

    // ⚠️ אין שימוש ב־tableId
    tableName?: string;
    tableNumber?: number;
  };

  invitation: {
    shareId: string;
    invitationSettings?: { rsvpSiteMode?: unknown };
    rsvpSiteMode?: unknown;
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
    checkInEnabled?: boolean;
  };

  includeGiftLink?: boolean;
  giftLink?: string;
  origin?: string;
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

  let navigationLink = "";

  if (event?.checkInEnabled && invitation.shareId && guest.token) {
    navigationLink = await shortenUrl(
      buildReminderNavigationUrl({
        shareId: invitation.shareId,
        guestToken: guest.token,
        checkInEnabled: true,
      })
    );
  } else {
    const location = await resolveAndPersistEventLocation(invitation, event);
    const wazeUrl = getWazeLink(location);
    if (wazeUrl) {
      navigationLink = await shortenUrl(wazeUrl);
    }
  }

  /* ================= RSVP ================= */

  const personalRsvpUrl = getGuestInvitationUrl({
    shareId: invitation.shareId,
    token: guest.token,
    rsvpSiteMode: getInvitationRsvpSiteMode(invitation),
  });

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
