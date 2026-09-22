import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import ScheduledMessage from "@/models/ScheduledMessage";
import {
  normalizeRsvpRound,
  reopenRsvpRound,
} from "@/lib/rsvpRoundLock";

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
   HELPERS — reminder / thankyou (לא RSVP)
========================================================= */
function getUnsetFieldsByRoundKey(key: string) {
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

      [`rsvpRoundsSent.round${round}.sentAt`]: now,
      [`rsvpRoundsSent.round${round}.channel`]: "admin",

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

async function archiveAndReopenSimpleRound(params: {
  invitationId: any;
  key: "reminder" | "thankyou";
}) {
  const { invitationId, key } = params;
  const now = new Date();

  const invitation: any = await Invitation.findById(invitationId).lean();
  if (!invitation) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const historyField =
    key === "reminder" ? "reminderSendExecutions" : "thankYouSendExecutions";

  const currentSentAt =
    key === "reminder"
      ? invitation.reminderSentAt ||
        invitation.reminderSmsSentAt ||
        invitation.reminderWhatsappSentAt
      : invitation.thankYouSentAt ||
        invitation.thankYouSmsSentAt ||
        invitation.thankYouWhatsappSentAt ||
        invitation.thankyouSentAt;

  const history = Array.isArray(invitation[historyField])
    ? [...invitation[historyField]]
    : [];

  if (currentSentAt) {
    history.push({
      sentAt: currentSentAt,
      closedAt: now,
      closedReason: "admin_reopen",
    });
  }

  const fields = getUnsetFieldsByRoundKey(key);
  const unset: Record<string, ""> = {};
  fields.forEach((field) => {
    unset[field] = "";
  });

  const result = await Invitation.collection.updateOne(
    { _id: invitationId },
    {
      $set: {
        [historyField]: history,
        updatedAt: now,
      },
      $unset: unset,
    }
  );

  const scheduleTypes =
    key === "reminder"
      ? ["reminder", "table", "rsvp_reminder"]
      : ["thankyou", "thank_you", "custom"];

  await ScheduledMessage.updateMany(
    {
      invitationId,
      $or: [
        { type: { $in: scheduleTypes } },
        { templateKey: { $in: scheduleTypes } },
      ],
      status: { $in: ["scheduled", "pending", "sending"] },
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        lockedAt: null,
        lockedBy: null,
        error: "CANCELLED_BY_ADMIN_REOPEN",
        updatedAt: now,
      },
    }
  );

  return result;
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
      if (shouldOpenRound3Permission) {
        return NextResponse.json(
          {
            success: true,
            invitation: null,
            userUpdated: true,
            message: "ROUND_3_PERMISSION_OPENED_WITHOUT_INVITATION",
          },
          {
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );
      }

      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    let updateDebug: any = null;

    /*
      פתיחה מחדש:
      RSVP = archive ל־executions + execution חדש (לא מוחק היסטוריה).
      reminder/thankyou = archive ל־*SendExecutions + unset של active locks.
    */
    if (action === "reset" || action === "unblock") {
      if (key.startsWith("rsvp_")) {
        const round = normalizeRsvpRound(key.split("_")[1]);

        if (!round) {
          return NextResponse.json(
            { success: false, error: "INVALID_ROUND_KEY" },
            { status: 400 }
          );
        }

        const reopenResult = await reopenRsvpRound({
          invitationId: invitation._id,
          round,
          closedReason: "admin_reopen",
        });

        updateDebug = {
          action,
          key,
          userId,
          receivedInvitationId: invitationId || null,
          updatedInvitationId: String(invitation._id),
          matchedCount: reopenResult.matchedCount,
          modifiedCount: reopenResult.modifiedCount,
          newExecutionId: reopenResult.newExecutionId,
          archivedExecutions: reopenResult.archivedExecutions,
          snapshot: reopenResult.snapshot,
        };

        console.log("✅ MESSAGE ROUND REOPEN RESULT:", updateDebug);
      } else {
        const fields = getUnsetFieldsByRoundKey(key);

        if (!fields.length) {
          return NextResponse.json(
            { success: false, error: "INVALID_ROUND_KEY" },
            { status: 400 }
          );
        }

        const resetResult = await archiveAndReopenSimpleRound({
          invitationId: invitation._id,
          key: key as "reminder" | "thankyou",
        });

        updateDebug = {
          action,
          key,
          userId,
          receivedInvitationId: invitationId || null,
          updatedInvitationId: String(invitation._id),
          matchedCount: resetResult.matchedCount,
          modifiedCount: resetResult.modifiedCount,
          mode: "archive_and_unset",
        };

        console.log("✅ MESSAGE ROUND RESET RESULT:", updateDebug);
      }
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
          "rsvpRoundsSent",

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
          "reminderSendExecutions",
          "thankYouSendExecutions",
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
