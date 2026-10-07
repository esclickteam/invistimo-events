import test from "node:test";
import assert from "node:assert/strict";
import {
  clampCallRoundNumber,
  classifyCallFollowUpFromSources,
  filterGuestsForCallRound,
  getCallRoundAudienceLabel,
  getCarriedFollowUpForRound,
  indexFollowUpsFromCallTasks,
  isGuestEligibleForCallRound,
  nextCallRoundNumber,
  normalizeGuestRsvpForCalls,
  selectMissingGuestsForOpenRound,
  shouldReopenLastRoundFollowUpTask,
} from "../../lib/calls/callRoundEligibility.ts";

function guest(partial) {
  return {
    _id: partial.id || partial._id || "g1",
    phone: "501234567",
    rsvp: "pending",
    callRounds: [],
    ...partial,
  };
}

test("round labels describe the live 3-round audience", () => {
  assert.equal(
    getCallRoundAudienceLabel(1),
    "ממתינים שעדיין לא נתנו תשובה"
  );
  assert.match(getCallRoundAudienceLabel(2), /חזרה בסבב הבא/);
  assert.match(getCallRoundAudienceLabel(3), /מתלבט/);
});

test("there is no round 4 — callbacks stay in round 3", () => {
  assert.equal(clampCallRoundNumber(4), 1);
  assert.equal(nextCallRoundNumber(1), 2);
  assert.equal(nextCallRoundNumber(2), 3);
  assert.equal(nextCallRoundNumber(3), 3);
  assert.equal(nextCallRoundNumber(9), 3);
});

test("needs_fix and wrong_number are not a final attendance answer", () => {
  assert.equal(normalizeGuestRsvpForCalls("needs_fix"), "pending");
  assert.equal(normalizeGuestRsvpForCalls("wrong_number"), "pending");
  assert.equal(normalizeGuestRsvpForCalls("needs_correction"), "pending");
  assert.equal(normalizeGuestRsvpForCalls("דורש תיקון"), "pending");
  assert.equal(normalizeGuestRsvpForCalls("callback"), "pending");
  assert.equal(normalizeGuestRsvpForCalls("yes"), "yes");
  assert.equal(normalizeGuestRsvpForCalls("no"), "no");
  assert.equal(normalizeGuestRsvpForCalls("maybe"), "maybe");
});

test("wrong_number maps to needs_fix follow-up", () => {
  const fromWrongNumber = classifyCallFollowUpFromSources({
    status: "wrong_number",
    result: "wrong_number",
    note: "מספר לא קיים",
  });
  assert.equal(fromWrongNumber?.kind, "needs_fix");
  assert.equal(fromWrongNumber?.note, "מספר לא קיים");

  const fromNeedsFix = classifyCallFollowUpFromSources({
    status: "needs_fix",
    noAnswerResult: "needs_fix",
    resultStatus: "needs_correction",
  });
  assert.equal(fromNeedsFix?.kind, "needs_fix");
});

test("round 1 opens every currently pending guest", () => {
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
      guest: guest({ rsvp: "maybe" }),
      round: 1,
    }),
    false
  );
});

test("1) pending → round 1 callback → appears in round 2", () => {
  const person = guest({
    id: "callback-r1",
    rsvp: "pending",
    callRounds: [
      {
        roundNumber: 1,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
        note: "לבקש לחזור אחרי הצהריים",
      },
    ],
  });

  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 1 }), true);
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 2 }), true);

  const carried = getCarriedFollowUpForRound({ guest: person, round: 2 });
  assert.equal(carried.kind, "callback");
  assert.match(carried.note, /חזרה בסבב הבא/);
  assert.match(carried.note, /לבקש לחזור/);
});

test("2) round 1 callback then round 2 callback → appears in round 3", () => {
  const person = guest({
    id: "callback-r1-r2",
    rsvp: "pending",
    callRounds: [
      {
        roundNumber: 1,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
      },
      {
        roundNumber: 2,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
      },
    ],
  });

  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 2 }), true);
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 3 }), true);
});

test("completing a previous-round task as answered+callback does not block the next round", () => {
  const person = guest({
    id: "answered-callback",
    rsvp: "pending",
  });

  const previousFollowUpByRound = indexFollowUpsFromCallTasks([
    {
      guestId: "answered-callback",
      round: 1,
      status: "callback",
      result: "callback",
      answerStatus: "answered",
      callAnswered: "answered",
      answeredResult: "callback",
      updatedAt: new Date("2026-10-01T10:00:00.000Z"),
    },
  ]);

  assert.equal(
    isGuestEligibleForCallRound({
      guest: person,
      round: 2,
      previousFollowUpByRound,
    }),
    true
  );
});

test("3) needs_fix in round 1 returns in round 2 with the mark and note", () => {
  const person = guest({
    id: "needs-fix-r1",
    rsvp: "pending",
    callRounds: [
      {
        roundNumber: 1,
        answerStatus: "no_answer",
        resultStatus: "needs_correction",
        status: "needs_fix",
        note: "חסרות 2 ספרות",
      },
    ],
  });

  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 2 }), true);

  const carried = getCarriedFollowUpForRound({ guest: person, round: 2 });
  assert.equal(carried.kind, "needs_fix");
  assert.match(carried.note, /דורש תיקון/);
  assert.match(carried.note, /חסרות 2 ספרות/);
});

test("needs_fix stored as RSVP still opens in the next round", () => {
  const person = guest({
    id: "rsvp-needs-fix",
    rsvp: "needs_fix",
    callRounds: [
      {
        roundNumber: 1,
        status: "wrong_number",
        resultStatus: "wrong_number",
      },
    ],
  });

  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 1 }), true);
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 2 }), true);
});

test("4) maybe guests appear in round 3 only", () => {
  const person = guest({ id: "maybe-1", rsvp: "maybe" });
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 1 }), false);
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 2 }), false);
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 3 }), true);
});

test("5) a final yes/no after an old callback is excluded", () => {
  const person = guest({
    id: "old-callback-now-yes",
    rsvp: "yes",
    callRounds: [
      {
        roundNumber: 1,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
      },
    ],
    callbackRequested: true,
  });

  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 2 }), false);
  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 3 }), false);
});

test("6) audience is computed from current RSVP at open time, not the scheduled snapshot", () => {
  const scheduledPendingNowYes = guest({ id: "changed-to-yes", rsvp: "yes" });
  const scheduledYesNowPending = guest({ id: "changed-to-pending", rsvp: "pending" });

  assert.equal(
    isGuestEligibleForCallRound({ guest: scheduledPendingNowYes, round: 1 }),
    false
  );
  assert.equal(
    isGuestEligibleForCallRound({ guest: scheduledYesNowPending, round: 1 }),
    true
  );
  assert.equal(
    isGuestEligibleForCallRound({ guest: scheduledYesNowPending, round: 2 }),
    true
  );
});

test("round 2 includes every currently pending guest, not only no-answer from round 1", () => {
  const neverCalled = guest({ id: "new-pending", rsvp: "pending" });
  assert.equal(
    isGuestEligibleForCallRound({ guest: neverCalled, round: 2 }),
    true
  );
  assert.equal(
    isGuestEligibleForCallRound({ guest: neverCalled, round: 3 }),
    true
  );
});

test("round 3 keeps a same-round callback for treatment and never opens round 4", () => {
  const person = guest({
    id: "round3-callback",
    rsvp: "pending",
    callRounds: [
      {
        roundNumber: 3,
        answerStatus: "answered",
        resultStatus: "callback",
        status: "callback",
      },
    ],
  });

  assert.equal(isGuestEligibleForCallRound({ guest: person, round: 3 }), true);
  assert.equal(nextCallRoundNumber(3), 3);

  assert.equal(
    shouldReopenLastRoundFollowUpTask({
      task: { status: "callback", result: "callback" },
      guest: person,
      round: 3,
    }),
    true
  );
  assert.equal(
    shouldReopenLastRoundFollowUpTask({
      task: { status: "confirmed", result: "confirmed" },
      guest: person,
      round: 3,
    }),
    false
  );
});

test("backfill adds missing eligible guests without resetting treated tasks", () => {
  const guests = [
    guest({ id: "missing-callback", rsvp: "pending" }),
    guest({ id: "already-confirmed", rsvp: "yes" }),
    guest({ id: "already-pending-task", rsvp: "pending" }),
    guest({ id: "maybe-r3", rsvp: "maybe" }),
  ];

  const previousFollowUpByRound = indexFollowUpsFromCallTasks([
    {
      guestId: "missing-callback",
      round: 1,
      status: "callback",
      result: "callback",
      answerStatus: "answered",
      updatedAt: new Date("2026-10-02T08:00:00.000Z"),
    },
    {
      guestId: "already-pending-task",
      round: 1,
      status: "no_answer",
      result: "no_answer",
      updatedAt: new Date("2026-10-02T08:00:00.000Z"),
    },
  ]);

  const missingRound2 = selectMissingGuestsForOpenRound({
    guests,
    round: 2,
    existingGuestIds: ["already-pending-task"],
    previousFollowUpByRound,
  });

  assert.deepEqual(
    missingRound2.map((row) => row._id),
    ["missing-callback"]
  );

  const missingRound3 = selectMissingGuestsForOpenRound({
    guests,
    round: 3,
    existingGuestIds: [],
    previousFollowUpByRound,
  });

  assert.deepEqual(
    missingRound3.map((row) => row._id).sort(),
    ["already-pending-task", "maybe-r3", "missing-callback"]
  );
});

test("filterGuestsForCallRound keeps history-based duplicates out of the same round", () => {
  const guests = [
    guest({ id: "dup", rsvp: "pending" }),
    guest({ id: "dup", rsvp: "pending", phone: "509999999" }),
    guest({ id: "m1", rsvp: "maybe" }),
  ];

  const round3 = filterGuestsForCallRound({ guests, round: 3 });
  assert.equal(round3.length, 2);
  assert.equal(round3[0]._id, "dup");
  assert.equal(round3[1]._id, "m1");
});

test("latest call result wins when indexing previous-round tasks", () => {
  const followUps = indexFollowUpsFromCallTasks([
    {
      guestId: "g-late-yes",
      round: 1,
      status: "callback",
      result: "callback",
      updatedAt: new Date("2026-10-01T08:00:00.000Z"),
    },
    {
      guestId: "g-late-yes",
      round: 1,
      status: "confirmed",
      result: "confirmed",
      updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    },
  ]);

  assert.equal(followUps[1]?.get("g-late-yes") ?? null, null);
});

console.log("call-round-eligibility.test.ts: ok");
