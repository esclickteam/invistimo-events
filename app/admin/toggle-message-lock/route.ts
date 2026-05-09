import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ================= VALID KEYS ================= */

const ALLOWED_KEYS = [
  // RSVP SMS
  "rsvpSmsRound1",
  "rsvpSmsRound2",

  // RSVP WhatsApp
  "rsvpWhatsappRound1",
  "rsvpWhatsappRound2",

  // Reminder
  "reminderSms",

  // Thank You
  "thankyouSms",
];

/* ================= POST ================= */

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    /* ================= AUTH ================= */

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    /* ================= BODY ================= */

    const body = await req.json();

    const {
      invitationId,
      key,
      value,
    } = body;

    /* ================= VALIDATION ================= */

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_INVITATION_ID",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_KEY",
        },
        { status: 400 }
      );
    }

    if (typeof value !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_VALUE",
        },
        { status: 400 }
      );
    }

    /* ================= UPDATE ================= */

    await Invitation.updateOne(
      { _id: invitationId },
      {
        $set: {
          [`messageLocks.${key}`]: value,
        },
      }
    );

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      success: true,
      key,
      value,
    });

  } catch (err) {
    console.error(
      "❌ toggle-message-lock error:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}