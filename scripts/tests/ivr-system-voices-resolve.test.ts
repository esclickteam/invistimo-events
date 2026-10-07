/**
 * Server-side Dana + Hebrew male resolution (never a client catalog).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("ivrSystemVoices resolves Dana female + Hebrew male only", () => {
  const src = readSrc("lib/calls/ivrSystemVoices.ts");
  assert.match(src, /findDanaVoice|Dana/);
  assert.match(src, /findBestHebrewMale|scoreMaleHebrewIvr/);
  assert.match(src, /getIvrSystemVoiceChoices/);
  assert.match(src, /דנה – קול נשי/);
  assert.match(src, /IvrSystemVoiceConfig/);
  assert.match(src, /shared-voices/);
});

test("voices API is systemVoicesOnly — not ElevenLabs picker", () => {
  const src = readSrc("app/api/ivr/voices/route.ts");
  assert.match(src, /systemVoicesOnly:\s*true/);
  assert.match(src, /getIvrSystemVoiceChoices/);
  assert.equal(src.includes("listElevenLabsVoices"), false);
  assert.match(src, /דנה/);
});

test("config POST returns providerDetail for TTS failures", () => {
  const src = readSrc("app/api/ivr/config/route.ts");
  assert.match(src, /providerDetail: payload\.providerDetail/);
  assert.match(src, /providerStatusCode: payload\.providerStatusCode/);
  assert.match(src, /ELEVENLABS_INSUFFICIENT_CREDITS|status:\s*\n?\s*402|402/);
  assert.match(src, /getIvrSystemVoiceChoices/);
});

test("Mongo model persists resolved system voice ids", () => {
  const src = readSrc("models/IvrSystemVoiceConfig.ts");
  assert.match(src, /female/);
  assert.match(src, /male/);
  assert.match(src, /voiceId/);
  assert.match(src, /key:\s*"global"|default:\s*"global"/);
});
