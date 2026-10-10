/**
 * Rescheduled IVR rounds must dial again — old attempts cannot mark the
 * round done or skip guests. No live dials.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildNextIvrRoundSchedule,
  createIvrRoundRunId,
} from "../../lib/calls/ivrRoundSchedule";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("schedule change mints a new runId and resets terminal status", () => {
  const existing = [
    {
      roundNumber: 1,
      scheduledAt: new Date("2026-10-10T00:06:00.000Z"),
      status: "done",
      runId: "old-run-1",
      dialClaimedAt: new Date(),
      failureReason: "stale",
    },
    {
      roundNumber: 2,
      scheduledAt: new Date("2026-10-10T06:28:00.000Z"),
      status: "cancelled",
      runId: "old-run-2",
    },
    { roundNumber: 3, scheduledAt: null, status: "cancelled", runId: "" },
  ];

  const { rounds, changedRounds } = buildNextIvrRoundSchedule({
    incomingRounds: [
      // Round 1: new wall-clock vs existing 00:06Z
      { roundNumber: 1, scheduledAt: "2026-10-10T09:25" },
      // Round 2: same Israel instant as 06:28Z — still reschedule via status
      {
        roundNumber: 2,
        scheduledAt: "2026-10-10T09:28",
        status: "scheduled",
      },
      { roundNumber: 3, scheduledAt: "" },
    ],
    existingRounds: existing,
    now: new Date("2026-10-10T06:30:00.000Z"),
  });

  assert.deepEqual(changedRounds.sort(), [1, 2]);
  assert.equal(rounds[0].status, "scheduled");
  assert.equal(rounds[1].status, "scheduled");
  assert.notEqual(rounds[0].runId, "old-run-1");
  assert.notEqual(rounds[1].runId, "old-run-2");
  assert.ok(rounds[0].runId.startsWith("r1_"));
  assert.ok(rounds[1].runId.startsWith("r2_"));
  assert.equal(rounds[0].dialClaimedAt, null);
  assert.equal(rounds[0].failureReason, "");
  assert.equal(rounds[2].status, "cancelled");
});

test("same wall-clock without explicit status keeps cancelled", () => {
  const at = new Date("2026-10-10T06:28:00.000Z");
  const { rounds, changedRounds } = buildNextIvrRoundSchedule({
    incomingRounds: [{ roundNumber: 2, scheduledAt: "2026-10-10T09:28" }],
    existingRounds: [
      {
        roundNumber: 2,
        scheduledAt: at,
        status: "cancelled",
        runId: "keep-cancelled",
      },
    ],
  });
  assert.deepEqual(changedRounds, []);
  assert.equal(rounds[1].status, "cancelled");
  assert.equal(rounds[1].runId, "keep-cancelled");
});

test("unchanged schedule preserves done status and runId", () => {
  const at = new Date("2026-10-10T06:25:00.000Z");
  const { rounds, changedRounds } = buildNextIvrRoundSchedule({
    incomingRounds: [{ roundNumber: 1, scheduledAt: at.toISOString() }],
    existingRounds: [
      {
        roundNumber: 1,
        scheduledAt: at,
        status: "done",
        runId: "keep-me",
      },
    ],
  });
  assert.deepEqual(changedRounds, []);
  assert.equal(rounds[0].status, "done");
  assert.equal(rounds[0].runId, "keep-me");
});

test("createIvrRoundRunId is unique per call", () => {
  const a = createIvrRoundRunId(1);
  const b = createIvrRoundRunId(1);
  assert.notEqual(a, b);
  assert.match(a, /^r1_/);
});

test("admin and client schedule share buildNextIvrRoundSchedule", () => {
  const client = readSrc("app/api/ivr/schedule/route.ts");
  const admin = readSrc("app/api/admin/users/[id]/ivr-rounds/route.ts");
  assert.match(client, /buildNextIvrRoundSchedule/);
  assert.match(admin, /buildNextIvrRoundSchedule/);
  assert.match(client, /executable/);
  assert.match(admin, /executable/);
});

test("dialer scopes attempts by runId and mints runId on reopen", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /createIvrRoundRunId/);
  assert.match(dialer, /runId/);
  // already_attempted lookup must include runId when present.
  const existingLookup = dialer.slice(
    dialer.indexOf("const existing = runId"),
    dialer.indexOf("if (!phone || !isDialableE164")
  );
  assert.match(existingLookup, /runId/);
  assert.match(dialer, /runId: hasSchedule \? createIvrRoundRunId\(round\)/);
});

test("stats filter attempts by current runId", () => {
  const stats = readSrc("app/api/ivr/rounds/stats/route.ts");
  assert.match(stats, /runId/);
  assert.match(stats, /scheduleRound\?\.runId/);
  assert.match(stats, /attemptRunId === runId/);
  assert.match(stats, /return !attemptRunId/);
});

test("cron remains minute-level Asia/Jerusalem due check", () => {
  const cron = readSrc("app/api/cron/ivr-dial/route.ts");
  const vercel = readSrc("vercel.json");
  assert.match(cron, /listDueIvrRounds/);
  assert.match(cron, /getCallRoundDateKeyInIsrael/);
  assert.match(vercel, /\/api\/cron\/ivr-dial/);
  assert.match(vercel, /\* \* \* \* \*/);
});

test("final RSVP guests stay ineligible across new runIds", () => {
  const elig = readSrc("lib/calls/ivrRoundEligibility.ts");
  assert.match(elig, /isFinalRsvp/);
  assert.match(elig, /return false/);
  assert.match(elig, /round === 1 \|\| round === 2/);
  assert.match(elig, /pending/);
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /isGuestEligibleForIvrRound/);
  assert.match(dialer, /filterGuestsForIvrRound/);
});

test("claimRound and live legs block parallel reopen/execute", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /async function claimRound/);
  assert.match(dialer, /ROUND_ALREADY_RUNNING/);
  assert.match(dialer, /dialClaimedAt/);
  assert.match(dialer, /earlierRoundStillRunning/);
});

test("blocked dials mark failed not done", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /החיוג נחסם או נכשל/);
  assert.match(dialer, /Never mark a round "done" when no real dial was placed/);
  assert.match(dialer, /if \(anyPlaced\) \{\n\s*status = "done";/);
});

test("IVR report separates current run from history via runId", () => {
  const report = readSrc("lib/calls/ivrCallReportQuery.ts");
  assert.match(report, /ivrAttemptRunMatch/);
  assert.match(report, /currentIvrRunsFilter/);
  assert.match(report, /runScope\?: "current" \| "all"/);
  assert.match(report, /runId: String\(row\.runId/);
  assert.match(report, /ivrAttemptRunMatch\(/);
});

test("schedule and reopen never delete attempts or RSVP", () => {
  const schedule = readSrc("lib/calls/ivrRoundSchedule.ts");
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.equal(schedule.includes("deleteMany"), false);
  assert.equal(schedule.includes("InvitationGuest"), false);
  assert.match(dialer, /Attempts and guest RSVP stay intact/);
  assert.equal(
    dialer.includes("IvrCallAttempt.deleteMany"),
    false
  );
});
