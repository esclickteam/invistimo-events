import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";

export const dynamic = "force-dynamic";

/* ======================================================
   TYPES
====================================================== */

type Channel = "sms" | "whatsapp";
type MessageType = "rsvp" | "reminder" | "thankyou" | "table" | "custom";
type RoundNumber = 1 | 2 | 3;

/* ======================================================
   HELPERS
====================================================== */

function isValidObjectId(value: any) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeChannel(value: any): Channel | null {
  if (value === "sms") return "sms";
  if (value === "whatsapp") return "whatsapp";
  return null;
}

function normalizeType(value: any): MessageType {
  if (
    value === "rsvp" ||
    value === "reminder" ||
    value === "thankyou" ||
    value === "table" ||
    value === "custom"
  ) {
    return value;
  }

  return "rsvp";
}

function normalizeRound(value: any): RoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

/* ======================================================
   GET — get active schedule by invitation/type/channel/round
====================================================== */

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const invitationId = searchParams.get("invitationId");
    const type = normalizeType(searchParams.get("type"));
    const channel = normalizeChannel(searchParams.get("channel"));
    const round = normalizeRound(searchParams.get("round"));

    if (!invitationId || !isValidObjectId(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INVITATION_ID",
        },
        { status: 400 }
      );
    }

    /**
     * חשוב:
     * RSVP חייב channel + round.
     * Reminder / Thankyou גם יכולים לקבל channel.
     */
    const query: any = {
      invitationId,
      type,
      status: { $in: ["scheduled", "sending"] },
    };

    if (channel) {
      query.channel = channel;
    }

    if (type === "rsvp") {
      query.round = round;
    }

    const schedule = await ScheduledMessage.findOne(query)
      .sort({ scheduledAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      schedule: schedule || null,
    });
  } catch (err: any) {
    console.error("❌ GET /api/scheduled/by-invitation error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}