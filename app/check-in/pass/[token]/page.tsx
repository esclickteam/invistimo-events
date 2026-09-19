import { notFound } from "next/navigation";
import Link from "next/link";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { isValidCheckInTokenShape } from "@/lib/checkIn/token";
import { getGuestInvitationUrl, getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { resolveEventLocation } from "@/lib/navigationLinks";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CheckInPassPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(String(raw || "")).trim();
  if (!isValidCheckInTokenShape(token)) notFound();

  await dbConnect();

  const guest = await InvitationGuest.findOne({ checkInToken: token })
    .select("name tableName tableNumber invitationId token")
    .lean();
  if (!guest) notFound();

  const invitation = await Invitation.findById((guest as any).invitationId)
    .select(
      "title shareId eventId eventDate eventTime location invitationSettings rsvpSiteMode"
    )
    .lean();
  if (!invitation) notFound();

  const eventId = invitation.eventId ? String(invitation.eventId) : "";
  let event: any = null;
  if (eventId) {
    event = await Event.findById(eventId)
      .select("checkInEnabled title date time location")
      .lean();
  }

  if (!event?.checkInEnabled) notFound();

  const location = resolveEventLocation(invitation, event);
  const eventTitle =
    String(invitation.title || event?.title || "האירוע").trim() || "האירוע";
  const date =
    invitation.eventDate ||
    event?.date ||
    "";
  const time =
    invitation.eventTime ||
    event?.time ||
    "";
  const table =
    String((guest as any).tableName || "").trim() ||
    (typeof (guest as any).tableNumber === "number"
      ? `שולחן ${(guest as any).tableNumber}`
      : "");

  const detailsUrl = getGuestInvitationUrl({
    shareId: String(invitation.shareId),
    token: String((guest as any).token || ""),
    rsvpSiteMode: getInvitationRsvpSiteMode(invitation),
  });

  const qrSrc = `/api/check-in/qr?t=${encodeURIComponent(token)}`;

  return (
    <main
      className="min-h-screen bg-[#faf7f3] px-4 py-10 text-[#241A14]"
      dir="rtl"
    >
      <div className="mx-auto max-w-md rounded-[28px] border border-[#EADBC4] bg-[#FFFDF8] p-6 shadow-sm">
        <p className="text-center text-[11px] font-black tracking-[0.16em] text-[#B88A2D]">
          INVISTIMO CHECK-IN
        </p>
        <h1 className="mt-2 text-center text-2xl font-black">{eventTitle}</h1>
        <p className="mt-1 text-center text-sm font-bold text-[#7C6A58]">
          {[date, time].filter(Boolean).join(" · ") || "פרטי האירוע"}
        </p>

        {(location.name || location.address) && (
          <p className="mt-3 text-center text-sm font-bold text-[#5A4635]">
            {location.name || location.address}
          </p>
        )}

        {table && (
          <p className="mt-4 rounded-[16px] border border-[#EADBC4] bg-white px-4 py-3 text-center text-sm font-black">
            מספר השולחן שלכם: {table}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="QR כניסה אישי"
            width={240}
            height={240}
            className="rounded-[20px] border border-[#EADBC4] bg-white p-3"
          />
        </div>
        <p className="mt-3 text-center text-xs font-bold text-[#8A7A68]">
          הציגו את ה־QR בכניסה לאירוע
        </p>

        <Link
          href={detailsUrl}
          className="mt-6 flex w-full items-center justify-center rounded-[16px] bg-[#2F6B4F] px-4 py-3.5 text-sm font-black text-white"
        >
          פרטי האירוע
        </Link>
      </div>
    </main>
  );
}
