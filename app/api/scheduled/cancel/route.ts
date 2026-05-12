import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import Invitation from "@/models/Invitation";
import WhatsappQueue from "@/models/WhatsappQueue";

export const dynamic = "force-dynamic";

/* ======================================================
   AUTH
====================================================== */

async function getAuthUserId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("token")?.value ||
    null;

  if (!token) {
    return {
      ok: false as const,
      error: "UNAUTHORIZED",
      status: 401,
    };
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    if (!userId) {
      return {
        ok: false as const,
        error: "INVALID_TOKEN",
        status: 401,
      };
    }

    return {
      ok: true as const,
      userId,
    };
  } catch {
    return {
      ok: false as const,
      error: "INVALID_TOKEN",
      status: 401,
    };
  }
}

/* ======================================================
   HELPERS
====================================================== */

function isValidObjectId(value: any) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeRound(value: any): 1 | 2 | 3 {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

function normalizeMessageType(value: any) {
  const type = String(value || "").toLowerCase();

  if (type === "reminder") return "reminder";
  if (type === "thankyou" || type === "thank_you" || type === "thank-you") {
    return "thankyou";
  }

  return "rsvp";
}

function normalizeChannel(value: any) {
  const channel = String(value || "").toLowerCase();

  if (channel === "sms") return "sms";
  if (channel === "whatsapp") return "whatsapp";

  return channel;
}

function getRsvpScheduledField(channel: string, round: 1 | 2 | 3) {
  if (channel === "sms") {
    return `rsvpSmsRound${round}ScheduledAt`;
  }

  return `rsvpWhatsappRound${round}ScheduledAt`;
}

function buildInvitationUnsetPatch(schedule: any) {
  const type = normalizeMessageType(schedule.type);
  const channel = normalizeChannel(schedule.channel);

  const $set: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (type === "rsvp") {
    const round = normalizeRound(schedule.round ?? schedule.roundNumber);
    const scheduledField = getRsvpScheduledField(channel, round);

    $set[scheduledField] = null;
  }

  if (type === "reminder") {
    $set.reminderScheduledAt = null;
  }

  if (type === "thankyou") {
    $set.thankYouScheduledAt = null;
  }

  return { $set };
}

/* ======================================================
   POST — CANCEL SCHEDULE
====================================================== */

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const auth = await getAuthUserId();

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const scheduleId = String(body.scheduleId || "");

    if (!isValidObjectId(scheduleId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SCHEDULE_ID",
        },
        { status: 400 }
      );
    }

    /* ================= FIND SCHEDULE ================= */

    const schedule = await ScheduledMessage.findOne({
      _id: scheduleId,
      userId: auth.userId,
    });

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: "SCHEDULE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    /* ================= STATUS CHECKS ================= */

    if (schedule.status === "sent") {
      return NextResponse.json(
        {
          success: false,
          error: "SCHEDULE_ALREADY_SENT",
          message: "ההודעה כבר נשלחה ולכן אי אפשר לבטל אותה.",
        },
        { status: 409 }
      );
    }

    if (schedule.status === "sending") {
      return NextResponse.json(
        {
          success: false,
          error: "SCHEDULE_ALREADY_SENDING",
          message: "השליחה כבר התחילה ולכן אי אפשר לבטל את התזמון.",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    /* ================= NORMALIZED DATA ================= */

    const invitationId = schedule.invitationId;
    const channel = normalizeChannel(schedule.channel);
    const type = normalizeMessageType(schedule.type);
    const round = normalizeRound(schedule.round ?? schedule.roundNumber);

    /* ================= ALREADY CANCELLED ================= */

    if (schedule.status === "cancelled") {
      await WhatsappQueue.updateMany(
        {
          $or: [
            {
              scheduleId: schedule._id,
            },
            {
              scheduleId: String(schedule._id),
            },
            {
              invitationId,
              channel,
              type,
              round,
            },
            {
              invitationId,
              channel,
              type,
              roundNumber: round,
            },
            {
              invitationId,
              templateType: type,
              round,
            },
            {
              invitationId,
              templateType: type,
              roundNumber: round,
            },
          ],
          status: { $in: ["pending", "scheduled"] },
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
        scheduleId: schedule._id,
      });
    }

    /* ================= CANCEL SCHEDULED MESSAGE ================= */

    schedule.status = "cancelled";
    schedule.cancelledAt = now;
    schedule.lockedAt = null;
    schedule.lockedBy = null;
    schedule.error = "";

    await schedule.save();

    /* ======================================================
       CANCEL WHATSAPP QUEUE

       חשוב:
       לא מסתמכים רק על scheduleId.
       אם ה-queue נוצר בלי scheduleId, עדיין מבטלים לפי:
       invitationId + channel + type + round
    ====================================================== */

    let whatsappQueueResult: any = {
      matchedCount: 0,
      modifiedCount: 0,
    };

    if (channel === "whatsapp") {
      whatsappQueueResult = await WhatsappQueue.updateMany(
        {
          $or: [
            {
              scheduleId: schedule._id,
            },
            {
              scheduleId: String(schedule._id),
            },
            {
              invitationId,
              channel: "whatsapp",
              type,
              round,
            },
            {
              invitationId,
              channel: "whatsapp",
              type,
              roundNumber: round,
            },
            {
              invitationId,
              templateType: type,
              round,
            },
            {
              invitationId,
              templateType: type,
              roundNumber: round,
            },
          ],
          status: { $in: ["pending", "scheduled"] },
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          },
        }
      );
    }

    /* ================= CANCEL SMS QUEUE/SCHEDULE ONLY ================= */

    if (channel === "sms") {
      await ScheduledMessage.updateMany(
        {
          _id: { $ne: schedule._id },
          invitationId,
          userId: auth.userId,
          channel: "sms",
          type,
          round,
          status: { $in: ["pending", "scheduled"] },
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          },
        }
      );
    }

    /* ================= CLEAR INVITATION SCHEDULE FIELD ================= */

    await Invitation.findByIdAndUpdate(
      invitationId,
      buildInvitationUnsetPatch(schedule)
    );

    /*
      חשוב:
      לא נוגעים כאן ב:
      - rsvpSmsRoundXSentAt
      - rsvpWhatsappRoundXSentAt
      - rsvpRoundXSentAt
      - reminderSentAt
      - thankYouSentAt
      - messageLocks

      ביטול תזמון לא אומר שהסבב נשלח.
    */

    return NextResponse.json({
      success: true,
      message: "SCHEDULE_CANCELLED",
      scheduleId: schedule._id,
      status: "cancelled",
      cancelledWhatsappQueue: {
        matchedCount: whatsappQueueResult?.matchedCount ?? 0,
        modifiedCount: whatsappQueueResult?.modifiedCount ?? 0,
      },
    });
  } catch (err: any) {
    console.error("❌ POST /api/scheduled/cancel error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}