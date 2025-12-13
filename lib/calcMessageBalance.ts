import MessageLog from "@/models/MessageLog";

export async function calcBalance(invitationId: string, maxGuests: number) {
  const maxMessages = maxGuests * 3;
  const usedMessages = await MessageLog.countDocuments({ invitationId });

  return {
    maxMessages,
    usedMessages,
    remainingMessages: Math.max(maxMessages - usedMessages, 0),
  };
}
