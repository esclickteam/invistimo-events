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
      /* =====================================================
         RSVP כללי — שתי גרסאות כי אצלך בקוד/DB יש גם SentAt וגם sentAt
      ===================================================== */
      `rsvpRound${round}SentAt`,
      `rsvpRound${round}sentAt`,

      /* =====================================================
         חשוב מאוד:
         אובייקט פנימי שקיים אצלך במונגו:
         rsvpRoundSentAt.round1 / round2 / round3
      ===================================================== */
           `rsvpRoundSentAt.round${round}`,
      /* =====================================================
         SMS
      ===================================================== */
      `rsvpSmsRound${round}SentAt`,
      `rsvpSmsRound${round}sentAt`,

      /* =====================================================
         WhatsApp
      ===================================================== */
      `rsvpWhatsappRound${round}SentAt`,
      `rsvpWhatsappRound${round}sentAt`,

      /* =====================================================
         Scheduled כללי
      ===================================================== */
      `rsvpRound${round}ScheduledAt`,
      `rsvpRound${round}scheduledAt`,

      /* =====================================================
         Scheduled SMS
      ===================================================== */
      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpSmsRound${round}scheduledAt`,

      /* =====================================================
         Scheduled WhatsApp
      ===================================================== */
      `rsvpWhatsappRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}scheduledAt`,

      /* =====================================================
         Locks אפשריים
      ===================================================== */
      `messageLocks.rsvpRound${round}`,
      `messageLocks.rsvpRound${round}Sms`,
      `messageLocks.rsvpRound${round}Whatsapp`,
      `messageLocks.rsvpSmsRound${round}`,
      `messageLocks.rsvpWhatsappRound${round}`,

      /* =====================================================
         חסימת אדמין
      ===================================================== */
      `adminMessageRoundLocks.rsvp_${round}`,
    ];
  }

  if (key === "reminder") {
    return [
      /* =====================================================
         כללי
      ===================================================== */
      "reminderSentAt",
      "remindersentAt",

      /* =====================================================
         SMS
      ===================================================== */
      "reminderSmsSentAt",
      "reminderSmssentAt",

      /* =====================================================
         WhatsApp
      ===================================================== */
      "reminderWhatsappSentAt",
      "reminderWhatsappsentAt",

      /* =====================================================
         Scheduled כללי
      ===================================================== */
      "reminderScheduledAt",
      "reminderscheduledAt",

      /* =====================================================
         Scheduled SMS
      ===================================================== */
      "reminderSmsScheduledAt",
      "reminderSmsscheduledAt",

      /* =====================================================
         Scheduled WhatsApp
      ===================================================== */
      "reminderWhatsappScheduledAt",
      "reminderWhatsappscheduledAt",

      /* =====================================================
         Locks שהשליחה בודקת
      ===================================================== */
      "messageLocks.reminder",
      "messageLocks.reminderSms",
      "messageLocks.reminderWhatsapp",

      /* =====================================================
         חסימת אדמין
      ===================================================== */
      "adminMessageRoundLocks.reminder",
    ];
  }

  if (key === "thankyou") {
    return [
      /* =====================================================
         כללי — שתי גרסאות
      ===================================================== */
      "thankYouSentAt",
      "thankYousentAt",
      "thankyouSentAt",
      "thankyousentAt",

      /* =====================================================
         SMS
      ===================================================== */
      "thankYouSmsSentAt",
      "thankYouSmssentAt",
      "thankyouSmsSentAt",
      "thankyouSmssentAt",

      /* =====================================================
         WhatsApp
      ===================================================== */
      "thankYouWhatsappSentAt",
      "thankYouWhatsappsentAt",
      "thankyouWhatsappSentAt",
      "thankyouWhatsappsentAt",

      /* =====================================================
         Scheduled כללי
      ===================================================== */
      "thankYouScheduledAt",
      "thankYouscheduledAt",
      "thankyouScheduledAt",
      "thankyouscheduledAt",

      /* =====================================================
         Scheduled SMS
      ===================================================== */
      "thankYouSmsScheduledAt",
      "thankYouSmsscheduledAt",
      "thankyouSmsScheduledAt",
      "thankyouSmsscheduledAt",

      /* =====================================================
         Scheduled WhatsApp
      ===================================================== */
      "thankYouWhatsappScheduledAt",
      "thankYouWhatsappscheduledAt",
      "thankyouWhatsappScheduledAt",
      "thankyouWhatsappscheduledAt",

      /* =====================================================
         Locks שהשליחה בודקת
      ===================================================== */
      "messageLocks.thankyou",
      "messageLocks.thankyouSms",
      "messageLocks.thankyouWhatsapp",
      "messageLocks.thankYou",
      "messageLocks.thankYouSms",
      "messageLocks.thankYouWhatsapp",

      /* =====================================================
         חסימת אדמין
      ===================================================== */
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
      /* =====================================================
         לתצוגה באדמין
      ===================================================== */
      [`adminMessageRoundLocks.rsvp_${round}`]: true,

      /* =====================================================
         לחסימה בפועל דרך בדיקות השליחה
      ===================================================== */
      [`rsvpRound${round}SentAt`]: now,
      [`rsvpRound${round}sentAt`]: now,

      /* =====================================================
         אובייקט פנימי שקיים אצלך במונגו
      ===================================================== */
      [`rsvpRoundSentAt.round${round}.sentAt`]: now,
      [`rsvpRoundSentAt.round${round}.blockedAt`]: now,
      [`rsvpRoundSentAt.round${round}.blockedByAdmin`]: true,

      /* =====================================================
         Locks אפשריים אם קיימים אצלך בקוד
      ===================================================== */
      [`messageLocks.rsvpRound${round}`]: true,
      [`messageLocks.rsvpRound${round}Sms`]: true,
      [`messageLocks.rsvpRound${round}Whatsapp`]: true,
      [`messageLocks.rsvpSmsRound${round}`]: true,
      [`messageLocks.rsvpWhatsappRound${round}`]: true,
    };
  }

  if (key === "reminder") {
    return {
      /* =====================================================
         לתצוגה באדמין
      ===================================================== */
      "adminMessageRoundLocks.reminder": true,

      /* =====================================================
         לחסימה בפועל ב-SMS/WhatsApp
      ===================================================== */
      reminderSentAt: now,
      remindersentAt: now,

      "messageLocks.reminder": true,
      "messageLocks.reminderSms": true,
      "messageLocks.reminderWhatsapp": true,
    };
  }

  if (key === "thankyou") {
    return {
      /* =====================================================
         לתצוגה באדמין
      ===================================================== */
      "adminMessageRoundLocks.thankyou": true,

      /* =====================================================
         לחסימה בפועל ב-SMS/WhatsApp
      ===================================================== */
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
    const invitationId = body?.invitationId;

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

    /*
      חשוב:
      אם שלחת invitationId מהפרונט — נעדכן את ההזמנה הספציפית.
      אם לא שלחת — נשאר fallback לפי ownerId כמו שהיה אצלך.
    */
    const invitationQuery = invitationId
      ? {
          _id: invitationId,
          ownerId: userId,
        }
      : {
          ownerId: userId,
        };

    const invitation = await Invitation.findOne(invitationQuery)
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
      מוחקת את כל מה שהשליחה / הפרונט בודקים:
      SentAt / sentAt / ScheduledAt / messageLocks / adminMessageRoundLocks
      וגם rsvpRoundSentAt.roundX
    */
    if (action === "reset" || action === "unblock") {
      const fields = getUnsetFieldsByRoundKey(key);

      if (!fields.length) {
        return NextResponse.json(
          { success: false, error: "INVALID_ROUND_KEY" },
          { status: 400 }
        );
      }

      const unset: Record<string, ""> = {};

      fields.forEach((field) => {
        unset[field] = "";
      });

      const resetResult = await Invitation.collection.updateOne(
  { _id: invitation._id },
  {
    $unset: unset,
    $set: {
      updatedAt: new Date(),
    },
  }
);

console.log("✅ MESSAGE ROUND RESET RESULT:", {
  invitationId: String(invitation._id),
  key,
  matchedCount: resetResult.matchedCount,
  modifiedCount: resetResult.modifiedCount,
  unsetFields: Object.keys(unset),
});
    }

    /*
      חסימה:
      לא מספיק adminMessageRoundLocks.
      צריך לסמן גם את השדות שהשליחה כבר בודקת.
    */
    if (action === "block") {
      const set = getBlockPatchByRoundKey(key);

      if (!Object.keys(set).length) {
        return NextResponse.json(
          { success: false, error: "INVALID_ROUND_KEY" },
          { status: 400 }
        );
      }

      const blockResult = await Invitation.collection.updateOne(
  { _id: invitation._id },
  {
    $set: {
      ...set,
      updatedAt: new Date(),
    },
  }
);

console.log("✅ MESSAGE ROUND BLOCK RESULT:", {
  invitationId: String(invitation._id),
  key,
  matchedCount: blockResult.matchedCount,
  modifiedCount: blockResult.modifiedCount,
});
    }

    const updatedInvitation = await Invitation.findById(invitation._id)
      .select(
        [
          "_id",
          "updatedAt",

          "rsvpRound1SentAt",
          "rsvpRound2SentAt",
          "rsvpRound3SentAt",

          "rsvpRound1sentAt",
          "rsvpRound2sentAt",
          "rsvpRound3sentAt",

          "rsvpSmsRound1SentAt",
          "rsvpSmsRound2SentAt",
          "rsvpSmsRound3SentAt",

          "rsvpWhatsappRound1SentAt",
          "rsvpWhatsappRound2SentAt",
          "rsvpWhatsappRound3SentAt",

          "rsvpWhatsappRound1ScheduledAt",
          "rsvpWhatsappRound2ScheduledAt",
          "rsvpWhatsappRound3ScheduledAt",

          "rsvpRoundSentAt",
          "reminderSentAt",
          "thankYouSentAt",
          "messageLocks",
          "adminMessageRoundLocks",
        ].join(" ")
      )
      .lean();

    return NextResponse.json(
      {
        success: true,
        invitation: updatedInvitation,
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