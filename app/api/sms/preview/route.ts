import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { buildFinalSmsText } from "@/lib/sms/buildFinalSmsText";
import { shortenUrl } from "@/lib/shortenUrl";

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

    /* ================= LOAD DATA ================= */
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

    /* ================= BUILD FINAL SMS ================= */
    let finalText = await buildFinalSmsText({
      messageTemplate: messageOverride,
      guest,
      invitation,
      event,
      includeGiftLink,
      giftLink,
    });

    /* ================= SHORTEN URLS =================
       מקצרים רק URL אמיתיים
       לא נוגעים בטמפלטים לא פתורים
    ================================================== */
    const urls = finalText.match(/https?:\/\/[^\s]+/g);

    if (urls) {
      for (const url of urls) {
        if (url.includes("{{") || url.includes("}}")) continue;

        try {
          const short = await shortenUrl(url);
          finalText = finalText.replace(url, short);
        } catch (err) {
          console.error("Shorten failed:", err);
        }
      }
    }

    /* ================= COUNT (BUSINESS LOGIC) ================= */
    const length = [...finalText].length;

    let parts = 1;
    let allowed = true;
    let overflow = 0;

    if (length <= 200) {
      parts = 1;
    } else if (length <= 320) {
      parts = 2;
    } else {
      parts = 2;
      allowed = false;
      overflow = length - 320;
    }

    /* ================= RESPONSE ================= */
    return NextResponse.json({
      success: true,
      finalMessage: finalText, // 👈 חשוב כדי שהקליינט יעדכן טקסט
      totalChars: length,
      parts,
      allowed,
      overflow,
      limit: 320,
    });
  } catch (err) {
    console.error("❌ SMS PREVIEW ERROR:", err);
    return NextResponse.json(
      { error: "PREVIEW_FAILED" },
      { status: 500 }
    );
  }
}
