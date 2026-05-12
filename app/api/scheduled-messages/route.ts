import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import Invitation from "@/models/Invitation";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/* ======================================================
   TYPES
====================================================== */

type Channel = "sms" | "whatsapp";
type MessageType = "rsvp" | "reminder" | "thankyou" | "table" | "custom";
type RoundNumber = 1 | 2 | 3;
type FilterType = "all" | "pending" | "withTable";

/* ======================================================
   AUTH
====================================================== */

async function getAuthUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

/* ======================================================
   HELPERS
====================================================== */

function normalizeRound(value: any): RoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

function normalizeChannel(value: any): Channel {
  return value === "whatsapp" ? "whatsapp" : "sms";
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

function getTemplateKey(type: MessageType) {
  if (type === "reminder") return "reminder";
  if (type === "thankyou") return "thankyou";
  if (type === "table") return "table";
  if (type === "custom") return "custom";
  return "rsvp";
}

function getFilterByTypeAndRound(
  type: MessageType,
  round: RoundNumber,
  fallback?: any
): FilterType {
  if (type === "rsvp") {
    return round === 1 ? "all" : "pending";
  }

  if (fallback === "pending") return "pending";
  if (fallback === "withTable") return "withTable";

  return "all";
}

function getRsvpScheduledField(channel: Channel, round: RoundNumber) {
  if (channel === "sms") {
    return `rsvpSmsRound${round}ScheduledAt`;
  }

  return `rsvpWhatsappRound${round}ScheduledAt`;
}

function isValidObjectId(value: any) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function buildMessageContent(body: any) {
  return String(
    body.messageContent ||
      body.messageOverride ||
      body.message ||
      body.text ||
      ""
  ).trim();
}

/* ======================================================
   GET — scheduled messages list
====================================================== */

export async function GET() {
  try {
    await dbConnect();

    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const messages = await ScheduledMessage.find({
      userId,
      status: "scheduled",
    })
      .sort({ scheduledAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error("❌ GET /api/scheduled-messages error:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ======================================================
   POST — create/update scheduled message
====================================================== */

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const invitationId = String(body.invitationId || "");

    if (!isValidObjectId(invitationId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INVITATION_ID" },
        { status: 400 }
      );
    }

    const channel = normalizeChannel(body.channel);
    const type = normalizeType(body.type || body.templateKey);
    const round = normalizeRound(body.round ?? body.roundNumber);
    const filter = getFilterByTypeAndRound(type, round, body.filter);

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "INVALID_SCHEDULED_AT" },
        { status: 400 }
      );
    }

    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: "SCHEDULED_AT_MUST_BE_FUTURE" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({
      _id: invitationId,
      ownerId: userId,
    }).select("_id ownerId");

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const templateKey = body.templateKey || getTemplateKey(type);

    const templateName =
      channel === "whatsapp"
        ? String(body.templateName || "").trim()
        : "";

    const messageOverride =
      channel === "sms"
        ? String(body.messageOverride || body.message || body.text || "").trim()
        : "";

    const messageContent = buildMessageContent(body);

    /**
     * חשוב:
     * לא שומרים כאן קהל סופי לסבב 2/3.
     * ה-worker ישלוף בזמן השליחה:
     * round 1 => all
     * round 2/3 => pending
     *
     * guestIds נשאר רק לתאימות / custom / הודעות אחרות.
     */
    const guestIds =
      type === "rsvp"
        ? []
        : Array.isArray(body.guestIds)
        ? body.guestIds.filter(isValidObjectId)
        : Array.isArray(body.audience)
        ? body.audience.filter(isValidObjectId)
        : [];

    /**
     * אם כבר יש תזמון פעיל לאותו דבר בדיוק:
     * אותה הזמנה + אותו סוג + אותו ערוץ + אותו סבב
     * אנחנו מעדכנים אותו במקום ליצור כפילות.
     *
     * זה עדיין מאפשר לתזמן במקביל:
     * rsvp round 1
     * rsvp round 2
     * rsvp round 3
     * reminder
     * thankyou
     */
    const existingSchedule = await ScheduledMessage.findOne({
      invitationId,
      userId,
      type,
      channel,
      round,
      status: "scheduled",
    });

    const payload = {
      invitationId,
      userId,

      channel,
      type,
      filter,

      guestIds,

      templateKey,
      round,
      roundNumber: round,

      templateName,
      messageOverride,
      messageContent,

      text: messageContent,

      includeGiftLink: !!body.includeGiftLink,
      giftLink: body.giftLink || null,

      scheduledAt,
      status: "scheduled",

      guestsCount: 0,
      sentCount: 0,

      lockedAt: null,
      lockedBy: null,
      lastAttemptAt: null,

      error: "",
      cancelledAt: null,
    };

    let schedule;

    if (existingSchedule) {
      existingSchedule.set(payload);
      schedule = await existingSchedule.save();
    } else {
      schedule = await ScheduledMessage.create(payload);
    }

    /**
     * מותר לעדכן ScheduledAt על Invitation לצורך תצוגה בפרונט.
     * אסור כאן לעדכן:
     * - SentAt
     * - messageLocks
     *
     * כי תזמון אינו שליחה בפועל.
     */
    if (type === "rsvp") {
      const scheduledField = getRsvpScheduledField(channel, round);

      await Invitation.findByIdAndUpdate(invitationId, {
        $set: {
          [scheduledField]: scheduledAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      schedule,
      mode: existingSchedule ? "updated" : "created",
    });
  } catch (err: any) {
    console.error("❌ POST /api/scheduled-messages error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}