import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { buildFinalSmsText } from "@/lib/sms/buildFinalSmsText";

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

    /* ================= BUILD FINAL SMS (SOURCE OF TRUTH) ================= */
    const finalText = await buildFinalSmsText({
      messageTemplate: messageOverride,
      guest,
      invitation,
      event,
      includeGiftLink,
      giftLink,
    });

    /* ================= COUNT (BUSINESS LOGIC) ================= */
const length = [...finalText].length; // Unicode safe

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
  text: finalText,
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
