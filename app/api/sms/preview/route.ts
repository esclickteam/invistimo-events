// app/api/sms/preview/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { shortenUrl } from "@/lib/shortenUrl";
import { countSmsParts } from "@/lib/smsUtils";

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!);

    /* ================= BODY ================= */
    const {
      invitationId,
      guestId,
      messageOverride,
      includeGiftLink,
      giftLink,
    } = await req.json();

    if (!invitationId || !guestId || !messageOverride) {
      return NextResponse.json(
        { error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    /* ================= DATA ================= */
    const invitation = await Invitation.findById(invitationId).lean();
    const guest = await InvitationGuest.findById(guestId).lean();

    if (!invitation || !guest) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const event = invitation.eventId
      ? await Event.findById(invitation.eventId).lean()
      : null;

    /* ================= NAVIGATION ================= */
    const location = invitation.eventLocation ?? event?.location;
    const hasLocation = !!(location?.lat && location?.lng);

    let navigationLink = "";

if (hasLocation) {
  const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
  navigationLink = await shortenUrl(wazeUrl);
}


    /* ================= RSVP (SHORT) ================= */
    const personalRsvpUrl =
      `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

    const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

    /* ================= TABLE ================= */
    const tableName =
      guest.tableName ||
      (typeof guest.tableNumber === "number"
        ? `שולחן ${guest.tableNumber}`
        : "");

    /* ================= BUILD MESSAGE ================= */
    let finalText = messageOverride
      .replace(/{{name}}/g, guest.name || "")
      .replace(/{{rsvpLink}}/g, shortRsvpUrl)
      .replace(/{{tableName}}/g, tableName)
      .replace(/{{navigationLink}}/g, navigationLink);

    if (includeGiftLink && giftLink) {
      finalText += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
    }

    const length = finalText.length;
    const parts = countSmsParts(finalText);

    return NextResponse.json({
      success: true,
      text: finalText,
      length,
      parts,
    });
  } catch (err) {
    console.error("❌ SMS PREVIEW ERROR:", err);
    return NextResponse.json(
      { error: "PREVIEW_FAILED" },
      { status: 500 }
    );
  }
}
