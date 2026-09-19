import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { isValidCheckInTokenShape } from "@/lib/checkIn/token";
import {
  checkedInGuestCount,
  confirmedGuestCount,
} from "@/lib/checkIn/status";
import {
  formatTableLabel,
  giftUrlIfConfigured,
  guestPassView,
  type GuestPassPayload,
} from "@/lib/checkIn/guestPassState";

export type { GuestPassPayload };
import {
  getGuestInvitationUrl,
  getInvitationRsvpSiteMode,
} from "@/lib/guestInviteUrl";

export async function loadGuestPassByToken(
  rawToken: unknown
): Promise<GuestPassPayload | null> {
  const token = decodeURIComponent(String(rawToken || "")).trim();
  if (!isValidCheckInTokenShape(token)) return null;

  const guest = await InvitationGuest.findOne({ checkInToken: token })
    .select(
      "name tableName tableNumber invitationId token arrivedCount actualArrivedCount rsvp guestsCount"
    )
    .lean();
  if (!guest) return null;

  const invitation = await Invitation.findById((guest as any).invitationId)
    .select(
      "title shareId eventId invitationSettings rsvpSiteMode coupleNames"
    )
    .lean();
  if (!invitation) return null;

  const eventId = invitation.eventId ? String(invitation.eventId) : "";
  const event = eventId
    ? await Event.findById(eventId)
        .select("checkInEnabled title giftCreditUrl coupleNames")
        .lean()
    : null;

  if (!event?.checkInEnabled) return null;

  const confirmed = confirmedGuestCount(guest);
  const checkedIn = checkedInGuestCount(guest);
  const view = guestPassView({
    checkedInCount: checkedIn,
    confirmedCount: confirmed,
  });

  const eventTitle =
    String((invitation as any).title || (event as any)?.title || "האירוע").trim() ||
    "האירוע";
  const coupleNames =
    String(
      (invitation as any).coupleNames ||
        (event as any)?.coupleNames ||
        eventTitle
    ).trim() || eventTitle;

  const detailsUrl = getGuestInvitationUrl({
    shareId: String((invitation as any).shareId || ""),
    token: String((guest as any).token || ""),
    rsvpSiteMode: getInvitationRsvpSiteMode(invitation),
  });

  return {
    token,
    guestName: String((guest as any).name || "").trim() || "אורחים יקרים",
    eventTitle,
    coupleNames,
    tableLabel: formatTableLabel(guest as any),
    confirmedGuestCount: confirmed,
    checkedInGuestCount: checkedIn,
    remaining: view.remaining,
    fullyArrived: view.fullyArrived,
    giftCreditUrl: giftUrlIfConfigured((event as any)?.giftCreditUrl),
    detailsUrl,
    qrSrc: `/api/check-in/qr?t=${encodeURIComponent(token)}`,
  };
}
