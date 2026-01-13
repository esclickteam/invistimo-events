import MessageLog from "@/models/MessageLog";

/**
 * ⚠️ IMPORTANT
 * This function is for STATS / DISPLAY ONLY.
 * It is NOT the source of truth for SMS balance.
 *
 * Source of truth:
 * Invitation.remainingMessages
 */
export async function calcBalanceStats(invitationId: string) {
  const usedMessages = await MessageLog.countDocuments({
    invitationId,
    channel: "sms",
  });

  return {
    usedMessages,
  };
}
