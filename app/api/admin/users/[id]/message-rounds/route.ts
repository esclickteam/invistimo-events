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
      `rsvpRound${round}SentAt`,
      `rsvpSmsRound${round}SentAt`,
      `rsvpWhatsappRound${round}SentAt`,

      `rsvpRound${round}ScheduledAt`,
      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}ScheduledAt`,

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
      "reminderSmsSentAt",
      "reminderWhatsappSentAt",

      "reminderScheduledAt",
      "reminderSmsScheduledAt",
      "reminderWhatsappScheduledAt",

      "messageLocks.reminder",
      "messageLocks.reminderSms",
      "messageLocks.reminderWhatsapp",

      "adminMessageRoundLocks.reminder",
    ];
  }

  if (key === "thankyou") {
    return [
      "thankYouSentAt",
      "thankyouSentAt",
      "thankYouSmsSentAt",
      "thankYouWhatsappSentAt",

      "thankYouScheduledAt",
      "thankyouScheduledAt",
      "thankYouSmsScheduledAt",
      "thankYouWhatsappScheduledAt",

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
        חשוב:
        קבצי השליחה של RSVP כבר חוסמים לפי isRsvpRoundAlreadySent.
        לכן כדי שחסימה באמת תמנע שליחה בלי לגעת בשליחה,
        מסמנים את הסבב כנעול דרך שדה SentAt כללי.
      */
      [`rsvpRound${round}SentAt`]: now,
    };
  }

  if (key === "reminder") {
    return {
      "adminMessageRoundLocks.reminder": true,

      /*
        קבצי השליחה חוסמים תזכורת לפי:
        reminderSentAt + messageLocks.reminderSms / reminderWhatsapp
      */
      reminderSentAt: now,
      "messageLocks.reminder": true,
      "messageLocks.reminderSms": true,
      "messageLocks.reminderWhatsapp": true,
    };
  }

  if (key === "thankyou") {
    return {
      "adminMessageRoundLocks.thankyou": true,

      /*
        קבצי השליחה חוסמים תודה לפי:
        thankYouSentAt + messageLocks.thankyouSms / thankyouWhatsapp
      */
      thankYouSentAt: now,
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

    /*
      פתיחה מחדש:
      מוחקת גם SentAt, גם ScheduledAt, גם messageLocks, וגם חסימת אדמין.
      זה מה שמאפשר למשתמש לשלוח שוב בלי לגעת בקבצי השליחה.
    */
    if (action === "reset" || action === "unblock") {
      const fields = getUnsetFieldsByRoundKey(key);

      const unset: Record<string, ""> = {};

      fields.forEach((field) => {
        unset[field] = "";
      });

      await Invitation.findByIdAndUpdate(invitation._id, {
        $unset: unset,
      });
    }

    /*
      חסימה:
      שומרת גם adminMessageRoundLocks בשביל התצוגה באדמין,
      וגם את השדות שקבצי השליחה הקיימים כבר בודקים.
    */
    if (action === "block") {
      const set = getBlockPatchByRoundKey(key);

      await Invitation.findByIdAndUpdate(invitation._id, {
        $set: set,
      });
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