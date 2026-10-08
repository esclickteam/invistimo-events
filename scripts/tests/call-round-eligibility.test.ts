import assert from "node:assert/strict";
import {
  callbackCarryTaskPatch,
  filterGuestsForCallRound,
  isGuestEligibleForCallRound,
  getCallRoundAudienceLabel,
  annotateCallbackCarryForward,
} from "../../lib/calls/callRoundEligibility";

function guest(partial: Record<string, unknown>) {
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
assert.equal(
  getCallRoundAudienceLabel(2),
  "לא ענו בסבב 1 + ביקשו חזרה"
);
assert.equal(
  getCallRoundAudienceLabel(3),
  "לא ענו בסבבים 1–2 + ביקשו חזרה + מתלבטים"
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

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "cb1",
      rsvp: "pending",
      callRounds: [
        {
          roundNumber: 1,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
      ],
    }),
    round: 2,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "cb1-final",
      rsvp: "yes",
      callRounds: [
        {
          roundNumber: 1,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
      ],
    }),
    round: 2,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "cb2",
      rsvp: "pending",
      callRounds: [
        { roundNumber: 1, answerStatus: "no_answer", resultStatus: "no_answer" },
        {
          roundNumber: 2,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
      ],
    }),
    round: 3,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "cb1-only",
      rsvp: "pending",
      callRounds: [
        {
          roundNumber: 1,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
      ],
    }),
    round: 3,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "cb1-na2",
      rsvp: "pending",
      callRounds: [
        {
          roundNumber: 1,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
        { roundNumber: 2, answerStatus: "no_answer", resultStatus: "no_answer" },
      ],
    }),
    round: 3,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "cb2-no",
      rsvp: "no",
      callRounds: [
        {
          roundNumber: 2,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
      ],
    }),
    round: 3,
  }),
  false
);

const callbackDupes = [
  guest({
    id: "same",
    rsvp: "pending",
    callRounds: [
      {
        roundNumber: 1,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
      },
    ],
  }),
  guest({
    id: "same",
    rsvp: "pending",
    callRounds: [
      {
        roundNumber: 1,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
      },
    ],
  }),
];

assert.equal(
  filterGuestsForCallRound({ guests: callbackDupes, round: 2 }).length,
  1
);

const annotated = annotateCallbackCarryForward({
  guests: [
    guest({
      id: "carry",
      rsvp: "pending",
      callRounds: [
        {
          roundNumber: 1,
          answerStatus: "answered",
          resultStatus: "callback",
          status: "callback",
        },
      ],
    }),
  ],
  round: 2,
});
assert.equal(callbackCarryTaskPatch(annotated[0]).callbackFromRound, 1);
assert.equal(
  callbackCarryTaskPatch(annotated[0]).inclusionReason,
  "callback_next_round"
);

console.log("call-round-eligibility.test.ts: ok");
