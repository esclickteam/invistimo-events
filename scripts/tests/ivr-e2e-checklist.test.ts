/**
 * End-to-end checklist for IVR (no live Telnyx dials, no DB mutation of schedules).
 * Covers pure logic + source-level safety invariants required before merge.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  getUserCallsType,
  isHumanCallsUser,
  isIvrCallsUser,
  normalizeCallsType,
} from "../../lib/calls/callsType";
import {
  filterGuestsForIvrRound,
  getGuestMaxAttendingCount,
  isGuestEligibleForIvrRound,
  parseDtmfGuestCount,
} from "../../lib/calls/ivrRoundEligibility";
import {
  buildIvrIntroText,
  contentHashForIvrIntro,
  IVR_SELF_RECORD_MAX_SECONDS,
  resolveIvrEventName,
} from "../../lib/calls/ivrScript";
import { isIvrDialAllowed } from "../../lib/telnyx/ivrCallControl";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("1) existing users without callsType remain human", () => {
  const legacy = { includeCalls: true };
  assert.equal(normalizeCallsType(undefined), "human");
  assert.equal(getUserCallsType(legacy), "human");
  assert.equal(isHumanCallsUser(legacy), true);
  assert.equal(isIvrCallsUser(legacy), false);
});

test("2) migration script never writes scheduledAt", () => {
  const src = readSrc("scripts/migrate-users-calls-type.ts");
  assert.match(src, /callsType:\s*"human"/);
  // scheduledAt may appear only in comments; never in update payload.
  assert.equal(/\$set:\s*\{[^}]*scheduledAt/s.test(src), false);
  assert.equal(src.includes("$unset"), false);
  assert.match(src, /\$set:\s*\{\s*callsType:\s*"human"\s*\}/);
});

test("3) IVR package uses exactly 3 rounds in schedule API", () => {
  const src = readSrc("app/api/ivr/schedule/route.ts");
  assert.match(src, /\[1,\s*2,\s*3\]\.map/);
  assert.match(src, /callType:\s*"ivr"/);
});

test("4) audience is resolved only at execution (dialer filters live guests)", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /filterGuestsForIvrRound/);
  assert.match(dialer, /InvitationGuest\.find/);
  // Schedule save must not snapshot guest ids
  const schedule = readSrc("app/api/ivr/schedule/route.ts");
  assert.equal(schedule.includes("guestId"), false);
  assert.equal(schedule.includes("InvitationGuest"), false);
});

test("5) outbound attempt is bound to invitationId + guestId + round", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /guestId/);
  assert.match(dialer, /invitationId/);
  assert.match(dialer, /callAttemptId/);
  assert.match(dialer, /guest_id/);
  const model = readSrc("models/IvrCallAttempt.ts");
  assert.match(model, /guestId:\s*\{/);
  assert.match(model, /invitationId:\s*\{/);
});

test("6/7/8) DTMF mapping updates existing RSVP fields", () => {
  const apply = readSrc("lib/calls/ivrApplyRsvp.ts");
  assert.match(apply, /rsvp:\s*input\.rsvp/);
  assert.match(apply, /arrivedCount/);
  assert.match(apply, /InvitationGuest/);

  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  assert.match(webhook, /rsvp:\s*"yes"/);
  assert.match(webhook, /rsvp:\s*"no"/);
  assert.match(webhook, /rsvp:\s*"maybe"/);
  assert.match(webhook, /attendingCount:\s*0/);
});

test("9/10) final yes/no excluded; maybe + pending continue by round rules", () => {
  const pending = { _id: "p1", phone: "0501111111", rsvp: "pending" };
  const maybe = { _id: "m1", phone: "0502222222", rsvp: "maybe" };
  const yes = { _id: "y1", phone: "0503333333", rsvp: "yes" };
  const no = { _id: "n1", phone: "0504444444", rsvp: "no" };

  assert.equal(isGuestEligibleForIvrRound({ guest: yes, round: 2 }), false);
  assert.equal(isGuestEligibleForIvrRound({ guest: no, round: 3 }), false);
  assert.equal(isGuestEligibleForIvrRound({ guest: pending, round: 2 }), true);
  assert.equal(isGuestEligibleForIvrRound({ guest: maybe, round: 2 }), false);
  assert.equal(isGuestEligibleForIvrRound({ guest: maybe, round: 3 }), true);

  const r2 = filterGuestsForIvrRound({
    guests: [pending, maybe, yes, no],
    round: 2,
  });
  assert.deepEqual(
    r2.map((g) => g._id),
    ["p1"]
  );

  const r3 = filterGuestsForIvrRound({
    guests: [pending, maybe, yes, no],
    round: 3,
  });
  assert.deepEqual(
    r3.map((g) => g._id),
    ["p1", "m1"]
  );
});

test("11) attending count cannot exceed guest max", () => {
  assert.equal(getGuestMaxAttendingCount({ guestsCount: 4 }), 4);
  assert.equal(parseDtmfGuestCount("5", 4).ok, false);
  assert.deepEqual(parseDtmfGuestCount("3", 4), { ok: true, count: 3 });
});

test("12) ElevenLabs audio reused when hash matches; dialer never calls TTS", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /reused:\s*true/);
  assert.match(config, /contentHash === hash/);
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.equal(dialer.includes("synthesizeElevenLabsSpeech"), false);
  assert.equal(dialer.includes("elevenlabs"), false);

  const h1 = contentHashForIvrIntro({
    eventName: "החתונה של הדס ורועי",
    voiceId: "v1",
  });
  const h2 = contentHashForIvrIntro({
    eventName: "החתונה של הדס ורועי",
    voiceId: "v1",
  });
  assert.equal(h1, h2);
});

test("13) self-record max is 45 seconds", () => {
  assert.equal(IVR_SELF_RECORD_MAX_SECONDS, 45);
  const upload = readSrc("app/api/ivr/audio/upload/route.ts");
  assert.match(upload, /IVR_SELF_RECORD_MAX_SECONDS/);
  assert.match(upload, /DURATION_TOO_LONG/);
});

test("14) AI template uses event name exactly", () => {
  const text = buildIvrIntroText({
    eventName: "החתונה של הדס ורועי",
  });
  assert.equal(
    text,
    [
      "שלום, אנחנו מתקשרים בנוגע לחתונה של הדס ורועי.",
      "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו.",
      "לאישור הגעה, הקישו 1.",
      "לאי הגעה, הקישו 2.",
      "אם עדיין אינכם יודעים, הקישו 3.",
    ].join("\n")
  );

  // Pronunciation affects speech text only via builder input; display resolver stays on eventName.
  assert.equal(
    resolveIvrEventName({ eventName: "החתונה של הדס ורועי" }),
    "החתונה של הדס ורועי"
  );
  const spoken = buildIvrIntroText({
    eventName: "החתונה של הדס ורועי",
    eventNamePronunciation: "החתונה של הדאס ורועיי",
  });
  // Hebrew ל+ה absorption: לחתונה של הדאס ורועיי
  assert.match(spoken, /לחתונה של הדאס ורועיי/);
});

test("15) webhook idempotency + guest binding prevent wrong/double updates", () => {
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  assert.match(webhook, /processedWebhookEventIds/);
  assert.match(webhook, /rsvpApplied:\s*false/);
  assert.match(webhook, /DUPLICATE_EVENT|already_applied|race_already_applied/);
  assert.match(webhook, /guestId:\s*String\(claimed\.guestId\)/);
  assert.match(webhook, /invitationId:\s*String\(claimed\.invitationId\)/);
});

test("16) live dial safety defaults off", () => {
  const prevAllow = process.env.IVR_ALLOW_LIVE_DIAL;
  const prevList = process.env.IVR_TEST_PHONE_ALLOWLIST;
  delete process.env.IVR_ALLOW_LIVE_DIAL;
  delete process.env.IVR_TEST_PHONE_ALLOWLIST;
  try {
    assert.equal(isIvrDialAllowed("+972501234567"), false);
  } finally {
    if (prevAllow === undefined) delete process.env.IVR_ALLOW_LIVE_DIAL;
    else process.env.IVR_ALLOW_LIVE_DIAL = prevAllow;
    if (prevList === undefined) delete process.env.IVR_TEST_PHONE_ALLOWLIST;
    else process.env.IVR_TEST_PHONE_ALLOWLIST = prevList;
  }

  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /isIvrDialAllowed/);
  assert.match(dialer, /DIAL_BLOCKED_TEST_MODE/);
  assert.match(dialer, /approved !== true/);
});

test("extra) human auto-open skips IVR users", () => {
  const autoOpen = readSrc("app/api/admin/call-work-orders/auto-open/route.ts");
  assert.match(autoOpen, /isIvrCallsUser/);
  const createTasks = readSrc("app/api/cron/create-call-tasks/route.ts");
  assert.match(createTasks, /isIvrCallsUser/);
});

test("extra) audio approval required before dial", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /approved !== true/);
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /approve_audio/);
});

test("extra) browser simulator exists and does not call Telnyx", () => {
  const ui = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(ui, /IvrCallSimulator|תצוגה מקדימה של השיחה/);
  assert.match(ui, /ללא שיחת Telnyx/);
  assert.equal(ui.includes("api/telnyx"), false);
});
