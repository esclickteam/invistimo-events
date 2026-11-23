import assert from "node:assert/strict";
import {
  callbackCarryTaskPatch,
  extraRoundOpenPlan,
  filterGuestsForCallRound,
  getCallRoundAudienceLabel,
  getSourceAudienceByRound,
  isGuestEligibleForCallRound,
  listVisibleHumanCallRounds,
  resolveConfiguredHumanCallRounds,
  resolveMaxCallRounds,
  selectNewCallTaskGuestIds,
  isUntouchedPendingCallTask,
  classifyCallAttempt,
  guestHasNoAnswerOrCallbackHistory,
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

assert.equal(resolveMaxCallRounds({ callsRounds: 4 }), 3);
assert.equal(resolveMaxCallRounds({ callsRounds: 2 }), 2);
assert.equal(resolveConfiguredHumanCallRounds({ callsRounds: 4 }), 4);
assert.equal(resolveConfiguredHumanCallRounds({ callsRounds: 5 }), 5);
assert.equal(resolveConfiguredHumanCallRounds({}), 3);
assert.equal(resolveConfiguredHumanCallRounds({ callsRounds: 0 }), 3);
assert.deepEqual(
  listVisibleHumanCallRounds({ callsRounds: 4, callsType: "human" }),
  [1, 2, 3, 4]
);
assert.deepEqual(listVisibleHumanCallRounds({ callsType: "ivr", callsRounds: 8 }), [
  1, 2, 3,
]);

assert.equal(getCallRoundAudienceLabel(4), "מתלבטים + טרם אישרו + לא ענו");
assert.equal(getSourceAudienceByRound(4), "open_followup");
assert.equal(getSourceAudienceByRound(3), "round_2_no_answer");

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "maybe4", rsvp: "maybe" }),
    round: 4,
  }),
  true
);
assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "wait4", rsvp: "pending" }),
    round: 4,
  }),
  true
);
assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "yes4", rsvp: "yes" }),
    round: 4,
  }),
  false
);
assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "no4", rsvp: "no" }),
    round: 4,
  }),
  false
);
assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "nophone", rsvp: "maybe", phone: "" }),
    round: 5,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "waiting", rsvp: "waiting" }),
    round: 4,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "history-no-answer",
      rsvp: "pending",
      status: "declined",
      callRounds: [
        { roundNumber: 1, answerStatus: "answered", resultStatus: "callback" },
        { roundNumber: 2, answerStatus: "no_answer", resultStatus: "no_answer" },
      ],
      callHistory: [
        { round: 1, status: "no_answer", result: "no_answer" },
        { round: 3, status: "callback", callbackRequested: true },
      ],
    }),
    round: 6,
  }),
  true
);

assert.equal(
  guestHasNoAnswerOrCallbackHistory(
    guest({
      rsvp: "pending",
      callHistory: [
        { status: "no_answer" },
        { status: "pending" },
      ],
    })
  ),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "call-status-only",
      rsvp: undefined,
      status: "no_answer",
      callHistory: [{ status: "אין מענה" }],
    }),
    round: 4,
  }),
  true
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "final-yes",
      rsvp: "yes",
      callHistory: [{ status: "no_answer" }, { status: "callback" }],
    }),
    round: 4,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({
      id: "final-no",
      rsvp: "no",
      status: "no_answer",
      callHistory: [{ status: "callback" }],
    }),
    round: 20,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "too-high", rsvp: "maybe" }),
    round: 21,
  }),
  false
);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ id: "from-tasks", rsvp: "yes" }),
    round: 4,
    earlierNoAnswerGuestIds: new Set(["from-tasks"]),
    earlierCallbackGuestIds: new Set(["from-tasks"]),
  }),
  false
);

const attempt = classifyCallAttempt({
  status: "pending",
  attempts: [
    { status: "no_answer", result: "busy" },
    { status: "callback" },
  ],
});
assert.equal(attempt.noAnswer, true);
assert.equal(attempt.callback, true);

assert.equal(
  isGuestEligibleForCallRound({
    guest: guest({ rsvp: "pending" }),
    round: 3,
  }),
  false
);

const followupGuests = [
  guest({ id: "m", rsvp: "maybe" }),
  guest({ id: "w", rsvp: "pending" }),
  guest({ id: "m", rsvp: "maybe" }),
  guest({ id: "y", rsvp: "yes" }),
  guest({ id: "n", rsvp: "no" }),
];
const round4 = filterGuestsForCallRound({ guests: followupGuests, round: 4 });
assert.deepEqual(
  round4.map((item) => item._id),
  ["m", "w"]
);

const changedBeforeOpen = filterGuestsForCallRound({
  guests: [guest({ id: "was-maybe", rsvp: "yes" })],
  round: 4,
});
assert.equal(changedBeforeOpen.length, 0);

assert.deepEqual(
  selectNewCallTaskGuestIds(["a", "b", "a", "c"], ["b"]),
  ["a", "c"]
);

const waitingPlan = extraRoundOpenPlan({
  round: 4,
  eligibleGuestIds: ["a", "b"],
  existingGuestIds: [],
  employeeCount: 0,
});
assert.equal(waitingPlan.waitingForAssignment, true);
assert.deepEqual(waitingPlan.guestIds, ["a", "b"]);

const duplicatePlan = extraRoundOpenPlan({
  round: 4,
  eligibleGuestIds: ["a"],
  existingGuestIds: ["a"],
  employeeCount: 2,
});
assert.equal(duplicatePlan.skippedAsDuplicate, true);
assert.equal(duplicatePlan.waitingForAssignment, false);
assert.deepEqual(duplicatePlan.guestIds, []);

const round3Plan = extraRoundOpenPlan({
  round: 3,
  eligibleGuestIds: ["a"],
  existingGuestIds: [],
  employeeCount: 0,
});
assert.equal(round3Plan.waitingForAssignment, false);

assert.equal(
  isUntouchedPendingCallTask({ status: "pending", attemptsCount: 0, startedAt: null }),
  true
);
assert.equal(
  isUntouchedPendingCallTask({
    status: "pending",
    attemptsCount: 1,
    startedAt: null,
  }),
  false
);
assert.equal(
  isUntouchedPendingCallTask({ status: "no_answer", attemptsCount: 1 }),
  false
);

console.log("call-round-eligibility.test.ts: ok");
