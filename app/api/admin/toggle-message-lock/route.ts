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

    const isAdmin =
      user?.role === "admin" ||
      !!req.cookies.get("adminToken");

    if (!isAdmin) {
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

    /* ================= UPDATE DATA ================= */

    const updateData: any = {
      [`messageLocks.${key}`]: value,
    };

    /* ================= OPEN ROUND ================= */

    // false = פתיחת סבב מחדש
    if (value === false) {

      // RSVP SMS ROUND 1
      if (key === "rsvpSmsRound1") {
        updateData.rsvpRound1SentAt = null;
        updateData.rsvpSmsRound1SentAt = null;
        updateData.rsvpSmsRound1ScheduledAt = null;
      }

      // RSVP SMS ROUND 2
      if (key === "rsvpSmsRound2") {
        updateData.rsvpRound2SentAt = null;
        updateData.rsvpSmsRound2SentAt = null;
        updateData.rsvpSmsRound2ScheduledAt = null;
      }

      // RSVP WHATSAPP ROUND 1
      if (key === "rsvpWhatsappRound1") {
        updateData.rsvpRound1SentAt = null;
        updateData.rsvpWhatsappRound1ScheduledAt = null;
      }

      // RSVP WHATSAPP ROUND 2
      if (key === "rsvpWhatsappRound2") {
        updateData.rsvpRound2SentAt = null;
        updateData.rsvpWhatsappRound2ScheduledAt = null;
      }

      // REMINDER
      if (key === "reminderSms") {
        updateData.reminderSentAt = null;
      }

      // THANK YOU
      if (key === "thankyouSms") {
        updateData.thankYouSentAt = null;
      }
    }

    /* ================= CLOSE ROUND ================= */

    // true = סגירת סבב
    if (value === true) {

      // RSVP SMS ROUND 1
      if (key === "rsvpSmsRound1") {
        updateData.rsvpSmsRound1SentAt = new Date();
      }

      // RSVP SMS ROUND 2
      if (key === "rsvpSmsRound2") {
        updateData.rsvpSmsRound2SentAt = new Date();
      }

      // RSVP WHATSAPP ROUND 1
      if (key === "rsvpWhatsappRound1") {
        updateData.rsvpRound1SentAt = new Date();
      }

      // RSVP WHATSAPP ROUND 2
      if (key === "rsvpWhatsappRound2") {
        updateData.rsvpRound2SentAt = new Date();
      }

      // REMINDER
      if (key === "reminderSms") {
        updateData.reminderSentAt = new Date();
      }

      // THANK YOU
      if (key === "thankyouSms") {
        updateData.thankYouSentAt = new Date();
      }
    }

    /* ================= UPDATE ================= */

    await Invitation.updateOne(
      { _id: invitationId },
      {
        $set: updateData,
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