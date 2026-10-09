/**
 * Approved narration is shared, and dial failures stay classified.
 * No Telnyx calls and no guest RSVP writes.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  classifyUnansweredHangup,
  explainIvrCallFailure,
  isDialableE164,
  isIvrDialRetryable,
} from "../../lib/calls/ivrDialFailure";
import { ivrFailureReason } from "../../lib/calls/ivrCallReport";
import { normalizePhoneForTelnyx } from "../../lib/telnyx/ivrCallControl";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

test("Israeli numbers drop a trunk zero after 972", () => {
  assert.equal(normalizePhoneForTelnyx("0501234567"), "+972501234567");
  assert.equal(normalizePhoneForTelnyx("972501234567"), "+972501234567");
  assert.equal(normalizePhoneForTelnyx("+972501234567"), "+972501234567");
  assert.equal(normalizePhoneForTelnyx("9720501234567"), "+972501234567");
  assert.equal(normalizePhoneForTelnyx("+9720501234567"), "+972501234567");
  assert.equal(normalizePhoneForTelnyx("009720501234567"), "+972501234567");
  assert.equal(isDialableE164("+972501234567"), true);
  assert.equal(isDialableE164("+9720501234567"), false);
  assert.equal(isDialableE164("0501234567"), false);
  assert.equal(isDialableE164("+97250123"), false);
});

test("only a temporary provider failure may be retried", () => {
  assert.equal(
    isIvrDialRetryable("TELNYX_CREATE_IVR_CALL_FAILED (503): {}"),
    true
  );
  assert.equal(
    isIvrDialRetryable("TELNYX_CREATE_IVR_CALL_FAILED (429): {}"),
    true
  );
  assert.equal(isIvrDialRetryable("fetch failed"), true);
  assert.equal(
    isIvrDialRetryable(
      'TELNYX_CREATE_IVR_CALL_FAILED (422): [{"detail":"Invalid destination"}]'
    ),
    false
  );
  assert.equal(isIvrDialRetryable("INVALID_PHONE"), false);
  assert.equal(isIvrDialRetryable("INVALID_NUMBER"), false);
  assert.equal(isIvrDialRetryable("DIAL_BLOCKED_TEST_MODE"), false);
  assert.equal(isIvrDialRetryable("TELNYX_API_KEY is missing"), false);
  assert.equal(isIvrDialRetryable("AUDIO_NOT_READY"), false);
});

test("an unanswered hangup is not stored as answered", () => {
  assert.deepEqual(classifyUnansweredHangup("user_busy"), {
    status: "busy",
    error: "",
  });
  assert.deepEqual(classifyUnansweredHangup("no_answer"), {
    status: "no_answer",
    error: "",
  });
  assert.deepEqual(classifyUnansweredHangup("unallocated_number"), {
    status: "failed",
    error: "INVALID_NUMBER",
  });
  assert.match(explainIvrCallFailure("INVALID_NUMBER"), /מספר לא תקין/);
  assert.match(explainIvrCallFailure("STALE_DIAL_NO_RESULT"), /לא סומן כנענה/);
  assert.match(
    explainIvrCallFailure(
      'TELNYX_CREATE_IVR_CALL_FAILED (422): [{"detail":"Invalid from number"}]'
    ),
    /422/
  );

  const reason = ivrFailureReason({
    status: "failed",
    answered: false,
    error: "INVALID_PHONE",
    hangupCause: "",
    rsvpApplied: false,
  });
  assert.match(reason, /מספר לא תקין/);
});

test("saving narration builds the shared file before any call", () => {
  const config = readFileSync(
    path.join(root, "app/api/ivr/config/route.ts"),
    "utf8"
  );
  const dialer = readFileSync(
    path.join(root, "lib/calls/ivrDialer.ts"),
    "utf8"
  );
  const webhook = readFileSync(
    path.join(root, "lib/calls/ivrWebhookHandler.ts"),
    "utf8"
  );
  assert.match(config, /ONLY synthesize the event name/);
  assert.match(config, /reuseOnly:\s*true/);
  assert.match(config, /COMPOSED_INTRO_NOT_READY/);
  const composeAt = config.indexOf("await buildAndStoreComposedIntro");
  const saveAt = config.indexOf("await user.save()", composeAt);
  assert.ok(composeAt > 0 && saveAt > composeAt);
  assert.equal(config.includes("synthesizeElevenLabsSpeech({"), true);
  assert.equal(config.includes("IVR_GLOBAL_PACK_TEXTS"), true);
  assert.match(dialer, /if \(!input\.due\.audioReady\)/);
  assert.match(dialer, /releaseStaleOutboundOccupancy/);
  assert.match(dialer, /countOccupiedOutboundCalls\(\)/);
  assert.match(webhook, /מענה עד תחילת השמעה/);
  assert.match(webhook, /classifyUnansweredHangup/);
  assert.match(webhook, /warmIvrChoiceFollowUps/);
  const sharedPlay = webhook.indexOf("const introUrl = cleanStr");
  const legacyChain = webhook.indexOf('stage: "play_event_name"');
  assert.ok(sharedPlay > 0 && legacyChain > sharedPlay);
});
