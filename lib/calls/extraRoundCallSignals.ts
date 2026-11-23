import mongoose from "mongoose";
import CallTask from "@/models/CallTask";
import {
  classifyCallAttempt,
  extractGuestId,
} from "@/lib/calls/callRoundEligibility";

/**
 * Every earlier human-call attempt, not only the latest task.
 * Used when opening rounds 4–20. Rounds 1–3 keep their own loaders.
 */
export async function loadEarlierHumanCallSignals(input: {
  invitationId: unknown;
  beforeRound: number;
}): Promise<{ noAnswer: Set<string>; callback: Set<string> }> {
  const noAnswer = new Set<string>();
  const callback = new Set<string>();
  const beforeRound = Number(input.beforeRound);

  if (!Number.isInteger(beforeRound) || beforeRound < 4) {
    return { noAnswer, callback };
  }

  const invitationId = extractGuestId(input.invitationId);
  if (!invitationId || !mongoose.Types.ObjectId.isValid(invitationId)) {
    return { noAnswer, callback };
  }

  const tasks = await CallTask.find({
    invitationId: new mongoose.Types.ObjectId(invitationId),
    round: { $gte: 1, $lt: beforeRound },
  })
    .select(
      "guestId invitationGuestId status result callResult outcome callStatus answerStatus callAnswered noAnswerResult answeredResult resultStatus pendingCallStatus pendingReason nextRoundReason callbackRequested attempts callAttempts attemptHistory"
    )
    .lean();

  for (const task of tasks) {
    const guestId = extractGuestId(
      (task as any)?.guestId || (task as any)?.invitationGuestId
    );
    if (!guestId) continue;

    const flags = classifyCallAttempt(task);
    if (flags.noAnswer) noAnswer.add(guestId);
    if (flags.callback) callback.add(guestId);
  }

  return { noAnswer, callback };
}
