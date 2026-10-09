/**
 * Global female/male IVR voice packs:
 * - Fixed texts exist once per gender
 * - Creating a new event synthesizes ONLY the event name
 * - Client UI exposes קריינות AI / הקלטה אישית, not a voice catalog
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
    "שלום, אנחנו מתקשרים בנוגע לאירוע"
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
  assert.match(preview, /בנוגע לאירוע החתונה של הדס ורועי/);
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
    assert.ok(
      options.every(
        (o) =>
          o.label === "קול נשי" || o.label === "קול גברי"
      )
    );
    assert.equal(options.find((o) => o.gender === "female")?.label, "קול נשי");
    assert.equal(options.find((o) => o.gender === "male")?.label, "קול גברי");
  } finally {
    if (prevF === undefined) delete process.env.IVR_FEMALE_VOICE_ID;
    else process.env.IVR_FEMALE_VOICE_ID = prevF;
    if (prevM === undefined) delete process.env.IVR_MALE_VOICE_ID;
    else process.env.IVR_MALE_VOICE_ID = prevM;
  }

  const voicesRoute = readSrc("app/api/ivr/voices/route.ts");
  assert.match(voicesRoute, /getIvrSystemVoiceChoices/);
  assert.match(voicesRoute, /systemVoicesOnly/);
  assert.equal(voicesRoute.includes("listElevenLabsVoices"), false);
  assert.match(voicesRoute, /קול נשי/);
  assert.equal(voicesRoute.includes("דנה"), false);
  assert.equal(voicesRoute.includes("George"), false);
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
  // Never persist undefined nested audio objects (Mongoose CastError).
  assert.match(config, /assignIvrConfig/);
  assert.match(config, /normalizeIvrAudioSubdoc/);
});

test("creating two events reuses global pack segments (no re-TTS of fixed texts)", () => {
  // Cache contract in ivrSystemAudio: matching contentHash → reused, no synthesize.
  const systemAudio = readSrc("lib/calls/ivrSystemAudio.ts");
  assert.match(systemAudio, /reused:\s*true/);
  assert.match(systemAudio, /reuseOnly/);
  assert.match(systemAudio, /IVR_GLOBAL_SEGMENT_MISSING/);
  assert.match(systemAudio, /ensureGlobalVoicePack/);
  assert.match(systemAudio, /pack:\$\{gender\}:\$\{segment\}|globalPackAudioKey/);

  // Config generate path synthesizes only the spoken event name.
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /buildIvrEventNameSpeechText/);
  assert.match(config, /fixedTextsSynthesized:\s*false/);
  assert.match(config, /eventNameOnly:\s*true/);

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
    !perEventTexts.some((t) => t.includes("נשמח לדעת האם תוכלו להגיע")),
    "fixed after-name text must never be part of per-event TTS"
  );
  assert.ok(
    !perEventTexts.some((t) => t.includes("מעולה. אנא הקישו")),
    "fixed DTMF texts must never be part of per-event TTS"
  );
  assert.ok(
    !perEventTexts.some((t) => t.includes("הגעתם למערכת אישורי")),
    "inbound fixed texts must never be part of per-event TTS"
  );

  // Global pack keys are gender-scoped once for the whole platform.
  assert.equal(
    globalPackAudioKey("female", "introBeforeEventName"),
    "pack:female:introBeforeEventName"
  );
  assert.equal(
    globalPackAudioKey("male", "inboundBeforeEventName"),
    "pack:male:inboundBeforeEventName"
  );
  assert.ok(
    Object.keys(IVR_GLOBAL_PACK_TEXTS).includes("inboundBeforeEventName")
  );

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
});

test("UI offers קריינות AI / הקלטה אישית — not a voice catalog", () => {
  const ui = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(ui, /קריינות AI/);
  assert.match(ui, /הקלטה אישית/);
  assert.equal(ui.includes("קול נשי"), false);
  assert.equal(ui.includes("קול גברי"), false);
  assert.equal(ui.includes('type="radio"'), false);
  assert.match(ui, /ConcatPreviewPlayer|previewPlaylist/);
  assert.match(ui, /יצירת שם האירוע \+ תצוגה מקדימה/);
  assert.match(ui, /packsReady|ivr-packs-not-ready/);
  assert.match(ui, /composedIntroAudio|ivr-composed-preview/);
  assert.match(ui, /שיחה יוצאת/);
  assert.equal(ui.includes("תצוגה מקדימה — שיחה נכנסת"), false);
  assert.equal(ui.includes("autoPlay"), false);
  assert.match(ui, /type="date"/);
  assert.match(ui, /data-testid="ivr-round-time"/);
  assert.match(ui, /top-full/);
  assert.match(ui, /max-h-32/);
  assert.match(ui, /ELEVENLABS_INSUFFICIENT_CREDITS|חסרים קרדיטים/);
  assert.equal(ui.includes("listElevenLabsVoices"), false);
  assert.equal(ui.includes("<select"), false);
  assert.equal(ui.includes("טוען קולות"), false);
  assert.equal(ui.includes("דנה"), false);
  assert.equal(ui.includes("Dana"), false);
  assert.equal(ui.includes("George"), false);
  assert.equal(ui.includes('fetch("/api/ivr/voices"'), false);

  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /const voiceGender = "female"/);
  assert.match(config, /IVR_LOCKED_FEMALE_VOICE_ID/);
});

test("config composes seamless intro without extra ElevenLabs TTS", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /composeIvrIntroAudio|buildAndStoreComposedIntro/);
  assert.match(config, /composedWithoutElevenLabs:\s*true/);
  assert.match(config, /COMPOSED_INTRO_NOT_READY/);
  assert.match(config, /composedIntroAudio/);
  assert.match(config, /inboundPlaylist/);
  assert.match(config, /v3-outbound-concat|IVR_COMPOSE_VERSION/);

  const compose = readSrc("lib/calls/ivrComposeIntro.ts");
  assert.match(compose, /silenceremove/);
  assert.match(compose, /loudnorm/);
  assert.match(compose, /concat/);
  assert.match(compose, /composedDurationCoversSegments/);
  assert.equal(compose.includes("acrossfade="), false);
  assert.equal(compose.includes("synthesizeElevenLabsSpeech"), false);

  const eleven = readSrc("lib/calls/elevenlabs.ts");
  assert.match(eleven, /IVR_TTS_VOICE_SETTINGS/);
  assert.match(eleven, /IVR_TTS_OUTPUT_FORMAT|mp3_44100_128/);
});

test("dialer + webhook play sequential global + event name segments", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /eventNameAudioUrl/);
  assert.match(dialer, /voiceGender/);
  assert.equal(dialer.includes("synthesizeElevenLabsSpeech"), false);

  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  assert.match(webhook, /introBeforeEventName/);
  assert.match(webhook, /inboundBeforeEventName/);
  assert.match(webhook, /play_event_name/);
  assert.match(webhook, /play_intro_after/);
  assert.match(webhook, /getGlobalPackSegmentUrl/);
  assert.match(webhook, /getIvrSystemAudioUrlForGender/);
  assert.match(webhook, /call\.dtmf\.received/);
  assert.match(webhook, /answer_delay/);
  assert.match(webhook, /startOutboundFromBeginning/);
  assert.equal(webhook.includes("OUTBOUND_ANSWER_DELAY_MS"), false);
  assert.equal(webhook.includes("setTimeout"), false);
  assert.match(webhook, /introAfterEventName/);
  const route = readSrc("app/api/telnyx/ivr/webhook/route.ts");
  assert.equal(route.includes("OUTBOUND_ANSWER_DELAY_MS"), false);
  assert.equal(route.includes("after("), false);
});

test("User model stores eventNameAudio + voiceGender, not per-event fixed packs", () => {
  const user = readSrc("models/User.ts");
  assert.match(user, /eventNameAudio/);
  assert.match(user, /voiceGender/);
  assert.match(user, /systemVoiceId/);
  assert.match(user, /Per-event TTS: spoken event name only/);
});
