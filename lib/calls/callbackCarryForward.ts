import type { Types } from "mongoose";

import CallTask from "@/models/CallTask";
import InvitationGuest from "@/models/InvitationGuest";
import {
  extractGuestId,
  isCallbackCarryForwardTask,
} from "@/lib/calls/callRoundEligibility";

/**
 * Latest call task per guest in a previous round.
 * A newer final attendance result replaces an older callback.
 */
export async function loadCallbackGuestIdsByRound(input: {
  invitationId: Types.ObjectId;
  round: 1 | 2;
  workDateLte?: Date;
}) {
  const query: Record<string, unknown> = {
    invitationId: input.invitationId,
    round: input.round,
  };

  if (input.workDateLte) {
    query.workDate = { $lte: input.workDateLte };
  }

  const tasks = await CallTask.find(query)
    .select(
      "guestId invitationGuestId status result callResult answeredResult resultStatus outcome nextRoundReason pendingCallStatus pendingReason updatedAt createdAt"
    )
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const latestByGuest = new Map<string, any>();

  for (const task of tasks) {
    const guestId = extractGuestId(
      (task as any)?.guestId || (task as any)?.invitationGuestId
    );
    if (!guestId || latestByGuest.has(guestId)) continue;
    latestByGuest.set(guestId, task);
  }

  const guestIds = new Set<string>();

  for (const [guestId, task] of latestByGuest) {
    if (isCallbackCarryForwardTask(task)) guestIds.add(guestId);
  }

  return guestIds;
}

export async function countManualHandlingTasks(filter: Record<string, unknown>) {
  return CallTask.countDocuments({
    ...filter,
    status: "callback",
    manualHandlingRequired: true,
  });
}

/**
 * After a next-round task is created, store which round asked for the
 * callback and which round received the guest.
 */
export async function linkCallbackCarryForwardHistory(workOrderId: Types.ObjectId) {
  const tasks = await CallTask.find({
    workOrderId,
    inclusionReason: "callback_next_round",
    callbackFromRound: { $in: [1, 2] },
  })
    .select("_id guestId workOrderId round callbackFromRound")
    .lean();

  if (!tasks.length) return 0;

  const now = new Date();
  const ops = tasks
    .map((task: any) => {
      const guestId = task?.guestId;
      const fromRound = Number(task?.callbackFromRound || 0);
      if (!guestId || (fromRound !== 1 && fromRound !== 2)) return null;

      return {
        updateOne: {
          filter: { _id: guestId },
          update: {
            $set: {
              moveToNextRound: true,
              movedToNextRound: true,
              nextCallRound: task.round,
              nextRound: task.round,
              nextCallTaskId: task._id,
              nextCallWorkOrderId: task.workOrderId,
              movedToNextRoundReason: "callback_next_round",
              movedToNextRoundAt: now,
            },
            $addToSet: {
              callbackTransfers: {
                requestedOnRound: fromRound,
                transferredToRound: task.round,
                transferredToTaskId: String(task._id),
                transferredToWorkOrderId: String(task.workOrderId),
                reason: "callback_next_round",
                at: now,
              },
            },
          },
        },
      };
    })
    .filter(Boolean);

  if (!ops.length) return 0;

  await InvitationGuest.collection.bulkWrite(ops as any[], { ordered: false });

  const roundOps = tasks
    .map((task: any) => {
      const fromRound = Number(task?.callbackFromRound || 0);
      if (!task?.guestId || (fromRound !== 1 && fromRound !== 2)) return null;

      return {
        updateOne: {
          filter: {
            _id: task.guestId,
            "callRounds.roundNumber": fromRound,
          },
          update: {
            $set: {
              "callRounds.$.transferredToRound": task.round,
              "callRounds.$.transferredToTaskId": task._id,
              "callRounds.$.transferredToWorkOrderId": task.workOrderId,
              "callRounds.$.transferredAt": now,
              "callRounds.$.nextRound": task.round,
              "callRounds.$.movedToNextRound": true,
              "callRounds.$.nextRoundReason": "callback_next_round",
            },
          },
        },
      };
    })
    .filter(Boolean);

  if (roundOps.length) {
    await InvitationGuest.collection.bulkWrite(roundOps as any[], {
      ordered: false,
    });
  }

  return ops.length;
}
