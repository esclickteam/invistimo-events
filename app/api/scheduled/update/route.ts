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

function getRsvpScheduledField(channel: string, round: 1 | 2 | 3) {
  if (channel === "sms") {
    return `rsvpSmsRound${round}ScheduledAt`;
  }

  return `rsvpWhatsappRound${round}ScheduledAt`;
}

/* ======================================================
   POST — UPDATE SCHEDULE DATE/TIME
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
    const scheduledAtRaw = body.scheduledAt;

    if (!isValidObjectId(scheduleId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SCHEDULE_ID",
        },
        { status: 400 }
      );
    }

    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SCHEDULED_AT",
        },
        { status: 400 }
      );
    }

    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: "SCHEDULED_AT_MUST_BE_FUTURE",
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
          message: "ההודעה כבר נשלחה ולכן אי אפשר לערוך את התזמון.",
        },
        { status: 409 }
      );
    }

    if (schedule.status === "sending") {
      return NextResponse.json(
        {
          success: false,
          error: "SCHEDULE_ALREADY_SENDING",
          message: "השליחה כבר התחילה ולכן אי אפשר לערוך את התזמון.",
        },
        { status: 409 }
      );
    }

    if (schedule.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "SCHEDULE_CANCELLED",
          message: "התזמון בוטל. צריך ליצור תזמון חדש.",
        },
        { status: 409 }
      );
    }

    /* ================= UPDATE SCHEDULED MESSAGE ================= */

    schedule.scheduledAt = scheduledAt;
    schedule.status = "scheduled";
    schedule.lockedAt = null;
    schedule.lockedBy = null;
    schedule.error = "";
    schedule.cancelledAt = null;

    await schedule.save();

    /* ================= UPDATE WHATSAPP QUEUE IF EXISTS ================= */

    await WhatsappQueue.updateMany(
      {
        scheduleId: schedule._id,
        status: { $in: ["pending", "scheduled"] },
      },
      {
        $set: {
          scheduledAt,
          status: "scheduled",
          lockedAt: null,
          lockedBy: null,
        },
      }
    );

    /* ================= UPDATE INVITATION SCHEDULE FIELD ================= */

    if (schedule.type === "rsvp") {
      const round = normalizeRound(schedule.round ?? schedule.roundNumber);
      const scheduledField = getRsvpScheduledField(schedule.channel, round);

      await Invitation.findByIdAndUpdate(schedule.invitationId, {
        $set: {
          [scheduledField]: scheduledAt,
        },
      });
    }

    /*
      חשוב:
      לא נוגעים כאן ב:
      - rsvpSmsRoundXSentAt
      - rsvpWhatsappRoundXSentAt
      - messageLocks

      כי עריכת תזמון אינה שליחה בפועל.
    */

    return NextResponse.json({
      success: true,
      message: "SCHEDULE_UPDATED",
      scheduleId: schedule._id,
      scheduledAt,
      schedule,
    });
  } catch (err: any) {
    console.error("❌ POST /api/scheduled/update error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}