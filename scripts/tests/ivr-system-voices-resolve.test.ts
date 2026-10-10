/**
 * System voice choices: gender labels only (never ElevenLabs catalog names).
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

test("female voice is exact Dana lock; male requires audition; Hebrew language_code", () => {
  const eleven = readSrc("lib/calls/elevenlabs.ts");
  assert.match(eleven, /findExactDanaVoice/);
  assert.match(eleven, /IVR_REQUIRED_FEMALE_VOICE_NAME/);
  assert.match(eleven, /language_code/);
  assert.match(eleven, /modelSupportsLanguageCode/);
  assert.match(eleven, /MODELS_SUPPORTING_HEBREW_LANGUAGE_CODE/);
  assert.match(eleven, /isExactDanaName/);
  // multilingual_v2 must NOT always force language_code he
  assert.match(eleven, /Never send language_code to models that reject it/);
  // Dana - Patient Support Agent must match
  assert.match(eleven, /Dana - …|dana\(\\s\*\[/);
  assert.match(eleven, /listMaleAuditionCandidates/);
  assert.match(eleven, /IVR_MALE_AUDITION_TEXT/);

  const admin = readSrc("lib/calls/ivrAdminVoicePacks.ts");
  assert.match(admin, /invalidateWrongVoicePacks/);
  assert.match(admin, /lockFemaleVoiceToDana/);
  assert.match(admin, /lockMaleVoiceFromAudition/);
  assert.match(admin, /buildMaleVoiceAuditions/);
  assert.match(admin, /assertVoiceIdIsDana/);
  assert.match(admin, /admin_audition_locked/);

  const page = readSrc("app/admin/recorded-calls/page.tsx");
  assert.match(page, /lock_female_dana|מצא ונעל את Dana/);
  assert.match(page, /male_audition|השמע 2–3 קולות/);
  assert.match(page, /invalidate_wrong_packs|בטל שימוש/);
  assert.match(page, /hasHeardRequired|REQUIRED_LISTEN_KEYS/);
  assert.match(page, /השמע פתיח מלא/);
  assert.match(page, /אישור Voice Pack \(ידני\)/);
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

test("ready requires R2 verification — not Mongo URL alone", () => {
  const admin = readSrc("lib/calls/ivrAdminVoicePacks.ts");
  assert.match(admin, /verifyIvrAudioInR2/);
  assert.match(admin, /resolveIvrPublicAudioUrl/);
  assert.match(admin, /status: "unplayable"|status: "missing"/);
  assert.match(admin, /SEGMENTS_NOT_READY/);
  assert.match(admin, /verifyHttp/);

  const storage = readSrc("lib/calls/ivrAudioStorage.ts");
  assert.match(storage, /HeadObjectCommand/);
  assert.match(storage, /verifyIvrAudioInR2/);
  assert.match(storage, /www\.invistimo\.com/);
  assert.match(storage, /resolveIvrPublicAudioUrl/);

  const systemAudio = readSrc("lib/calls/ivrSystemAudio.ts");
  assert.match(systemAudio, /verifyIvrAudioInR2/);
  assert.match(systemAudio, /IVR_GLOBAL_SEGMENT_UNPLAYABLE|IVR_TTS_EMPTY_AUDIO/);
});
