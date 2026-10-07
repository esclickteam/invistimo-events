/**
 * System voice choices: gender labels only (never ElevenLabs catalog names).
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

test("ivrSystemVoices exposes gender-only choices from approved packs", () => {
  const src = readSrc("lib/calls/ivrSystemVoices.ts");
  assert.match(src, /getIvrSystemVoiceChoices/);
  assert.match(src, /clientGenderChoices/);
  assert.match(src, /קול נשי/);
  assert.match(src, /קול גברי/);
  assert.match(src, /assertApprovedPackForGender/);
  assert.match(src, /getGlobalPacksApprovalStatus/);
  assert.equal(src.includes("findDanaVoice"), false);
  assert.equal(src.includes("דנה"), false);
});

test("voices API is systemVoicesOnly — not ElevenLabs picker", () => {
  const src = readSrc("app/api/ivr/voices/route.ts");
  assert.match(src, /systemVoicesOnly:\s*true/);
  assert.match(src, /getIvrSystemVoiceChoices/);
  assert.equal(src.includes("listElevenLabsVoices"), false);
  assert.match(src, /קול נשי/);
  assert.match(src, /קול גברי/);
  assert.equal(src.includes("דנה"), false);
  assert.equal(src.includes("George"), false);
  // Must not return voiceId / catalog name to clients
  assert.equal(src.includes("voiceId: v.voiceId"), false);
  assert.equal(src.includes("name: v.name"), false);
});

test("config POST returns providerDetail for TTS failures and gates on packs", () => {
  const src = readSrc("app/api/ivr/config/route.ts");
  assert.match(src, /providerDetail: payload\.providerDetail/);
  assert.match(src, /providerStatusCode: payload\.providerStatusCode/);
  assert.match(src, /ELEVENLABS_INSUFFICIENT_CREDITS|status:\s*\n?\s*402|402/);
  assert.match(src, /assertApprovedPackForGender/);
  assert.match(src, /VOICE_PACKS_NOT_APPROVED/);
  assert.match(src, /ADMIN_ONLY/);
});

test("Mongo model persists pack voice ids + approval", () => {
  const src = readSrc("models/IvrSystemVoiceConfig.ts");
  assert.match(src, /female/);
  assert.match(src, /male/);
  assert.match(src, /voiceId/);
  assert.match(src, /approved/);
  assert.match(src, /segmentsReady/);
  assert.match(src, /key:\s*"global"|default:\s*"global"/);
});

test("admin Voice Packs API + screen exist", () => {
  const api = readSrc("app/api/admin/ivr/voice-packs/route.ts");
  assert.match(api, /serializeAdminVoicePacks|generateAdminVoicePack/);
  assert.match(api, /approveAdminVoicePack|set_voice_id/);
  assert.match(api, /resolveAuthUserId/);
  assert.match(api, /BOOTSTRAP_DEFAULTS/);
  // GET must not surface a naked 500 for missing packs.
  assert.match(api, /emptyBootstrap|BOOTSTRAP_DEFAULTS/);

  const page = readSrc("app/admin/recorded-calls/page.tsx");
  assert.match(page, /הגדרות קריינות|Voice Pack/);
  assert.match(page, /קול נשי/);
  assert.match(page, /קול גברי/);

  const nav = readSrc("app/admin/layout.tsx");
  assert.match(nav, /\/admin\/recorded-calls/);
  assert.match(nav, /שיחות מוקלטות/);
});

test("admin serialize GET path is read-only — no ElevenLabs TTS", () => {
  const src = readSrc("lib/calls/ivrAdminVoicePacks.ts");
  assert.match(src, /readExistingPackSegments/);
  assert.match(src, /IvrSystemAudio\.find/);
  // serializeAdminVoicePacks must not call ensureGlobalVoicePack / synthesize.
  const serializeFn = src.slice(
    src.indexOf("export async function serializeAdminVoicePacks"),
    src.indexOf("export async function updateAdminPackVoiceId")
  );
  assert.equal(serializeFn.includes("ensureGlobalVoicePack"), false);
  assert.equal(serializeFn.includes("ensureGlobalPackSegment"), false);
  assert.equal(serializeFn.includes("synthesizeElevenLabsSpeech"), false);
  assert.match(src, /source === "auto"|enum.*auto|legacy/i);
});
