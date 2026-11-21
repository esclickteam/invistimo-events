import assert from "node:assert/strict";
import {
  CALL_RETRY_POLICY,
  UNANSWERED_MIN_MS,
  canCompleteWorkOrder,
  canHangUpNow,
  evaluateResultSave,
  formatDurationMs,
  mergeAttemptEvents,
  pickQueueHeadId,
  retryDecision,
  type AttemptSnapshot,
} from "../../lib/calls/callAttemptPolicy";

function attempt(partial: Partial<AttemptSnapshot> & { id: string }): AttemptSnapshot {
  return {
    taskId: "task-1",
    startedAt: "2026-11-18T10:00:00.000Z",
    answeredAt: null,
    endedAt: "2026-11-18T10:00:05.000Z",
    durationMs: 5000,
    preciseDuration: true,
    telnyxAnswered: false,
    answerType: "",
    telnyxResult: "",
    sipCode: "",
    hangupCause: "",
    hangupSource: "caller",
    agentHangupRequestedAt: null,
    outcome: "early_hangup",
    ...partial,
  };
}

assert.equal(UNANSWERED_MIN_MS, 20_000);
assert.equal(CALL_RETRY_POLICY.busy.cooldownMs, 180_000);
assert.equal(CALL_RETRY_POLICY.unavailable.cooldownMs, 300_000);
assert.equal(CALL_RETRY_POLICY.technicalFailure.cooldownMs, 120_000);
assert.equal(CALL_RETRY_POLICY.earlyHangup.cooldownMs, 0);
assert.equal(CALL_RETRY_POLICY.combinedUnsuccessful.maxBeforeManager, 5);

for (const seconds of [1, 5, 10, 19]) {
  const saved = evaluateResultSave({
    status: "no_answer",
    isQueueHead: true,
    attempts: [attempt({ id: "a", durationMs: seconds * 1000, outcome: "early_hangup" })],
  });
  assert.equal(saved.ok, false, `no_answer at ${seconds}s`);
}

assert.equal(
  evaluateResultSave({
    status: "no_answer",
    isQueueHead: true,
    attempts: [attempt({
      id: "ok",
      durationMs: 20_000,
      endedAt: "2026-11-18T10:00:20.000Z",
      outcome: "valid_no_answer",
      hangupSource: "callee",
    })],
  }).ok,
  true
);

assert.equal(
  evaluateResultSave({
    status: "confirmed",
    isQueueHead: true,
    attempts: [attempt({
      id: "ans",
      answeredAt: "2026-11-18T10:00:03.000Z",
      durationMs: 30_000,
      telnyxAnswered: true,
      answerType: "unknown",
      outcome: "answered",
    })],
  }).ok,
  true
);

assert.equal(
  evaluateResultSave({
    status: "no_answer",
    isQueueHead: true,
    attempts: [attempt({
      id: "mismatch",
      answeredAt: "2026-11-18T10:00:03.000Z",
      telnyxAnswered: true,
      outcome: "answered",
      durationMs: 12_000,
    })],
  }).ok,
  false
);

assert.equal(
  evaluateResultSave({
    status: "confirmed",
    isQueueHead: false,
    attempts: [attempt({ id: "skip", telnyxAnswered: true, outcome: "answered", answeredAt: "2026-11-18T10:00:03.000Z" })],
  }).ok,
  false
);

assert.equal(
  evaluateResultSave({
    status: "declined",
    isQueueHead: true,
    attempts: [],
  }).ok,
  false
);

const busy = attempt({
  id: "busy",
  outcome: "busy",
  durationMs: 2140,
  endedAt: "2026-11-18T10:00:02.140Z",
  sipCode: "486",
});
const busyDecision = retryDecision([busy], Date.parse("2026-11-18T10:00:30.000Z"));
assert.equal(busyDecision.waiting, true);
assert.equal(busyDecision.manager, false);
assert.equal(
  evaluateResultSave({ status: "no_answer", isQueueHead: true, attempts: [busy] }).ok,
  false
);

const early = Array.from({ length: 3 }, (_, index) =>
  attempt({ id: `e${index}`, outcome: "early_hangup", durationMs: 480 })
);
assert.equal(retryDecision(early, Date.now()).manager, true);
assert.equal(formatDurationMs(480, true), "480 מילישניות");

const head = pickQueueHeadId([
  { id: "b", status: "pending", sortOrder: 2 },
  { id: "a", status: "pending", sortOrder: 1 },
  { id: "c", status: "confirmed", sortOrder: 0 },
]);
assert.equal(head, "a");
assert.equal(
  pickQueueHeadId([
    { id: "agent-2", status: "pending", sortOrder: 1 },
    { id: "agent-1", status: "pending", sortOrder: 1 },
  ]),
  "agent-1"
);

assert.equal(canCompleteWorkOrder({ openTaskCount: 1, missingDialableCount: 0, status: "open" }), false);
assert.equal(canCompleteWorkOrder({ openTaskCount: 0, missingDialableCount: 2, status: "open" }), false);
assert.equal(canCompleteWorkOrder({ openTaskCount: 0, missingDialableCount: 0, status: "completed" }), false);
assert.equal(canCompleteWorkOrder({ openTaskCount: 0, missingDialableCount: 0, status: "open" }), true);

const active = attempt({
  id: "live",
  endedAt: null,
  durationMs: null,
  outcome: "in_progress",
  hangupSource: "",
});
assert.equal(canHangUpNow(active, Date.parse("2026-11-18T10:00:19.000Z")).allowed, false);
assert.equal(canHangUpNow(active, Date.parse("2026-11-18T10:00:25.000Z")).allowed, true);
assert.equal(
  canHangUpNow(
    { ...active, answeredAt: "2026-11-18T10:00:03.000Z", telnyxAnswered: true, outcome: "answered" },
    Date.parse("2026-11-18T10:00:04.000Z")
  ).allowed,
  true
);

const first = mergeAttemptEvents(null, {
  eventId: "evt-1",
  eventType: "call.initiated",
  occurredAt: "2026-11-18T10:00:00.000Z",
  callControlId: "cc-1",
  taskId: "task-1",
});
const duplicate = mergeAttemptEvents(first, {
  eventId: "evt-1",
  eventType: "call.initiated",
  occurredAt: "2026-11-18T10:00:00.000Z",
  callControlId: "cc-1",
  taskId: "task-1",
});
assert.equal(duplicate.eventIds?.length, 1);
const answered = mergeAttemptEvents(first, {
  eventId: "evt-2",
  eventType: "call.answered",
  occurredAt: "2026-11-18T10:00:03.000Z",
  callControlId: "cc-1",
  taskId: "task-1",
});
assert.equal(answered.telnyxAnswered, true);
assert.equal(answered.startedAt, first.startedAt);

console.log("call-attempt-policy.test.ts: ok");
