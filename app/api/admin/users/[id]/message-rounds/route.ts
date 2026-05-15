import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   AUTH
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

/* =========================================================
   HELPERS
========================================================= */
function getUnsetFieldsByRoundKey(key: string) {
  if (key.startsWith("rsvp_")) {
    const round = key.split("_")[1];

    return [
      /*
        חשוב:
        אצלך במונגו קיימים גם sentAt עם s קטנה,
        לכן חייבים למחוק את שתי הגרסאות.
      */
      `rsvpRound${round}SentAt`,
      `rsvpRound${round}sentAt`,

      `rsvpSmsRound${round}SentAt`,
      `rsvpSmsRound${round}sentAt`,

      `rsvpWhatsappRound${round}SentAt`,
      `rsvpWhatsappRound${round}sentAt`,

      `rsvpRound${round}ScheduledAt`,
      `rsvpRound${round}scheduledAt`,

      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpSmsRound${round}scheduledAt`,

      `rsvpWhatsappRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}scheduledAt`,

      `messageLocks.rsvpRound${round}`,
      `messageLocks.rsvpRound${round}Sms`,
      `messageLocks.rsvpRound${round}Whatsapp`,
      `messageLocks.rsvpSmsRound${round}`,
      `messageLocks.rsvpWhatsappRound${round}`,

      `adminMessageRoundLocks.rsvp_${round}`,
    ];
  }

  if (key === "reminder") {
    return [
      "reminderSentAt",
      "remindersentAt",

      "reminderSmsSentAt",
      "reminderSmssentAt",

      "reminderWhatsappSentAt",
      "reminderWhatsappsentAt",

      "reminderScheduledAt",
      "reminderscheduledAt",

      "reminderSmsScheduledAt",
      "reminderSmsscheduledAt",

      "reminderWhatsappScheduledAt",
      "reminderWhatsappscheduledAt",

      "messageLocks.reminder",
      "messageLocks.reminderSms",
      "messageLocks.reminderWhatsapp",

      "adminMessageRoundLocks.reminder",
    ];
  }

  if (key === "thankyou") {
    return [
      "thankYouSentAt",
      "thankYousentAt",

      "thankyouSentAt",
      "thankyousentAt",

      "thankYouSmsSentAt",
      "thankYouSmssentAt",

      "thankYouWhatsappSentAt",
      "thankYouWhatsappsentAt",

      "thankYouScheduledAt",
      "thankYouscheduledAt",

      "thankyouScheduledAt",
      "thankyouscheduledAt",

      "thankYouSmsScheduledAt",
      "thankYouSmsscheduledAt",

      "thankYouWhatsappScheduledAt",
      "thankYouWhatsappscheduledAt",

      "messageLocks.thankyou",
      "messageLocks.thankyouSms",
      "messageLocks.thankyouWhatsapp",
      "messageLocks.thankYou",
      "messageLocks.thankYouSms",
      "messageLocks.thankYouWhatsapp",

      "adminMessageRoundLocks.thankyou",
    ];
  }

  return [];
}

function getBlockPatchByRoundKey(key: string) {
  const now = new Date();

  if (key.startsWith("rsvp_")) {
    const round = key.split("_")[1];

    return {
      [`adminMessageRoundLocks.rsvp_${round}`]: true,

      /*
        חוסם גם לפי השם החדש וגם לפי השם שקיים אצלך בפועל במונגו.
      */
      [`rsvpRound${round}SentAt`]: now,
      [`rsvpRound${round}sentAt`]: now,
    };
  }

  if (key === "reminder") {
    return {
      "adminMessageRoundLocks.reminder": true,

      reminderSentAt: now,
      remindersentAt: now,

      "messageLocks.reminder": true,
      "messageLocks.reminderSms": true,
      "messageLocks.reminderWhatsapp": true,
    };
  }

  if (key === "thankyou") {
    return {
      "adminMessageRoundLocks.thankyou": true,

      thankYouSentAt: now,
      thankYousentAt: now,
      thankyouSentAt: now,
      thankyousentAt: now,

      "messageLocks.thankyou": true,
      "messageLocks.thankyouSms": true,
      "messageLocks.thankyouWhatsapp": true,
      "messageLocks.thankYou": true,
      "messageLocks.thankYouSms": true,
      "messageLocks.thankYouWhatsapp": true,
    };
  }

  return {};
}

/* =========================================================
   PATCH – RESET / BLOCK / UNBLOCK MESSAGE ROUND
========================================================= */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req as NextRequest);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;

    const body = await req.json().catch(() => null);

    const action = body?.action;
    const key = body?.key;

    if (!userId || !key || !["reset", "block", "unblock"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select("_id").lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const invitation = await Invitation.findOne({
      ownerId: userId,
    })
      .select("_id")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (action === "reset" || action === "unblock") {
      const fields = getUnsetFieldsByRoundKey(key);

      const unset: Record<string, ""> = {};

      fields.forEach((field) => {
        unset[field] = "";
      });

      await Invitation.findByIdAndUpdate(
        invitation._id,
        {
          $unset: unset,
        },
        { new: true }
      );
    }

    if (action === "block") {
      const set = getBlockPatchByRoundKey(key);

      await Invitation.findByIdAndUpdate(
        invitation._id,
        {
          $set: set,
        },
        { new: true }
      );
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN MESSAGE ROUND UPDATE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}