import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { phoneNeedsReview } from "../../lib/guestPhone";
import { isDialableE164 } from "../../lib/calls/ivrDialFailure";
import { normalizePhoneForTelnyx } from "../../lib/telnyx/ivrCallControl";
import { DEFAULT_KOSHER_PREFIXES } from "../../lib/kosherPhones/defaults";
import {
  buildKosherCallScript,
  isGuestEligibleForKosherMessageRound,
  isKosherPhone,
  kosherAttemptCoversGuest,
  kosherFailureIsUnresolved,
  kosherMatchKey,
  matchKosherPrefix,
  partitionGuestsByKosher,
  partitionMessageGuestsForKosherService,
  resolveKosherSpokenEventName,
  splitEligibleAudience,
  summarizeKosherAttempts,
} from "../../lib/kosherPhones/match";

const ACTIVE = DEFAULT_KOSHER_PREFIXES.map((row) => ({ ...row, active: true }));

test("default prefixes keep 055400, 055401 and 055402 as separate records", () => {
  const prefixes = DEFAULT_KOSHER_PREFIXES.map((row) => row.prefix);
  assert.equal(new Set(prefixes).size, prefixes.length);
  assert.equal(prefixes.length, 16);
  assert.ok(prefixes.includes("055400"));
  assert.ok(prefixes.includes("055401"));
  assert.ok(prefixes.includes("055402"));
  assert.ok(prefixes.includes("055403"));
});

test("detects kosher numbers in local and international formats without changing the original", () => {
  const original = "+972527100000";
  assert.equal(kosherMatchKey(original), "0527100000");
  assert.equal(matchKosherPrefix(original, ACTIVE), "05271");
  assert.equal(isKosherPhone("052-710-0000", ACTIVE), true);
  assert.equal(isKosherPhone("972527600000", ACTIVE), true);
  assert.equal(original, "+972527100000");
});

test("longest prefix wins and inactive prefixes do not match", () => {
  const prefixes = [
    { prefix: "05540", active: true },
    { prefix: "055400", active: true },
    { prefix: "05271", active: false },
  ];
  assert.equal(matchKosherPrefix("0554001234", prefixes), "055400");
  assert.equal(isKosherPhone("0527100000", prefixes), false);
  assert.equal(isKosherPhone("0501234567", ACTIVE), false);
});

test("a full kosher number is not marked invalid because of its prefix", () => {
  assert.equal(phoneNeedsReview({ phone: "0527100000" }), false);
  assert.equal(phoneNeedsReview({ phone: "+972554001234" }), false);
  assert.equal(phoneNeedsReview({ phone: "0554001234" }), false);
  assert.equal(isDialableE164(normalizePhoneForTelnyx("0527100000")), true);
  assert.equal(isDialableE164(normalizePhoneForTelnyx("+972554001234")), true);
});

test("audience split sends each record to one channel and keeps round eligibility", () => {
  const guests = [
    { phone: "0527100000", rsvp: "pending" },
    { phone: "0501234567", rsvp: "pending" },
    { phone: "0548400000", rsvp: "yes" },
    { phone: "0533100000", rsvp: "no" },
  ];

  const off = partitionMessageGuestsForKosherService({
    enabled: false,
    scheduleType: "rsvp",
    guests,
    prefixes: ACTIVE,
  });
  assert.equal(off.enabled, false);
  assert.equal(off.messageGuests, guests);
  assert.deepEqual(off.kosherGuests, []);

  const reminder = partitionMessageGuestsForKosherService({
    enabled: true,
    scheduleType: "reminder",
    guests,
    prefixes: ACTIVE,
  });
  assert.equal(reminder.messageGuests, guests);

  const round1 = splitEligibleAudience({ guests, round: 1, prefixes: ACTIVE });
  assert.equal(round1.regularCount, 1);
  assert.equal(round1.kosherCount, 3);
  assert.deepEqual(
    partitionGuestsByKosher(round1.kosher, ACTIVE).regular,
    []
  );

  const round2 = splitEligibleAudience({ guests, round: 2, prefixes: ACTIVE });
  assert.equal(round2.eligibleCount, 2);
  assert.equal(round2.kosherCount, 1);
  assert.equal(round2.regularCount, 1);
  assert.equal(
    isGuestEligibleForKosherMessageRound({ guest: guests[2], round: 2 }),
    false
  );
});

test("kosher narration uses the event name and ignores a separate narration name", () => {
  const invitationTitle = "החתונה של דניאל ונועה";
  const spoken = resolveKosherSpokenEventName({
    customName: "שם לקריינות",
    invitationTitle,
    ivrConfig: {
      eventName: "שם אחר",
      eventNamePronunciation: "הגייה אחרת",
    },
  });
  assert.equal(spoken.speechText, invitationTitle);
  assert.equal(spoken.displayName, invitationTitle);
  assert.equal(spoken.source, "invitation");

  const fromDetails = resolveKosherSpokenEventName({
    invitation: {
      title: "הזמנה חדשה",
      eventType: "wedding",
      hostsNames: "דניאל ונועה",
    },
  });
  assert.equal(fromDetails.speechText, "החתונה של דניאל ונועה");

  const script = buildKosherCallScript(spoken.speechText);
  assert.match(script, /החתונה של דניאל ונועה/);
  assert.match(script, /הקישו 1/);
  assert.match(script, /הקישו 2/);
  assert.match(script, /הקישו 3/);

  const panel = fs.readFileSync(
    "app/dashboard/messages/new/tabs/KosherMessageRoundPanel.tsx",
    "utf8"
  );
  assert.equal(panel.includes("שמירת שם לקריינות"), false);
  assert.equal(panel.includes("הכנת הקלטה"), false);
  assert.equal(panel.includes("שם אירוע לקריינות"), false);

  const matchSrc = fs.readFileSync("lib/kosherPhones/match.ts", "utf8");
  assert.match(matchSrc, /ivrSpokenEventNameCore/);
  assert.equal(matchSrc.includes("ivrComposeIntro"), false);
  assert.equal(matchSrc.includes("ivrSpokenEventName\""), false);
});

test("call results separate answered, missed and failed without a successful mark on failure", () => {
  const summary = summarizeKosherAttempts([
    { status: "initiated", answered: false },
    { status: "completed", answered: true, rsvpApplied: true, rsvpResult: "yes" },
    { status: "no_answer", answered: false },
    { status: "failed", error: "NARRATION_UNAVAILABLE", rsvpApplied: false },
  ]);
  assert.equal(summary.dialed, 3);
  assert.equal(summary.answered, 1);
  assert.equal(summary.noAnswer, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.rsvpYes, 1);
  assert.equal(kosherFailureIsUnresolved("failed", "NARRATION_UNAVAILABLE"), true);
  assert.equal(
    kosherAttemptCoversGuest({ origin: "kosher_message_round", status: "initiated" }),
    true
  );
  assert.equal(
    kosherAttemptCoversGuest({ origin: "kosher_message_round", status: "failed" }),
    false
  );
  assert.equal(kosherAttemptCoversGuest({ origin: "", status: "initiated" }), false);
});

test("message worker routes kosher guests inside the existing run and leaves the service off untouched", () => {
  const worker = fs.readFileSync("workers/sendScheduledSms.ts", "utf8");
  assert.equal(worker.match(/partitionMessageRoundGuests\(/g)?.length, 2);
  assert.match(worker, /dispatchKosherMessageRound/);
  assert.match(worker, /for \(const guest of messageGuests\)/);
  assert.match(worker, /for \(const guest of roundGuests\)/);
  assert.match(worker, /kosherResult\?\.routed/);
  assert.doesNotMatch(worker, /new Cron|kosherSchedule/);

  const userSchema = fs.readFileSync("models/User.ts", "utf8");
  assert.match(userSchema, /kosherRecordedCallsEnabled:\s*\{[^}]*default:\s*false/s);

  const dialer = fs.readFileSync("lib/calls/ivrDialer.ts", "utf8");
  assert.match(dialer, /kosher_message_round/);
});
