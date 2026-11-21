import assert from "node:assert/strict";
import { getCallRoundWaitingStats } from "../../lib/calls/callRoundWaitingStats";

function guest(partial: Record<string, unknown>) {
  return {
    _id: partial.id || "g1",
    phone: "501234567",
    rsvp: "pending",
    callRounds: [],
    ...partial,
  };
}

const guests = [
  guest({ id: "pending-only" }),
  guest({
    id: "no-answer-r1",
    callRounds: [
      { roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" },
    ],
  }),
  guest({
    id: "callback-r1",
    callRounds: [
      { roundNumber: 1, answerStatus: "answered", resultStatus: "callback" },
    ],
  }),
  guest({ id: "already-yes", rsvp: "yes" }),
  guest({
    id: "round2-done",
    callRounds: [
      { roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" },
      { roundNumber: 2, answerStatus: "answered", resultStatus: "confirmed" },
    ],
  }),
];

const round1 = getCallRoundWaitingStats({ guests, round: 1 });
// Only guests without a round-1 phone result and still pending RSVP.
assert.equal(round1.pendingRsvpTotal, 1);
assert.equal(round1.guestsWaiting, 1);
assert.equal(round1.guestsDone, 3);

const round2 = getCallRoundWaitingStats({ guests, round: 2 });
// Legacy inflated metric: still-pending RSVP without round-2 phone result.
assert.equal(round2.pendingRsvpTotal, 3);
// Real dial list: no_answer / callback from round 1, still pending, not done on round 2.
assert.equal(round2.guestsWaiting, 3);
assert.equal(round2.eligibleTotal, 4);
assert.equal(round2.guestsDone, 1);

const round2FromTasks = getCallRoundWaitingStats({
  guests: [
    guest({ id: "a" }),
    guest({ id: "b" }),
    guest({ id: "c", rsvp: "yes" }),
  ],
  round: 2,
  previousNoAnswerByRound: {
    1: new Set(["a"]),
  },
  previousCallbackByRound: {
    1: new Set(["b"]),
  },
});
assert.equal(round2FromTasks.pendingRsvpTotal, 2);
assert.equal(round2FromTasks.guestsWaiting, 2);

console.log("call-round-waiting-stats.test.ts: ok");
