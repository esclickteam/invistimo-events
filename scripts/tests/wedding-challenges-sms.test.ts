import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  claimOpeningSmsFilter,
  dueWeddingChallengesSmsFilter,
  finalizeOpeningSmsBatch,
  openingSmsQuotaRemaining,
  weddingChallengesSmsErrorBody,
} from "../../lib/weddingChallenges/openingSms";
import { attendingGuestMongoFilter } from "../../lib/weddingChallenges/sourceType";
import { wallTimeInZoneToUtc, utcToWallTimeInput } from "../../lib/weddingChallenges/timezone";
import { isSendableSmsPhone } from "../../lib/sendSMS";

test("failed or empty SMS batches never set smsSentAt", () => {
  const empty = finalizeOpeningSmsBatch({
    sent: 0,
    failed: 3,
    skipped: 0,
    total: 3,
    lastProviderError: "SMS4Free send failed",
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.status, "failed");
  assert.equal(empty.sentAt, null);
  assert.equal(empty.sentCount, 0);
  assert.equal(empty.code, "SEND_FAILED");

  const noGuests = finalizeOpeningSmsBatch({
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  });
  assert.equal(noGuests.code, "NO_ELIGIBLE_GUESTS");
  assert.equal(noGuests.sentAt, null);

  const invalidOnly = finalizeOpeningSmsBatch({
    sent: 0,
    failed: 0,
    skipped: 4,
    total: 4,
  });
  assert.equal(invalidOnly.code, "NO_VALID_RECIPIENTS");
  assert.equal(invalidOnly.sentAt, null);

  const success = finalizeOpeningSmsBatch({
    sent: 2,
    failed: 1,
    skipped: 1,
    total: 4,
  });
  assert.equal(success.ok, true);
  assert.equal(success.status, "sent");
  assert.ok(success.sentAt instanceof Date);
  assert.equal(success.sentCount, 2);
});

test("game-only Wedding Challenges accounts are not blocked by maxMessages=0", () => {
  assert.equal(
    openingSmsQuotaRemaining({ maxMessages: 0, smsUsed: 0, weddingChallengesOnly: true }),
    2400
  );
  assert.ok(
    openingSmsQuotaRemaining({
      maxMessages: 0,
      smsUsed: 0,
      accessModules: { weddingChallenges: true },
    }) > 0
  );
  assert.equal(
    openingSmsQuotaRemaining({ maxMessages: 10, smsUsed: 4, weddingChallengesOnly: false }),
    6
  );
});

test("SMS API errors are structured with error, code, and details", () => {
  const body = weddingChallengesSmsErrorBody("SCHEDULE_IN_PAST", {
    scheduledAtUtc: "2026-09-06T17:00:00.000Z",
    timezone: "Asia/Jerusalem",
  });
  assert.equal(body.success, false);
  assert.equal(body.code, "SCHEDULE_IN_PAST");
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
  assert.deepEqual(body.details, {
    scheduledAtUtc: "2026-09-06T17:00:00.000Z",
    timezone: "Asia/Jerusalem",
  });
});

test("Jerusalem schedule is stored as UTC and compared as Date", () => {
  const utc = wallTimeInZoneToUtc("2026-09-06T20:15", "Asia/Jerusalem");
  assert.ok(utc);
  assert.equal(utc.toISOString(), "2026-09-06T17:15:00.000Z");
  assert.equal(utcToWallTimeInput(utc, "Asia/Jerusalem"), "2026-09-06T20:15");
  const now = new Date("2026-09-06T17:16:00.000Z");
  assert.equal(utc.getTime() <= now.getTime(), true);
  const later = new Date("2026-09-06T17:14:00.000Z");
  assert.equal(utc.getTime() <= later.getTime(), false);
});

test("cron due query finds scheduled configs at/after the UTC time", () => {
  const now = new Date("2026-09-06T17:16:00.000Z");
  const filter = dueWeddingChallengesSmsFilter(now);
  assert.ok(Array.isArray(filter.$and));
  assert.deepEqual(filter.$and[0], { "settings.sms.scheduledAt": { $lte: now } });
  const statuses = JSON.stringify(filter);
  assert.match(statuses, /scheduled/);
  assert.doesNotMatch(statuses, /requireWeddingChallenges/);
});

test("claim filter lets failed/zero-sent batches retry and not live sending", () => {
  const force = claimOpeningSmsFilter({ force: true });
  assert.deepEqual(force, {});
  const normal = claimOpeningSmsFilter({
    force: false,
    staleSendingBefore: new Date("2026-09-06T17:00:00.000Z"),
  });
  assert.ok(normal.$and);
});

test("one invalid phone is skippable and does not look like a valid recipient", () => {
  assert.equal(isSendableSmsPhone("0501234567"), true);
  assert.equal(isSendableSmsPhone("123"), false);
  assert.equal(isSendableSmsPhone(""), false);
});

test("EXISTING_EVENT recipients are RSVP yes; STANDALONE_GAME allows uploaded guests", () => {
  assert.deepEqual(attendingGuestMongoFilter("EXISTING_EVENT"), { rsvp: "yes" });
  assert.deepEqual(attendingGuestMongoFilter("STANDALONE_GAME"), { rsvp: { $ne: "no" } });
});

test("schedule is separate from send_now; cron send does not use admin session", () => {
  const sms = fs.readFileSync("app/api/wedding-challenges/sms/route.ts", "utf8");
  const send = fs.readFileSync("lib/weddingChallenges/sendOpeningSms.ts", "utf8");
  const jobs = fs.readFileSync("lib/weddingChallenges/jobs.ts", "utf8");
  const cron = fs.readFileSync("app/api/cron/send-scheduled-sms/route.ts", "utf8");
  const panel = fs.readFileSync("app/dashboard/wedding-challenges/SmsSchedulePanel.tsx", "utf8");

  assert.match(sms, /action === "schedule"/);
  assert.match(sms, /scheduleWeddingChallengesOpeningSms/);
  assert.match(sms, /action === "send_now"/);
  assert.match(sms, /sendWeddingChallengesOpeningSms/);
  assert.match(sms, /weddingChallengesSmsErrorBody/);
  assert.match(sms, /requireWeddingChallenges/);

  assert.match(jobs, /source: "cron"/);
  assert.doesNotMatch(jobs, /requireWeddingChallenges/);
  assert.match(cron, /x-vercel-cron/);
  assert.match(cron, /processWeddingChallengesJobs/);
  assert.doesNotMatch(cron, /requireWeddingChallenges/);

  assert.match(send, /source\?: "cron" \| "send_now"/);
  assert.match(send, /finalizeOpeningSmsBatch/);
  assert.match(send, /isSendableSmsPhone/);
  assert.match(send, /smsSentAt/);

  assert.match(panel, /שליחת ה-SMS נכשלה/);
  assert.match(panel, /נסה שוב/);
  assert.match(panel, /force: true/);
  assert.match(panel, /שלח עכשיו/);
  assert.match(panel, /תזמון שליחה/);
  assert.doesNotMatch(panel, /scheduledAt: wall/);
});
