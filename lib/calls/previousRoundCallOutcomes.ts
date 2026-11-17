/**
 * Load prior-round no-answer / callback guest ids from CallTask rows.
 * Used by admin stats and work-order open so both see the same dial list.
 */

import { Types } from "mongoose";
import CallTask from "@/models/CallTask";
import {
  isNoAnswerCallResult,
  normalizeCallAnswerFromSources,
} from "@/lib/calls/callRoundEligibility";
import { loadCallbackGuestIdsByRound } from "@/lib/calls/callbackCarryForward";

function extractIdString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && (value as any)._bsontype === "ObjectId") {
    return String(value);
  }
  if (typeof value === "object" && (value as any)._id) {
    return extractIdString((value as any)._id);
  }
  return String(value);
}

function toObjectId(value: unknown): Types.ObjectId | null {
  const raw = extractIdString(value);
  if (!raw || !Types.ObjectId.isValid(raw)) return null;
  return new Types.ObjectId(raw);
}

export async function loadNoAnswerGuestIdsByRound(input: {
  invitationId: string | Types.ObjectId;
  round: 1 | 2;
  workDateLte: Date;
}): Promise<Set<string>> {
  const invitationObjectId = toObjectId(input.invitationId);
  if (!invitationObjectId) return new Set();

  const previousRoundTasks = await CallTask.find({
    invitationId: invitationObjectId,
    round: input.round,
    workDate: { $lte: input.workDateLte },
  })
    .select(
      "guestId invitationGuestId status result callResult outcome callStatus answerStatus callAnswered noAnswerResult updatedAt createdAt"
    )
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const latestTaskByGuestId = new Map<string, any>();

  for (const task of previousRoundTasks) {
    const guestId = extractIdString(
      (task as any)?.guestId || (task as any)?.invitationGuestId
    );
    if (!guestId) continue;
    if (!latestTaskByGuestId.has(guestId)) {
      latestTaskByGuestId.set(guestId, task);
    }
  }

  const guestIds = new Set<string>();

  for (const [guestId, task] of latestTaskByGuestId.entries()) {
    const answer = normalizeCallAnswerFromSources({
      answerStatus: task?.answerStatus,
      callAnswered: task?.callAnswered,
      result: task?.result,
      callResult: task?.callResult,
      status: task?.status,
      outcome: task?.outcome,
      callStatus: task?.callStatus,
      noAnswerResult: task?.noAnswerResult,
    });

    const resultToken =
      task?.result ||
      task?.callResult ||
      task?.status ||
      task?.outcome ||
      task?.callStatus ||
      "";

    if (answer === "no_answer" || isNoAnswerCallResult(resultToken)) {
      guestIds.add(guestId);
    }
  }

  return guestIds;
}

export async function loadPreviousRoundOutcomeSets(input: {
  invitationId: string | Types.ObjectId;
  round: number;
  workDateLte: Date;
}): Promise<{
  previousNoAnswerByRound: Partial<Record<1 | 2, Set<string>>>;
  previousCallbackByRound: Partial<Record<1 | 2, Set<string>>>;
}> {
  const previousNoAnswerByRound: Partial<Record<1 | 2, Set<string>>> = {};
  const previousCallbackByRound: Partial<Record<1 | 2, Set<string>>> = {};
  const invitationObjectId = toObjectId(input.invitationId);

  if (!invitationObjectId) {
    return { previousNoAnswerByRound, previousCallbackByRound };
  }

  if (input.round === 2 || input.round === 3) {
    previousNoAnswerByRound[1] = await loadNoAnswerGuestIdsByRound({
      invitationId: invitationObjectId,
      round: 1,
      workDateLte: input.workDateLte,
    });
    previousCallbackByRound[1] = await loadCallbackGuestIdsByRound({
      invitationId: invitationObjectId,
      round: 1,
      workDateLte: input.workDateLte,
    });
  }

  if (input.round === 3) {
    previousNoAnswerByRound[2] = await loadNoAnswerGuestIdsByRound({
      invitationId: invitationObjectId,
      round: 2,
      workDateLte: input.workDateLte,
    });
    previousCallbackByRound[2] = await loadCallbackGuestIdsByRound({
      invitationId: invitationObjectId,
      round: 2,
      workDateLte: input.workDateLte,
    });
  }

  return { previousNoAnswerByRound, previousCallbackByRound };
}
