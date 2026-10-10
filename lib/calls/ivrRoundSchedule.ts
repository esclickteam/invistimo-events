/**
 * Shared IVR round schedule apply for client (/api/ivr/schedule) and admin.
 * One path — mint a new runId whenever the wall-clock schedule changes so
 * cron/execute can dial again without treating old attempts as the current run.
 */

import { randomBytes } from "crypto";
import {
  normalizeCallRoundScheduledAtForSave,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";

export type IvrScheduleRoundInput = {
  roundNumber?: number;
  round?: number;
  title?: string;
  scheduledAt?: string | Date | null;
  notes?: string;
  status?: string;
};

export type IvrScheduleRoundDoc = {
  roundNumber: number;
  title: string;
  scheduledAt: Date | null;
  callType: "ivr";
  status: string;
  notes: string;
  failureReason: string;
  dialClaimedAt: Date | null;
  openedAt: Date | null;
  tasksCreated: number | null;
  eligibleCount?: number | null;
  /** Unique id for this schedule execution — separates history from the next dial. */
  runId: string;
  updatedAt: Date;
  createdAt: Date;
};

export function createIvrRoundRunId(roundNumber: number) {
  return `r${roundNumber}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

function asRoundNumber(value: unknown) {
  return Number((value as any)?.roundNumber ?? (value as any)?.round ?? 0);
}

/**
 * Build the next three-round schedule document.
 * - scheduleChanged → status scheduled|cancelled, new runId, clear claim/failure
 * - schedule unchanged → keep status/runId (including done/cancelled)
 */
export function buildNextIvrRoundSchedule(input: {
  incomingRounds: IvrScheduleRoundInput[];
  existingRounds: any[];
  now?: Date;
}): {
  rounds: IvrScheduleRoundDoc[];
  changedRounds: number[];
} {
  const now = input.now || new Date();
  const changedRounds: number[] = [];

  const rounds = [1, 2, 3].map((roundNumber) => {
    const incoming = input.incomingRounds.find(
      (r) => asRoundNumber(r) === roundNumber
    );
    const existing = input.existingRounds.find(
      (r) => asRoundNumber(r) === roundNumber
    );

    const scheduledAtIso = normalizeCallRoundScheduledAtForSave(
      (incoming?.scheduledAt as string | null | undefined) ??
        existing?.scheduledAt ??
        null
    );
    const scheduledAt = scheduledAtIso
      ? parseCallRoundScheduledAt(scheduledAtIso)
      : null;

    const previousScheduled = existing?.scheduledAt
      ? new Date(existing.scheduledAt).getTime()
      : null;
    const nextScheduled = scheduledAt ? scheduledAt.getTime() : null;
    const scheduleChanged = previousScheduled !== nextScheduled;

    const existingStatus = String(existing?.status || "")
      .trim()
      .toLowerCase();
    const existingTerminal = [
      "done",
      "completed",
      "failed",
      "cancelled",
      "canceled",
    ].includes(existingStatus);
    const incomingStatus = String(incoming?.status || "")
      .trim()
      .toLowerCase();
    // Same wall-clock on a done/cancelled round must still open a new run when
    // the client/admin explicitly asks for status=scheduled (re-schedule intent).
    const explicitReschedule =
      Boolean(scheduledAt) &&
      existingTerminal &&
      incomingStatus === "scheduled";
    const resetExecution = scheduleChanged || explicitReschedule;

    if (resetExecution) changedRounds.push(roundNumber);

    const existingRunId = String(existing?.runId || "").trim();
    const nextRunId = resetExecution
      ? scheduledAt
        ? createIvrRoundRunId(roundNumber)
        : ""
      : existingRunId || (scheduledAt ? createIvrRoundRunId(roundNumber) : "");

    const nextStatus = resetExecution
      ? scheduledAt
        ? "scheduled"
        : "cancelled"
      : String(existing?.status || "") ||
        (scheduledAt ? "scheduled" : "draft");

    return {
      roundNumber,
      title:
        String(incoming?.title || existing?.title || "").trim() ||
        `סבב מוקלט ${roundNumber}`,
      scheduledAt,
      callType: "ivr" as const,
      status: nextStatus,
      notes: String(incoming?.notes || existing?.notes || ""),
      failureReason: resetExecution ? "" : String(existing?.failureReason || ""),
      dialClaimedAt: resetExecution ? null : existing?.dialClaimedAt || null,
      openedAt: resetExecution ? null : existing?.openedAt || null,
      tasksCreated: resetExecution ? null : existing?.tasksCreated ?? null,
      eligibleCount: resetExecution ? null : existing?.eligibleCount ?? null,
      runId: nextRunId,
      updatedAt: now,
      createdAt: existing?.createdAt ? new Date(existing.createdAt) : now,
    };
  });

  return { rounds, changedRounds };
}
