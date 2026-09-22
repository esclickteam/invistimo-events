import { randomUUID } from "crypto";

import Invitation from "@/models/Invitation";
import ScheduledMessage from "@/models/ScheduledMessage";
import {
  buildReopenedRsvpRoundState,
  buildRsvpRoundSentMarkState,
  getActiveRsvpRoundExecutionId,
  getRsvpRoundLockInfo,
  getRsvpRoundSentSnapshot,
  getRoundKey,
  isRsvpRoundAlreadySent,
  normalizeRsvpRound,
  type MessageChannel,
  type RsvpRound,
} from "@/lib/rsvpRoundState";

export type { MessageChannel, RsvpRound };
export {
  buildRsvpRoundSentMarkState,
  getActiveRsvpRoundExecutionId,
  getRsvpRoundLockInfo,
  getRsvpRoundSentSnapshot,
  getRoundKey,
  isRsvpRoundAlreadySent,
  normalizeRsvpRound,
};

/**
 * פתיחה מחדש של סבב RSVP:
 * - שומרת את השליחה הקודמת ב־executions (לא מוחקת היסטוריה)
 * - פותחת execution חדש שאפשר לתזמן/לשלוח
 * - מנקה locks + legacy SentAt שחוסמים את השליחה
 * - מבטלת תזמונים פעילים ישנים של אותו סבב
 */
export async function reopenRsvpRound(params: {
  invitationId: any;
  round: RsvpRound;
  closedReason?: string;
}) {
  const { invitationId, round } = params;
  const closedReason = params.closedReason || "admin_reopen";
  const key = getRoundKey(round);
  const now = new Date();

  const invitation: any = await Invitation.findById(invitationId).lean();
  if (!invitation) {
    return {
      matchedCount: 0,
      modifiedCount: 0,
      invitation: null,
      snapshot: null,
    };
  }

  const built = buildReopenedRsvpRoundState({
    invitation,
    round,
    now,
    closedReason,
    executionIdFactory: () => randomUUID(),
  });

  const unset: Record<string, ""> = {};
  for (const field of built.legacyUnsetFields) {
    unset[field] = "";
  }

  const result = await Invitation.collection.updateOne(
    { _id: invitation._id },
    {
      $set: {
        [`rsvpRoundSent.${key}`]: built.activeState,
        // מקור אמת משני — חייב להיות ריק אחרי reopen, אחרת scheduler חוסם.
        [`rsvpRoundsSent.${key}.sentAt`]: null,
        [`rsvpRoundsSent.${key}.channel`]: null,
        updatedAt: now,
      },
      $unset: unset,
    }
  );

  await ScheduledMessage.updateMany(
    {
      invitationId: invitation._id,
      $or: [{ type: "rsvp" }, { templateKey: "rsvp" }],
      $and: [
        {
          $or: [{ round }, { roundNumber: round }],
        },
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

  const updatedInvitation = await Invitation.findById(invitation._id).lean();

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    invitation: updatedInvitation,
    snapshot: getRsvpRoundSentSnapshot(updatedInvitation, round),
    newExecutionId: built.newExecutionId,
    archivedExecutions: built.archivedExecutions,
  };
}

/**
 * מסמן סבב כנשלח בפועל.
 *
 * לקרוא לפונקציה הזאת רק אחרי שהייתה שליחה אמיתית:
 * - שליחה מיידית שבאמת שלחה הודעות
 * - worker/cron שבאמת שלח הודעות מתוזמנות
 *
 * לא לקרוא בזמן יצירת תזמון.
 */
export async function markRsvpRoundAsActuallySent(params: {
  invitationId: string;
  round: RsvpRound;
  channel: MessageChannel;
  sentCount?: number;
  source?: string;
}) {
  const { invitationId, round, channel } = params;
  const sentCount = params.sentCount || 0;
  const source = params.source || "send";

  const key = getRoundKey(round);
  const now = new Date();

  const invitation: any = await Invitation.findById(invitationId)
    .select("rsvpRoundSent rsvpRoundsSent")
    .lean();

  if (!invitation) return { matchedCount: 0, modifiedCount: 0 };

  // אם כבר נשלח ב־execution הנוכחי — לא דורסים.
  if (isRsvpRoundAlreadySent(invitation, round)) {
    return { matchedCount: 1, modifiedCount: 0, alreadySent: true };
  }

  const markState = buildRsvpRoundSentMarkState({
    invitation,
    round,
    channel,
    sentCount,
    source,
    now,
    executionIdFactory: () => randomUUID(),
  });

  const channelSentField =
    channel === "sms"
      ? `rsvpSmsRound${round}SentAt`
      : `rsvpWhatsappRound${round}SentAt`;

  const lockField =
    channel === "sms"
      ? `messageLocks.rsvpSmsRound${round}`
      : `messageLocks.rsvpWhatsappRound${round}`;

  const oppositeLockField =
    channel === "sms"
      ? `messageLocks.rsvpWhatsappRound${round}`
      : `messageLocks.rsvpSmsRound${round}`;

  const scheduledField =
    channel === "sms"
      ? `rsvpSmsRound${round}ScheduledAt`
      : `rsvpWhatsappRound${round}ScheduledAt`;

  const result = await Invitation.collection.updateOne(
    { _id: invitationId },
    {
      $set: {
        [`rsvpRoundSent.${key}`]: markState,
        [`rsvpRoundsSent.${key}.sentAt`]: now,
        [`rsvpRoundsSent.${key}.channel`]: channel,
        [`rsvpRound${round}SentAt`]: now,
        [channelSentField]: now,
        [lockField]: true,
        [oppositeLockField]: true,
        updatedAt: now,
      },
      $unset: {
        [scheduledField]: "",
      },
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    alreadySent: false,
    executionId: markState.executionId,
  };
}
