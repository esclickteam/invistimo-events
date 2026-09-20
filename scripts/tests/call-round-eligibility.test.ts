import assert from "node:assert/strict";
import {
  filterGuestsForCallRound,
  isGuestEligibleForCallRound,
  getCallRoundAudienceLabel,
} from "../../lib/calls/callRoundEligibility.ts";

function guest(partial) {
  return {
    _id: partial.id || "g1",
    phone: "501234567",
    rsvp: "pending",
    callRounds: [],
    ...partial,
  };
}

assert.equal(
  getCallRoundAudienceLabel(1),
  "ממתינים שעדיין לא נתנו תשובה"
);
assert.equal(getCallRoundAudienceLabel(2), "לא ענו בסבב 1");
assert.equal(
  getCallRoundAudienceLabel(3),
  "לא ענו בסבבים 1–2 + מתלבטים"
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ rsvp: "pending" }),
    round: 1,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ rsvp: "yes" }),
    round: 1,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      rsvp: "pending",
      callRounds: [{ roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" }],
    }),
    round: 2,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      rsvp: "yes",
      callRounds: [{ roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" }],
    }),
    round: 2,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ rsvp: "maybe" }),
    round: 3,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "both",
      rsvp: "maybe",
      callRounds: [
        { roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" },
        { roundNumber: 2, answerStatus: "no_answer", resultStatus: "no_answer" },
      ],
    }),
    round: 3,
  }),
  true
);

const maybeAndPending = [
  guest({
    id: "p1",
    rsvp: "pending",
    callRounds: [
      { roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" },
      { roundNumber: 2, answerStatus: "no_answer", resultStatus: "no_answer" },
    ],
  }),
  guest({ id: "m1", rsvp: "maybe" }),
  guest({
    id: "dup",
    rsvp: "maybe",
    callRounds: [
      { roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" },
      { roundNumber: 2, answerStatus: "no_answer", resultStatus: "no_answer" },
    ],
  }),
];

const round3 = filterGuestsForCallRound({ guests: maybeAndPending, round: 3 });
assert.equal(round3.length, 3);

console.log("call-round-eligibility.test.ts: ok");
