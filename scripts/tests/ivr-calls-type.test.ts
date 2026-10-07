import assert from "node:assert/strict";
import test from "node:test";

import {
  getRoundCallType,
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
} from "../../lib/calls/ivrScript";
import { sanitizeElevenLabsErrorMessage } from "../../lib/calls/elevenlabs";

test("normalizeCallsType defaults to human", () => {
  assert.equal(normalizeCallsType(undefined), "human");
  assert.equal(normalizeCallsType(null), "human");
  assert.equal(normalizeCallsType(""), "human");
  assert.equal(normalizeCallsType("IVR"), "ivr");
  assert.equal(normalizeCallsType("human"), "human");
});

test("existing users without callsType behave as human call-center", () => {
  const legacy = { includeCalls: true };
  assert.equal(getUserCallsType(legacy), "human");
  assert.equal(isHumanCallsUser(legacy), true);
  assert.equal(isIvrCallsUser(legacy), false);
});

test("IVR users are gated separately from human", () => {
  const ivrUser = { includeCalls: true, callsType: "ivr" };
  assert.equal(isIvrCallsUser(ivrUser), true);
  assert.equal(isHumanCallsUser(ivrUser), false);
});

test("round callType inherits user type when missing (future mixed model)", () => {
  assert.equal(
    getRoundCallType({ userCallsType: "ivr", roundCallType: undefined }),
    "ivr"
  );
  assert.equal(
    getRoundCallType({ userCallsType: "human", roundCallType: "ivr" }),
    "ivr"
  );
});

test("IVR eligibility: round 1/2 pending only; round 3 includes maybe; final yes/no excluded", () => {
  const pending = { _id: "1", phone: "0501234567", rsvp: "pending" };
  const maybe = { _id: "2", phone: "0501234568", rsvp: "maybe" };
  const yes = { _id: "3", phone: "0501234569", rsvp: "yes" };
  const no = { _id: "4", phone: "0501234570", rsvp: "no" };

  assert.equal(isGuestEligibleForIvrRound({ guest: pending, round: 1 }), true);
  assert.equal(isGuestEligibleForIvrRound({ guest: pending, round: 2 }), true);
  assert.equal(isGuestEligibleForIvrRound({ guest: maybe, round: 1 }), false);
  assert.equal(isGuestEligibleForIvrRound({ guest: maybe, round: 3 }), true);
  assert.equal(isGuestEligibleForIvrRound({ guest: yes, round: 3 }), false);
  assert.equal(isGuestEligibleForIvrRound({ guest: no, round: 3 }), false);

  const filtered = filterGuestsForIvrRound({
    guests: [pending, maybe, yes, no],
    round: 3,
  });
  assert.deepEqual(
    filtered.map((g) => String(g._id)),
    ["1", "2"]
  );
});

test("guest max attending uses guestsCount", () => {
  assert.equal(getGuestMaxAttendingCount({ guestsCount: 4 }), 4);
  assert.equal(getGuestMaxAttendingCount({}), 1);
});

test("DTMF guest count rejects above max and empty", () => {
  assert.deepEqual(parseDtmfGuestCount("3", 5), { ok: true, count: 3 });
  assert.equal(parseDtmfGuestCount("6", 5).ok, false);
  assert.equal(parseDtmfGuestCount("", 5).ok, false);
});

test("AI intro template uses variables; pronunciation hash differs", () => {
  const text = buildIvrIntroText({
    eventTypeLabel: "חתונה",
    hostsNames: "הדס ורועי",
  });
  assert.match(text, /חתונה של הדס ורועי/);
  assert.match(text, /הקישו 1/);

  const h1 = contentHashForIvrIntro({
    eventTypeLabel: "חתונה",
    hostsNames: "הדס ורועי",
    voiceId: "v1",
  });
  const h2 = contentHashForIvrIntro({
    eventTypeLabel: "חתונה",
    hostsNames: "הדס ורועי",
    hostsNamesPronunciation: "הדאס ורועיי",
    voiceId: "v1",
  });
  assert.notEqual(h1, h2);
});

test("ElevenLabs error sanitizer redacts key material", () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk_test_secret_value_123456";
  try {
    const sanitized = sanitizeElevenLabsErrorMessage(
      "boom sk_test_secret_value_123456 xi-api-key=sk_test_secret_value_123456"
    );
    assert.equal(sanitized.includes("sk_test_secret_value_123456"), false);
    assert.match(sanitized, /REDACTED/);
  } finally {
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});

