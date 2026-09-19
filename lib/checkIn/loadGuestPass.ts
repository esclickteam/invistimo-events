import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import {
  generateCheckInToken,
  isValidCheckInTokenShape,
} from "@/lib/checkIn/token";
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
import { buildEventDetailsAfterQrUrl } from "@/lib/messages/reminderNavigationLink";

export type { GuestPassPayload };

const GUEST_PASS_SELECT =
  "name tableName tableNumber invitationId token checkInToken arrivedCount actualArrivedCount rsvp guestsCount";

const missingTokenMatch = {
  $or: [
    { checkInToken: null },
    { checkInToken: { $exists: false } },
    { checkInToken: "" },
  ],
};

function toPassPayload({
  checkInToken,
  guest,
  invitation,
  event,
}: {
  checkInToken: string;
  guest: any;
  invitation: any;
  event: any;
}): GuestPassPayload {
  const confirmed = confirmedGuestCount(guest);
  const checkedIn = checkedInGuestCount(guest);
  const view = guestPassView({
    checkedInCount: checkedIn,
    confirmedCount: confirmed,
  });

  const eventTitle =
    String(invitation?.title || event?.title || "האירוע").trim() || "האירוע";
  const coupleNames =
    String(invitation?.coupleNames || event?.coupleNames || eventTitle).trim() ||
    eventTitle;

  return {
    token: checkInToken,
    guestName: String(guest?.name || "").trim() || "אורחים יקרים",
    eventTitle,
    coupleNames,
    tableLabel: formatTableLabel(guest),
    confirmedGuestCount: confirmed,
    checkedInGuestCount: checkedIn,
    remaining: view.remaining,
    fullyArrived: view.fullyArrived,
    giftCreditUrl: giftUrlIfConfigured(event?.giftCreditUrl),
    detailsUrl: buildEventDetailsAfterQrUrl({
      shareId: invitation?.shareId,
      guestToken: guest?.token,
    }),
    qrSrc: `/api/check-in/qr?t=${encodeURIComponent(checkInToken)}`,
  };
}

async function ensureGuestCheckInToken(guest: {
  _id?: unknown;
  checkInToken?: unknown;
}): Promise<string> {
  const existing = String(guest?.checkInToken || "").trim();
  if (isValidCheckInTokenShape(existing)) return existing;

  const next = generateCheckInToken();
  if (!guest?._id) return next;

  await InvitationGuest.updateOne(
    { _id: guest._id, ...missingTokenMatch },
    { $set: { checkInToken: next } }
  );
  const refreshed = await InvitationGuest.findById(guest._id)
    .select("checkInToken")
    .lean();
  const persisted = String((refreshed as any)?.checkInToken || "").trim();
  return isValidCheckInTokenShape(persisted) ? persisted : next;
}

export async function loadGuestPassByToken(
  rawToken: unknown
): Promise<GuestPassPayload | null> {
  const token = decodeURIComponent(String(rawToken || "")).trim();
  if (!isValidCheckInTokenShape(token)) return null;

  const guest = await InvitationGuest.findOne({ checkInToken: token })
    .select(GUEST_PASS_SELECT)
    .lean();
  if (!guest) return null;

  const invitation = await Invitation.findById((guest as any).invitationId)
    .select("title shareId eventId coupleNames")
    .lean();
  if (!invitation) return null;

  const eventId = invitation.eventId ? String(invitation.eventId) : "";
  const event = eventId
    ? await Event.findById(eventId)
        .select("checkInEnabled title giftCreditUrl coupleNames")
        .lean()
    : null;

  if (!event?.checkInEnabled) return null;

  return toPassPayload({
    checkInToken: token,
    guest,
    invitation,
    event,
  });
}

/** Regular /e/[shareId]?token= guest link → personal QR when Check-in is on. */
export async function loadGuestPassForEventDetailsLink({
  shareId,
  guestToken,
}: {
  shareId: unknown;
  guestToken: unknown;
}): Promise<GuestPassPayload | null> {
  const share = String(shareId || "").trim();
  const token = decodeURIComponent(String(guestToken || "")).trim();
  if (!share || !token) return null;

  const invitation = await Invitation.findOne({ shareId: share })
    .select("title shareId eventId coupleNames")
    .lean();
  if (!invitation) return null;

  const eventId = invitation.eventId ? String(invitation.eventId) : "";
  const event = eventId
    ? await Event.findById(eventId)
        .select("checkInEnabled title giftCreditUrl coupleNames")
        .lean()
    : null;

  if (!event?.checkInEnabled) return null;

  const guest = await InvitationGuest.findOne({
    invitationId: invitation._id,
    token,
  })
    .select(GUEST_PASS_SELECT)
    .lean();
  if (!guest) return null;

  const checkInToken = await ensureGuestCheckInToken(guest);
  return toPassPayload({
    checkInToken,
    guest,
    invitation,
    event,
  });
}
