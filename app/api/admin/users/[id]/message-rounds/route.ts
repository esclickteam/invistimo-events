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
      // RSVP כללי — שתי גרסאות כי במונגו אצלך יש sentAt עם s קטנה
      `rsvpRound${round}SentAt`,
      `rsvpRound${round}sentAt`,

      // SMS
      `rsvpSmsRound${round}SentAt`,
      `rsvpSmsRound${round}sentAt`,

      // WhatsApp
      `rsvpWhatsappRound${round}SentAt`,
      `rsvpWhatsappRound${round}sentAt`,

      // Scheduled כללי
      `rsvpRound${round}ScheduledAt`,
      `rsvpRound${round}scheduledAt`,

      // Scheduled SMS
      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpSmsRound${round}scheduledAt`,

      // Scheduled WhatsApp
      `rsvpWhatsappRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}scheduledAt`,

      // locks אפשריים
      `messageLocks.rsvpRound${round}`,
      `messageLocks.rsvpRound${round}Sms`,
      `messageLocks.rsvpRound${round}Whatsapp`,
      `messageLocks.rsvpSmsRound${round}`,
      `messageLocks.rsvpWhatsappRound${round}`,

      // חסימת אדמין
      `adminMessageRoundLocks.rsvp_${round}`,
    ];
  }

  if (key === "reminder") {
    return [
      // כללי
      "reminderSentAt",
      "remindersentAt",

      // SMS
      "reminderSmsSentAt",
      "reminderSmssentAt",

      // WhatsApp
      "reminderWhatsappSentAt",
      "reminderWhatsappsentAt",

      // Scheduled כללי
      "reminderScheduledAt",
      "reminderscheduledAt",

      // Scheduled SMS
      "reminderSmsScheduledAt",
      "reminderSmsscheduledAt",

      // Scheduled WhatsApp
      "reminderWhatsappScheduledAt",
      "reminderWhatsappscheduledAt",

      // locks שהשליחה בודקת
      "messageLocks.reminder",
      "messageLocks.reminderSms",
      "messageLocks.reminderWhatsapp",

      // חסימת אדמין
      "adminMessageRoundLocks.reminder",
    ];
  }

  if (key === "thankyou") {
    return [
      // כללי — שתי גרסאות
      "thankYouSentAt",
      "thankYousentAt",
      "thankyouSentAt",
      "thankyousentAt",

      // SMS
      "thankYouSmsSentAt",
      "thankYouSmssentAt",
      "thankyouSmsSentAt",
      "thankyouSmssentAt",

      // WhatsApp
      "thankYouWhatsappSentAt",
      "thankYouWhatsappsentAt",
      "thankyouWhatsappSentAt",
      "thankyouWhatsappsentAt",

      // Scheduled כללי
      "thankYouScheduledAt",
      "thankYouscheduledAt",
      "thankyouScheduledAt",
      "thankyouscheduledAt",

      // Scheduled SMS
      "thankYouSmsScheduledAt",
      "thankYouSmsscheduledAt",
      "thankyouSmsScheduledAt",
      "thankyouSmsscheduledAt",

      // Scheduled WhatsApp
      "thankYouWhatsappScheduledAt",
      "thankYouWhatsappscheduledAt",
      "thankyouWhatsappScheduledAt",
      "thankyouWhatsappscheduledAt",

      // locks שהשליחה בודקת
      "messageLocks.thankyou",
      "messageLocks.thankyouSms",
      "messageLocks.thankyouWhatsapp",
      "messageLocks.thankYou",
      "messageLocks.thankYouSms",
      "messageLocks.thankYouWhatsapp",

      // חסימת אדמין
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
      // לתצוגה באדמין
      [`adminMessageRoundLocks.rsvp_${round}`]: true,

      // לחסימה בפועל דרך isRsvpRoundAlreadySent
      [`rsvpRound${round}SentAt`]: now,
      [`rsvpRound${round}sentAt`]: now,

      // locks אפשריים אם קיימים אצלך בקוד
      [`messageLocks.rsvpRound${round}`]: true,
      [`messageLocks.rsvpRound${round}Sms`]: true,
      [`messageLocks.rsvpRound${round}Whatsapp`]: true,
      [`messageLocks.rsvpSmsRound${round}`]: true,
      [`messageLocks.rsvpWhatsappRound${round}`]: true,
    };
  }

  if (key === "reminder") {
    return {
      // לתצוגה באדמין
      "adminMessageRoundLocks.reminder": true,

      // לחסימה בפועל ב-SMS/WhatsApp
      reminderSentAt: now,
      remindersentAt: now,

      "messageLocks.reminder": true,
      "messageLocks.reminderSms": true,
      "messageLocks.reminderWhatsapp": true,
    };
  }

  if (key === "thankyou") {
    return {
      // לתצוגה באדמין
      "adminMessageRoundLocks.thankyou": true,

      // לחסימה בפועל ב-SMS/WhatsApp
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

    /*
      פתיחה מחדש:
      מוחקת את כל מה שהשליחה בודקת:
      SentAt / sentAt / ScheduledAt / messageLocks / adminMessageRoundLocks
    */
    if (action === "reset" || action === "unblock") {
      const fields = getUnsetFieldsByRoundKey(key);

      const unset: Record<string, ""> = {};

      fields.forEach((field) => {
        unset[field] = "";
      });

      await Invitation.updateOne(
        { _id: invitation._id },
        {
          $unset: unset,
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }

    /*
      חסימה:
      לא מספיק adminMessageRoundLocks.
      צריך לסמן גם את השדות שהשליחה כבר בודקת.
    */
    if (action === "block") {
      const set = getBlockPatchByRoundKey(key);

      await Invitation.updateOne(
        { _id: invitation._id },
        {
          $set: {
            ...set,
            updatedAt: new Date(),
          },
        }
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