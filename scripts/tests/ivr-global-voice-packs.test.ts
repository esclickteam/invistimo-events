/**
 * Global female/male IVR voice packs:
 * - Fixed texts exist once per gender
 * - Creating a new event synthesizes ONLY the event name
 * - Client UI exposes only קול נשי / קול גברי
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildIvrEventNameSpeechText,
  buildIvrIntroText,
  contentHashForIvrEventName,
  globalPackAudioKey,
  IVR_GLOBAL_PACK_TEXTS,
  normalizeIvrVoiceGender,
} from "../../lib/calls/ivrScript";
import {
  getIvrFemaleVoiceId,
  getIvrMaleVoiceId,
  listIvrSystemVoiceOptions,
} from "../../lib/calls/elevenlabs";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("global pack texts match product script segments", () => {
  assert.equal(
    IVR_GLOBAL_PACK_TEXTS.introBeforeEventName,
    "שלום, אנחנו מתקשרים בנוגע ל"
  );
  assert.match(IVR_GLOBAL_PACK_TEXTS.introAfterEventName, /הקישו 1/);
  assert.match(IVR_GLOBAL_PACK_TEXTS.afterPress1, /מספר האורחים/);
  assert.match(IVR_GLOBAL_PACK_TEXTS.afterValidQuantity, /נתראה בשמחות/);
  assert.match(IVR_GLOBAL_PACK_TEXTS.afterPress2Or3, /תשובתכם התקבלה/);
  assert.match(IVR_GLOBAL_PACK_TEXTS.invalidInput, /לא הצלחנו לזהות/);
});

test("per-event speech text is event name only", () => {
  assert.equal(
    buildIvrEventNameSpeechText({
      eventName: "החתונה של הדס ורועי",
    }),
    "החתונה של הדס ורועי"
  );
  assert.equal(
    buildIvrEventNameSpeechText({
      eventName: "החתונה של הדס ורועי",
      eventNamePronunciation: "החתונה של הדאס ורועיי",
    }),
    "החתונה של הדאס ורועיי"
  );

  const preview = buildIvrIntroText({
    eventName: "החתונה של הדס ורועי",
  });
  assert.match(preview, /בנוגע להחתונה של הדס ורועי/);
  assert.match(preview, /הקישו 3/);
});

test("pack audio keys are gender-scoped and stable", () => {
  assert.equal(
    globalPackAudioKey("female", "introBeforeEventName"),
    "pack:female:introBeforeEventName"
  );
  assert.equal(
    globalPackAudioKey("male", "afterPress1"),
    "pack:male:afterPress1"
  );
  assert.equal(normalizeIvrVoiceGender("נשי"), "female");
  assert.equal(normalizeIvrVoiceGender("male"), "male");
});

test("system voice list is only female/male from env — not ElevenLabs catalog", () => {
  const prevF = process.env.IVR_FEMALE_VOICE_ID;
  const prevM = process.env.IVR_MALE_VOICE_ID;
  process.env.IVR_FEMALE_VOICE_ID = "voice_female_test";
  process.env.IVR_MALE_VOICE_ID = "voice_male_test";
  try {
    const options = listIvrSystemVoiceOptions();
    assert.equal(options.length, 2);
    assert.deepEqual(
      options.map((o) => o.gender).sort(),
      ["female", "male"]
    );
    assert.equal(getIvrFemaleVoiceId(), "voice_female_test");
    assert.equal(getIvrMaleVoiceId(), "voice_male_test");
    assert.ok(options.every((o) => o.label === "קול נשי" || o.label === "קול גברי"));
  } finally {
    if (prevF === undefined) delete process.env.IVR_FEMALE_VOICE_ID;
    else process.env.IVR_FEMALE_VOICE_ID = prevF;
    if (prevM === undefined) delete process.env.IVR_MALE_VOICE_ID;
    else process.env.IVR_MALE_VOICE_ID = prevM;
  }

  const voicesRoute = readSrc("app/api/ivr/voices/route.ts");
  assert.match(voicesRoute, /listIvrSystemVoiceOptions/);
  assert.equal(voicesRoute.includes("listElevenLabsVoices"), false);
  assert.match(voicesRoute, /קול נשי|female/);
});

test("config generate synthesizes event name only — never full intro as TTS payload", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /buildIvrEventNameSpeechText/);
  assert.match(config, /eventNameOnly:\s*true/);
  assert.match(config, /fixedTextsSynthesized:\s*false/);
  assert.match(config, /ensureGlobalVoicePack/);
  assert.match(config, /ivrEventNameR2Key/);
  // Must not TTS the assembled full intro in POST generate.
  assert.equal(config.includes("synthesizeElevenLabsSpeech({\n      text: buildIvrIntroText"), false);
  assert.equal(config.includes("text: buildIvrIntroText"), false);
});

test("creating two events reuses global pack segments (no re-TTS of fixed texts)", async () => {
  const prevF = process.env.IVR_FEMALE_VOICE_ID;
  const prevKey = process.env.ELEVENLABS_API_KEY;
  const prevR2 = {
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  };
  process.env.IVR_FEMALE_VOICE_ID = "voice_female_pack";
  process.env.ELEVENLABS_API_KEY = "sk_test_dummy_for_pack";
  process.env.R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "test-bucket";
  process.env.R2_ENDPOINT =
    process.env.R2_ENDPOINT || "https://example.r2.cloudflarestorage.com";
  process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "test-key";
  process.env.R2_SECRET_ACCESS_KEY =
    process.env.R2_SECRET_ACCESS_KEY || "test-secret";

  const store = new Map<string, any>();
  let synthesizeCalls = 0;

  const IvrSystemAudio = (await import("../../models/IvrSystemAudio")).default;
  const originalFindOne = IvrSystemAudio.findOne.bind(IvrSystemAudio);
  const originalFindOneAndUpdate =
    IvrSystemAudio.findOneAndUpdate.bind(IvrSystemAudio);

  IvrSystemAudio.findOne = ((query: any) => {
    const key = String(query?.key || "");
    const doc = store.get(key) || null;
    return {
      lean: async () => doc,
    };
  }) as any;

  IvrSystemAudio.findOneAndUpdate = ((query: any, update: any) => {
    synthesizeCalls += 1;
    const key = String(query?.key || "");
    const next = { key, ...(update?.$set || {}) };
    store.set(key, next);
    return {
      lean: async () => next,
    };
  }) as any;

  const { hashTtsContent } = await import("../../lib/calls/elevenlabs");
  const { ensureGlobalVoicePack, ensureGlobalPackSegment } = await import(
    "../../lib/calls/ivrSystemAudio"
  );

  try {
    // Seed pack as if already generated once for the whole platform:
    for (const segment of Object.keys(IVR_GLOBAL_PACK_TEXTS) as Array<
      keyof typeof IVR_GLOBAL_PACK_TEXTS
    >) {
      const text = IVR_GLOBAL_PACK_TEXTS[segment];
      const key = globalPackAudioKey("female", segment);
      store.set(key, {
        key,
        text,
        voiceId: "voice_female_pack",
        audioUrl: `https://example.test/${key}`,
        publicToken: `tok_${segment}`,
        r2Key: `r2/${key}`,
        contentHash: hashTtsContent(text, "voice_female_pack"),
      });
    }

    const pack1 = await ensureGlobalVoicePack("female");
    const pack2 = await ensureGlobalVoicePack("female");

    assert.equal(pack1.segments.introBeforeEventName.reused, true);
    assert.equal(pack2.segments.afterPress1.reused, true);
    assert.equal(pack2.segments.introAfterEventName.reused, true);
    assert.equal(
      synthesizeCalls,
      0,
      "warming an already-cached global pack must not upsert/synthesize again"
    );

    // Two new events → only event-name strings would be sent to ElevenLabs.
    const eventA = buildIvrEventNameSpeechText({
      eventName: "החתונה של הדס ורועי",
    });
    const eventB = buildIvrEventNameSpeechText({
      eventName: "בר המצווה של יוסי",
    });
    const perEventTexts = [eventA, eventB];

    assert.deepEqual(perEventTexts, [
      "החתונה של הדס ורועי",
      "בר המצווה של יוסי",
    ]);
    assert.ok(
      !perEventTexts.some((t) => t.includes("שלום, אנחנו מתקשרים")),
      "fixed intro text must never be part of per-event TTS"
    );
    assert.ok(
      !perEventTexts.some((t) =>
        t.includes("נשמח לדעת האם תוכלו להגיע")
      ),
      "fixed after-name text must never be part of per-event TTS"
    );
    assert.ok(
      !perEventTexts.some((t) => t.includes("מעולה. אנא הקישו")),
      "fixed DTMF texts must never be part of per-event TTS"
    );

    // After "creating" two events, global pack still untouched:
    await ensureGlobalVoicePack("female");
    assert.equal(synthesizeCalls, 0);

    const h1 = contentHashForIvrEventName({
      eventName: "החתונה של הדס ורועי",
      voiceGender: "female",
      voiceId: "voice_female_pack",
    });
    const h2 = contentHashForIvrEventName({
      eventName: "בר המצווה של יוסי",
      voiceGender: "female",
      voiceId: "voice_female_pack",
    });
    assert.notEqual(h1, h2);

    const reusedSeg = await ensureGlobalPackSegment({
      gender: "female",
      segment: "introBeforeEventName",
      reuseOnly: true,
    });
    assert.equal(reusedSeg.reused, true);
    assert.equal(reusedSeg.text, IVR_GLOBAL_PACK_TEXTS.introBeforeEventName);
  } finally {
    IvrSystemAudio.findOne = originalFindOne;
    IvrSystemAudio.findOneAndUpdate = originalFindOneAndUpdate;
    if (prevF === undefined) delete process.env.IVR_FEMALE_VOICE_ID;
    else process.env.IVR_FEMALE_VOICE_ID = prevF;
    if (prevKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevKey;
    for (const [key, value] of Object.entries(prevR2)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("UI offers only gender buttons — not ElevenLabs voice dropdown", () => {
  const ui = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(ui, /ivr-voice-gender/);
  assert.match(ui, /ivr-voice-\$\{voice\.gender\}/);
  assert.match(ui, /ConcatPreviewPlayer|previewPlaylist/);
  assert.match(ui, /יצירת שם האירוע/);
  assert.equal(ui.includes("listElevenLabsVoices"), false);
  assert.equal(ui.includes("<select"), false);
  assert.equal(ui.includes("טוען קולות"), false);
  assert.match(ui, /קול נשי|voice\.label/);
});

test("dialer + webhook play sequential global + event name segments", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /eventNameAudioUrl/);
  assert.match(dialer, /voiceGender/);
  assert.equal(dialer.includes("synthesizeElevenLabsSpeech"), false);

  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  assert.match(webhook, /introBeforeEventName/);
  assert.match(webhook, /play_event_name/);
  assert.match(webhook, /play_intro_after/);
  assert.match(webhook, /getGlobalPackSegmentUrl/);
  assert.match(webhook, /getIvrSystemAudioUrlForGender/);
});

test("User model stores eventNameAudio + voiceGender, not per-event fixed packs", () => {
  const user = readSrc("models/User.ts");
  assert.match(user, /eventNameAudio/);
  assert.match(user, /voiceGender/);
  assert.match(user, /systemVoiceId/);
  assert.match(user, /Per-event TTS: spoken event name only/);
});
