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
      /* RSVP כללי */
      `rsvpRound${round}SentAt`,
      `rsvpRound${round}sentAt`,

      /* מקור אמת חדש + מקור ישן */
      `rsvpRoundSent.round${round}`,
      `rsvpRoundSentAt.round${round}`,

      /* SMS ישן */
      `rsvpSmsRound${round}SentAt`,
      `rsvpSmsRound${round}sentAt`,

      /* WhatsApp ישן */
      `rsvpWhatsappRound${round}SentAt`,
      `rsvpWhatsappRound${round}sentAt`,

      /* Scheduled כללי */
      `rsvpRound${round}ScheduledAt`,
      `rsvpRound${round}scheduledAt`,

      /* Scheduled SMS */
      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpSmsRound${round}scheduledAt`,

      /* Scheduled WhatsApp */
      `rsvpWhatsappRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}scheduledAt`,

      /* Locks ישנים */
      `messageLocks.rsvpRound${round}`,
      `messageLocks.rsvpRound${round}Sms`,
      `messageLocks.rsvpRound${round}Whatsapp`,
      `messageLocks.rsvpSmsRound${round}`,
      `messageLocks.rsvpWhatsappRound${round}`,

      /* חסימת אדמין */
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
      "thankyouSmsSentAt",
      "thankyouSmssentAt",

      "thankYouWhatsappSentAt",
      "thankYouWhatsappsentAt",
      "thankyouWhatsappSentAt",
      "thankyouWhatsappsentAt",

      "thankYouScheduledAt",
      "thankYouscheduledAt",
      "thankyouScheduledAt",
      "thankyouscheduledAt",

      "thankYouSmsScheduledAt",
      "thankYouSmsscheduledAt",
      "thankyouSmsScheduledAt",
      "thankyouSmsscheduledAt",

      "thankYouWhatsappScheduledAt",
      "thankYouWhatsappscheduledAt",
      "thankyouWhatsappScheduledAt",
      "thankyouWhatsappscheduledAt",

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
      /* תצוגה באדמין */
      [`adminMessageRoundLocks.rsvp_${round}`]: true,

      /*
        מקור אמת חדש:
        אם חוסמים סבב, גם הפרונט/שליחה יראו אותו כחסום/בוצע.
      */
      [`rsvpRoundSent.round${round}`]: {
        channel: "admin",
        sentAt: now,
        blockedAt: now,
        blockedByAdmin: true,
      },

      /* שדות ישנים לתאימות */
      [`rsvpRound${round}SentAt`]: now,
      [`rsvpRound${round}sentAt`]: now,

      [`rsvpRoundSentAt.round${round}.sentAt`]: now,
      [`rsvpRoundSentAt.round${round}.blockedAt`]: now,
      [`rsvpRoundSentAt.round${round}.blockedByAdmin`]: true,

      [`messageLocks.rsvpRound${round}`]: true,
      [`messageLocks.rsvpRound${round}Sms`]: true,
      [`messageLocks.rsvpRound${round}Whatsapp`]: true,
      [`messageLocks.rsvpSmsRound${round}`]: true,
      [`messageLocks.rsvpWhatsappRound${round}`]: true,
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
    const invitationId = body?.invitationId;

    if (!userId || !key || !["reset", "block", "unblock"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId)
  .select("_id allowedMessageRounds planLimits")
  .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isRound3 = key === "rsvp_3";
const shouldOpenRound3Permission =
  isRound3 && (action === "reset" || action === "unblock");

if (shouldOpenRound3Permission) {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        allowedMessageRounds: 3,
        "planLimits.allowedMessageRounds": 3,
        updatedAt: new Date(),
      },
    }
  );
}

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

    let updateDebug: any = null;

    /*
      פתיחה מחדש:
      מוחקת את מקור האמת החדש + כל השדות הישנים שיכולים להפריע.
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

      updateDebug = {
        action,
        key,
        userId,
        receivedInvitationId: invitationId || null,
        updatedInvitationId: String(invitation._id),
        matchedCount: resetResult.matchedCount,
        modifiedCount: resetResult.modifiedCount,
        unsetFields: Object.keys(unset),
      };

      console.log("✅ MESSAGE ROUND RESET RESULT:", updateDebug);
    }

    /*
      חסימה:
      מסמנת גם את rsvpRoundSent.roundX כדי שהשליחה החדשה תיחסם לפי מקור האמת החדש.
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

      updateDebug = {
        action,
        key,
        userId,
        receivedInvitationId: invitationId || null,
        updatedInvitationId: String(invitation._id),
        matchedCount: blockResult.matchedCount,
        modifiedCount: blockResult.modifiedCount,
        setFields: Object.keys(set),
      };

      console.log("✅ MESSAGE ROUND BLOCK RESULT:", updateDebug);
    }

    const updatedInvitation = await Invitation.findById(invitation._id)
      .select(
        [
          "_id",
          "updatedAt",

          "rsvpRoundSent",
          "rsvpRoundSentAt",

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
        debug: updateDebug,
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