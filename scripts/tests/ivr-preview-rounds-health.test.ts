/**
 * Preview must never claim "approved for calls" when media is unplayable,
 * and round status must close per-round (not via global live occupancy).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("client screen no longer asks the customer to approve a recording", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(panel, /ivr-auto-narration-note/);
  assert.equal(panel.includes("ivr-approved-unplayable-banner"), false);
  assert.equal(panel.includes("ivr-approve-audio"), false);
  assert.equal(panel.includes("recompose_intro"), false);
  assert.equal(panel.includes("הקלטה אישית"), false);
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /recompose_intro/);
  assert.match(config, /mediaPlayable/);
});

test("config exposes media health and recompose without TTS", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /attachComposedMediaHealth/);
  assert.match(config, /verifyIvrAudioInR2/);
  assert.match(config, /action === "recompose_intro"/);
  assert.match(config, /COMPOSED_MEDIA_UNAVAILABLE/);
  assert.match(config, /buildAndStoreComposedIntro/);
  // Recompose must not call ElevenLabs.
  const recompose = config.slice(
    config.indexOf('action === "recompose_intro"'),
    config.indexOf('action === "approve_audio"')
  );
  assert.equal(recompose.includes("synthesizeElevenLabsSpeech"), false);
});

test("media route allows cross-origin metadata for preview hosts", () => {
  const media = readSrc("app/api/ivr/media/[token]/route.ts");
  assert.match(media, /Access-Control-Allow-Origin/);
  assert.match(media, /Access-Control-Expose-Headers/);
});

test("round completion uses per-round occupancy and reconciles idle rounds", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /countOccupiedOutboundCallsForRound/);
  assert.match(dialer, /reconcileIdleRoundStatuses/);
  assert.match(dialer, /earlierRoundStillRunning/);
  assert.match(dialer, /liveForRound/);
  // Global parallel cap remains for capacity; status close must not use it alone.
  const closeBlock = dialer.slice(
    dialer.indexOf("const liveForRound"),
    dialer.indexOf("await setRoundExecution({\n    userId: input.due.userId")
  );
  assert.match(closeBlock, /liveForRound/);
  assert.equal(closeBlock.includes("countOccupiedOutboundCalls()"), false);
});

test("all rounds still share executeIvrRound and composed intro", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /export async function executeIvrRound/);
  assert.match(dialer, /composedIntroAudioUrl: audio\.composedIntroAudioUrl/);
  assert.match(dialer, /return executeIvrRound/);
  const fill = dialer.slice(dialer.indexOf("export async function fillIvrRoundCapacity"));
  assert.match(fill, /executeIvrRound/);
});
