import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReopenedRsvpRoundState,
  buildRsvpRoundSentMarkState,
  getRsvpRoundSentSnapshot,
} from "../../lib/rsvpRoundState";

test("sent round is locked by active sentAt and rsvpRoundsSent", () => {
  const invitation = {
    rsvpRoundSent: {
      round1: {
        executionId: "exec-1",
        channel: "sms",
        sentAt: "2026-01-10T10:00:00.000Z",
        sentCount: 12,
      },
    },
    rsvpRoundsSent: {
      round1: {
        channel: "sms",
        sentAt: "2026-01-10T10:00:00.000Z",
      },
    },
  };

  const snapshot = getRsvpRoundSentSnapshot(invitation, 1);
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.reopened, false);
  assert.equal(snapshot.channel, "sms");
});

test("legacy rsvpRoundsSent alone still locks before reopen", () => {
  const invitation = {
    rsvpRoundsSent: {
      round1: {
        channel: "whatsapp",
        sentAt: "2026-01-11T08:00:00.000Z",
      },
    },
  };

  const snapshot = getRsvpRoundSentSnapshot(invitation, 1);
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.channel, "whatsapp");
});

test("admin reopen archives previous send and unlocks active execution", () => {
  const invitation = {
    rsvpRoundSent: {
      round1: {
        executionId: "exec-original",
        channel: "sms",
        sentAt: "2026-01-10T10:00:00.000Z",
        sentCount: 20,
        source: "scheduled",
      },
    },
    rsvpRoundsSent: {
      round1: {
        channel: "sms",
        sentAt: "2026-01-10T10:00:00.000Z",
      },
    },
    rsvpRound1SentAt: "2026-01-10T10:00:00.000Z",
    rsvpSmsRound1SentAt: "2026-01-10T10:00:00.000Z",
  };

  const built = buildReopenedRsvpRoundState({
    invitation,
    round: 1,
    now: new Date("2026-03-01T12:00:00.000Z"),
    executionIdFactory: () => "exec-reopen-1",
  });

  assert.equal(built.newExecutionId, "exec-reopen-1");
  assert.equal(built.archivedExecutions, 1);
  assert.equal(built.activeState.sentAt, null);
  assert.equal(built.activeState.channel, null);
  assert.equal(String(built.activeState.reopenedAt), String(new Date("2026-03-01T12:00:00.000Z")));
  assert.equal(built.activeState.executions?.[0]?.executionId, "exec-original");
  assert.ok(built.legacyUnsetFields.includes("rsvpRoundsSent.round1") === false);
  assert.ok(built.legacyUnsetFields.includes("rsvpRound1SentAt"));
  assert.ok(built.legacyUnsetFields.includes("rsvpSmsRound1SentAt"));

  const afterReopenInvitation = {
    rsvpRoundSent: {
      round1: built.activeState,
    },
    // זה מה שהיה חוסם לפני התיקון אם נשאר אחרי unset חלקי
    rsvpRoundsSent: {
      round1: {
        channel: "sms",
        sentAt: "2026-01-10T10:00:00.000Z",
      },
    },
    rsvpRound1SentAt: "2026-01-10T10:00:00.000Z",
  };

  const snapshot = getRsvpRoundSentSnapshot(afterReopenInvitation, 1);
  assert.equal(snapshot.done, false);
  assert.equal(snapshot.reopened, true);
  assert.equal(snapshot.originalSentAt, "2026-01-10T10:00:00.000Z");
  assert.equal(snapshot.executionId, "exec-reopen-1");
});

test("marking a resend preserves prior executions history", () => {
  const invitation = {
    rsvpRoundSent: {
      round1: {
        executionId: "exec-reopen-1",
        channel: null,
        sentAt: null,
        sentCount: 0,
        reopenedAt: "2026-03-01T12:00:00.000Z",
        reopenCount: 1,
        executions: [
          {
            executionId: "exec-original",
            channel: "sms",
            sentAt: "2026-01-10T10:00:00.000Z",
            sentCount: 20,
            closedAt: "2026-03-01T12:00:00.000Z",
            closedReason: "admin_reopen",
          },
        ],
      },
    },
  };

  assert.equal(getRsvpRoundSentSnapshot(invitation, 1).done, false);

  const marked = buildRsvpRoundSentMarkState({
    invitation,
    round: 1,
    channel: "whatsapp",
    sentCount: 8,
    source: "scheduled",
    now: new Date("2026-03-02T09:30:00.000Z"),
  });

  assert.equal(marked.executionId, "exec-reopen-1");
  assert.equal(marked.channel, "whatsapp");
  assert.equal(marked.sentCount, 8);
  assert.equal(marked.executions?.length, 1);
  assert.equal(marked.executions?.[0]?.executionId, "exec-original");

  const afterSend = {
    rsvpRoundSent: { round1: marked },
  };

  const snapshot = getRsvpRoundSentSnapshot(afterSend, 1);
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.reopened, false);
  assert.equal(snapshot.channel, "whatsapp");
  assert.equal(snapshot.originalSentAt, "2026-01-10T10:00:00.000Z");
});

test("duplicate prevention only locks the active execution", () => {
  const invitation = {
    rsvpRoundSent: {
      round2: {
        executionId: "exec-2b",
        channel: "sms",
        sentAt: "2026-04-01T10:00:00.000Z",
        reopenCount: 1,
        executions: [
          {
            executionId: "exec-2a",
            channel: "whatsapp",
            sentAt: "2026-02-01T10:00:00.000Z",
            closedReason: "admin_reopen",
          },
        ],
      },
    },
  };

  const snapshot = getRsvpRoundSentSnapshot(invitation, 2);
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.executionId, "exec-2b");
  assert.equal(snapshot.executions.length, 1);
});

test("all three rounds support reopen unlock independently", () => {
  for (const round of [1, 2, 3] as const) {
    const invitation = {
      rsvpRoundSent: {
        [`round${round}`]: {
          executionId: `exec-${round}`,
          channel: "sms",
          sentAt: "2026-01-01T00:00:00.000Z",
          sentCount: 3,
        },
      },
      rsvpRoundsSent: {
        [`round${round}`]: {
          channel: "sms",
          sentAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    assert.equal(getRsvpRoundSentSnapshot(invitation, round).done, true);

    const built = buildReopenedRsvpRoundState({
      invitation,
      round,
      executionIdFactory: () => `exec-${round}-reopen`,
    });

    const after = {
      rsvpRoundSent: {
        [`round${round}`]: built.activeState,
      },
      rsvpRoundsSent: {
        [`round${round}`]: {
          channel: null,
          sentAt: null,
        },
      },
    };

    const snapshot = getRsvpRoundSentSnapshot(after, round);
    assert.equal(snapshot.done, false);
    assert.equal(snapshot.reopened, true);
    assert.equal(snapshot.executionId, `exec-${round}-reopen`);
  }
});
