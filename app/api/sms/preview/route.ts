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

    /* ========== AUTH ========== */
    const cookieStore = await cookies();
const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    /* ========== BODY ========== */
    const {
      invitationId,
      templateKey,
      messageOverride,
      guestId,
      includeGiftLink,
      giftLink,
    } = await req.json();

    if (!invitationId || !guestId || !messageOverride) {
      return NextResponse.json(
        { error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    /* ========== DATA ========== */
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

    const location = invitation.eventLocation ?? event?.location;
    const hasLocation = !!(location?.lat && location?.lng);

    const navigationLink = hasLocation
      ? `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`
      : "";

    const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

    const tableName =
      guest.tableName ||
      (typeof guest.tableNumber === "number"
        ? `שולחן ${guest.tableNumber}`
        : "");

    /* ========== BUILD MESSAGE ========== */
    let finalText = messageOverride
      .replace(/{{name}}/g, guest.name || "")
      .replace(/{{rsvpLink}}/g, rsvpLink)
      .replace(/{{tableName}}/g, tableName)
      .replace(/{{navigationLink}}/g, navigationLink);

    if (includeGiftLink && giftLink) {
      finalText += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
    }

    /* ✂️ קיצור קישורים */
    finalText = await shortenUrlsInText(finalText);

    const length = finalText.length;
    const parts = countSmsParts(finalText);

    return NextResponse.json({
      success: true,
      finalText,
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

/* ================= HELPERS ================= */

async function shortenUrlsInText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  if (!urls) return text;

  let result = text;
  for (const url of urls) {
    const short = await shortenUrl(url);
    result = result.replace(url, short);
  }
  return result;
}
