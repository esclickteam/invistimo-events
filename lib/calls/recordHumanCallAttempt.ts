import mongoose from "mongoose";
import CallAttempt from "@/models/CallAttempt";
import CallTask from "@/models/CallTask";
import {
  hangupInitiatorLabel,
  mergeAttemptEvents,
  retryDecision,
  UNANSWERED_MIN_MS,
  type AttemptSnapshot,
  type TelnyxAttemptEvent,
} from "@/lib/calls/callAttemptPolicy";

function parseClientState(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  const raw = String(value);
  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // ignore
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // keep trying
    }
  }
  return {};
}

function iso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function attemptEventFromPayload(input: {
  eventType: string;
  eventId?: string;
  payload: Record<string, any>;
}): TelnyxAttemptEvent | null {
  const clientState = parseClientState(input.payload.client_state);
  const taskId = String(clientState.taskId || "");
  const callControlId = String(input.payload.call_control_id || "");
  if (!taskId || !callControlId || clientState.source !== "invistimo-softphone-webrtc") {
    return null;
  }
  const occurredAt = iso(input.payload.occurred_at || input.payload.end_time || input.payload.start_time);
  return {
    eventId: String(input.eventId || `${input.eventType}:${callControlId}:${occurredAt || ""}`),
    eventType: input.eventType,
    occurredAt,
    callControlId,
    taskId,
    startedAt: iso(input.payload.start_time),
    answeredAt: input.eventType === "call.answered" ? occurredAt : null,
    endedAt: input.eventType === "call.hangup" ? occurredAt : null,
    sipCode: String(input.payload.sip_hangup_cause || input.payload.hangup_cause || ""),
    hangupCause: String(input.payload.hangup_cause || ""),
    hangupSource: String(input.payload.hangup_source || ""),
    machine:
      input.payload.answering_machine_detection === "machine"
        ? "machine"
        : input.payload.answering_machine_detection === "human"
          ? "human"
          : "",
  };
}

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

export async function recordHumanAttemptFromWebhook(input: {
  eventType: string;
  eventId?: string;
  payload: Record<string, any>;
}) {
  const event = attemptEventFromPayload(input);
  if (!event || !mongoose.Types.ObjectId.isValid(event.taskId)) return null;

  const existingDoc = await CallAttempt.findOne({ callControlId: event.callControlId }).lean();
  const existing: AttemptSnapshot | null = existingDoc
    ? {
        id: String((existingDoc as any).callControlId),
        taskId: String((existingDoc as any).taskId),
        eventIds: (existingDoc as any).eventIds || [],
        startedAt: (existingDoc as any).startedAt ? new Date((existingDoc as any).startedAt).toISOString() : null,
        answeredAt: (existingDoc as any).answeredAt ? new Date((existingDoc as any).answeredAt).toISOString() : null,
        endedAt: (existingDoc as any).endedAt ? new Date((existingDoc as any).endedAt).toISOString() : null,
        durationMs: (existingDoc as any).durationMs ?? null,
        preciseDuration: Boolean((existingDoc as any).preciseDuration),
        telnyxAnswered: Boolean((existingDoc as any).telnyxAnswered),
        answerType: (existingDoc as any).answerType || "",
        telnyxResult: (existingDoc as any).telnyxResult || "",
        sipCode: (existingDoc as any).sipCode || "",
        hangupCause: (existingDoc as any).hangupCause || "",
        hangupSource: (existingDoc as any).hangupSource || "",
        agentHangupRequestedAt: (existingDoc as any).agentHangupRequestedAt
          ? new Date((existingDoc as any).agentHangupRequestedAt).toISOString()
          : null,
        outcome: (existingDoc as any).outcome || "awaiting_provider",
      }
    : null;

  const merged = mergeAttemptEvents(existing, event);
  if (existing && existing.eventIds?.includes(event.eventId)) return existing;

  const task = await CallTask.findById(event.taskId).lean();
  const ringMs =
    merged.startedAt && merged.answeredAt
      ? Date.parse(merged.answeredAt) - Date.parse(merged.startedAt)
      : null;
  const talkMs =
    merged.answeredAt && merged.endedAt
      ? Date.parse(merged.endedAt) - Date.parse(merged.answeredAt)
      : null;

  await CallAttempt.updateOne(
    { callControlId: event.callControlId },
    {
      $set: {
        taskId: new mongoose.Types.ObjectId(event.taskId),
        invitationId: (task as any)?.invitationId || null,
        guestId: (task as any)?.guestId || null,
        workOrderId: (task as any)?.workOrderId || null,
        round: (task as any)?.round || null,
        guestName: (task as any)?.guestName || "",
        guestPhone: (task as any)?.guestPhone || "",
        employeeId: String((task as any)?.assignedToEmployeeId || ""),
        employeeName: (task as any)?.employeeName || "",
        startedAt: toDate(merged.startedAt),
        answeredAt: toDate(merged.answeredAt),
        endedAt: toDate(merged.endedAt),
        durationMs: merged.durationMs,
        ringMs,
        talkMs,
        preciseDuration: merged.preciseDuration,
        telnyxAnswered: merged.telnyxAnswered,
        answerType: merged.answerType,
        telnyxResult: merged.telnyxResult,
        sipCode: merged.sipCode,
        hangupCause: merged.hangupCause,
        hangupSource: merged.hangupSource,
        hangupInitiator: hangupInitiatorLabel(merged),
        outcome: merged.outcome,
        meetsMinimum:
          merged.outcome === "answered" ||
          (merged.outcome === "valid_no_answer" && (merged.durationMs || 0) >= UNANSWERED_MIN_MS),
        eventIds: merged.eventIds,
      },
      $push: {
        rawEvents: {
          eventId: event.eventId,
          eventType: event.eventType,
          at: event.occurredAt,
        },
      },
    },
    { upsert: true }
  );

  if (task && ["pending", "in_progress"].includes(String((task as any).status || ""))) {
    const attempts = await CallAttempt.find({ taskId: task._id }).lean();
    const snapshots: AttemptSnapshot[] = attempts.map((row: any) => ({
      id: String(row.callControlId),
      taskId: String(row.taskId),
      startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
      answeredAt: row.answeredAt ? new Date(row.answeredAt).toISOString() : null,
      endedAt: row.endedAt ? new Date(row.endedAt).toISOString() : null,
      durationMs: row.durationMs ?? null,
      preciseDuration: Boolean(row.preciseDuration),
      telnyxAnswered: Boolean(row.telnyxAnswered),
      answerType: row.answerType || "",
      telnyxResult: row.telnyxResult || "",
      sipCode: row.sipCode || "",
      hangupCause: row.hangupCause || "",
      hangupSource: row.hangupSource || "",
      agentHangupRequestedAt: row.agentHangupRequestedAt
        ? new Date(row.agentHangupRequestedAt).toISOString()
        : null,
      outcome: row.outcome,
    }));
    const decision = retryDecision(snapshots, Date.now());
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (decision.retryAt) update.retryNotBefore = new Date(decision.retryAt);
    if (decision.manager) {
      update.managerException = true;
      update.managerExceptionReason = decision.reason;
      update.managerExceptionAt = new Date();
    }
    await CallTask.updateOne({ _id: (task as any)._id }, { $set: update });
  }

  return merged;
}
