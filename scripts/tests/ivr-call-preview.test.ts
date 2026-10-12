/**
 * Sample IVR call: same clips and keypad results, no dial and no RSVP writes.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentHashForComposedInbound,
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
  IVR_INBOUND_COMPOSE_VERSION,
} from "../../lib/calls/ivrComposeIntro";
import { buildIvrPreviewPlaylist } from "../../lib/calls/ivrPreviewPlaylist";
import {
  createPreviewSim,
  IVR_PREVIEW_COUNT_DIGIT_MAX,
  IVR_PREVIEW_COUNT_IDLE_MS,
  previewSimClipEnded,
  previewSimCountIdle,
  previewSimDigit,
} from "../../lib/calls/ivrPreviewSim";
import { ivrSpokenNameHash } from "../../lib/calls/ivrSpokenEventName";
import { IVR_GLOBAL_PACK_TEXTS } from "../../lib/calls/ivrScript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

const followUps = {
  askCount: "https://example.com/ask.mp3",
  thanksYes: "https://example.com/yes.mp3",
  thanksOther: "https://example.com/other.mp3",
  invalidChoice: "https://example.com/bad.mp3",
  invalidCount: "https://example.com/bad-count.mp3",
};

function readyConfig(spokenName: string) {
  const voiceId = "voice-female";
  const nameHash = ivrSpokenNameHash({
    spokenName,
    voiceId,
    voiceGender: "female",
  });
  const pack = {
    beforeHash: "before",
    afterHash: "after",
    inboundBeforeHash: "in-before",
    inboundAfterHash: "in-after",
    voiceId,
  };
  const composeHash = contentHashForComposedIntro({
    beforeHash: pack.beforeHash,
    eventNameHash: nameHash,
    afterHash: pack.afterHash,
    voiceId,
  });
  return {
    voiceId,
    nameHash,
    pack,
    cfg: {
      audioMode: "ai",
      voiceGender: "female",
      eventName: spokenName,
      eventNamePronunciation: "",
      eventNameAudio: {
        status: "ready",
        contentHash: nameHash,
        r2Key: "name-key",
        publicToken: "name-token",
        approved: true,
      },
      composedIntroAudio: {
        status: "ready",
        composeVersion: IVR_COMPOSE_VERSION,
        contentHash: composeHash,
        r2Key: "composed-key",
        publicToken: "composed-token",
        approved: true,
      },
      composedInboundAudio: {
        status: "ready",
        composeVersion: IVR_INBOUND_COMPOSE_VERSION,
        contentHash: contentHashForComposedInbound({
          beforeHash: pack.inboundBeforeHash,
          eventNameHash: nameHash,
          afterHash: pack.inboundAfterHash,
          voiceId,
        }),
        eventNameContentHash: nameHash,
        r2Key: "inbound-key",
      },
      recordingApproval: {
        approved: true,
        audioMode: "ai",
        audioContentHash: composeHash,
        audioPublicToken: "composed-token",
      },
    },
  };
}

test("sample call plays the stored intro and the existing follow-up wording", () => {
  const spokenName = "החתונה של דניאל ונועה";
  const ready = readyConfig(spokenName);
  const playlist = buildIvrPreviewPlaylist({
    spokenName,
    voiceGender: "female",
    voiceId: ready.voiceId,
    cfg: ready.cfg,
    composedUrl: "https://example.com/composed.mp3",
    eventNameUrl: "https://example.com/name.mp3",
    beforeUrl: "https://example.com/before.mp3",
    beforeHash: ready.pack.beforeHash,
    afterUrl: "https://example.com/after.mp3",
    afterHash: ready.pack.afterHash,
    inboundBeforeHash: ready.pack.inboundBeforeHash,
    inboundAfterHash: ready.pack.inboundAfterHash,
    clips: followUps,
  });

  assert.equal(playlist.ready, true);
  assert.deepEqual(playlist.introUrls, ["https://example.com/composed.mp3"]);
  assert.equal(playlist.texts.askCount, IVR_GLOBAL_PACK_TEXTS.afterPress1);
  assert.equal(playlist.texts.thanksYes, IVR_GLOBAL_PACK_TEXTS.afterValidQuantity);
  assert.equal(playlist.texts.thanksOther, IVR_GLOBAL_PACK_TEXTS.afterPress2Or3);
  assert.equal(playlist.texts.invalidChoice, IVR_GLOBAL_PACK_TEXTS.invalidInput);
  assert.equal(playlist.texts.invalidCount, IVR_GLOBAL_PACK_TEXTS.invalidGuestCount);
  assert.match(playlist.texts.intro, /החתונה של דניאל ונועה/);
  assert.match(playlist.texts.intro, /הקישו 1/);
});

test("a changed event name is not played from the previous clip", () => {
  const ready = readyConfig("החתונה של דניאל ונועה");
  const playlist = buildIvrPreviewPlaylist({
    spokenName: "החתונה של מאיה ויואב",
    voiceGender: "female",
    voiceId: ready.voiceId,
    cfg: ready.cfg,
    composedUrl: "https://example.com/composed.mp3",
    eventNameUrl: "https://example.com/name.mp3",
    beforeUrl: "https://example.com/before.mp3",
    beforeHash: ready.pack.beforeHash,
    afterUrl: "https://example.com/after.mp3",
    afterHash: ready.pack.afterHash,
    clips: followUps,
  });
  assert.equal(playlist.ready, false);
  assert.deepEqual(playlist.introUrls, []);
});

test("keypad 1 then a count plays the yes ending, and 2 or 3 play the other ending", () => {
  let state = previewSimClipEnded(createPreviewSim());
  assert.equal(state.phase, "choice");

  state = previewSimDigit(state, "1");
  assert.equal(state.clip, "askCount");
  state = previewSimDigit(state, "4");
  state = previewSimClipEnded(state);
  state = previewSimCountIdle(state);
  assert.equal(state.clip, "thanksYes");
  assert.equal(state.countDigits, "4");

  state = previewSimClipEnded(createPreviewSim());
  state = previewSimDigit(state, "2");
  assert.equal(state.clip, "thanksOther");
  assert.equal(state.countDigits, "");

  state = previewSimClipEnded(createPreviewSim());
  state = previewSimDigit(state, "3");
  assert.equal(state.clip, "thanksOther");
});

test("invalid choice and invalid count stay inside the sample and can be retried", () => {
  let state = previewSimClipEnded(createPreviewSim());
  state = previewSimDigit(state, "9");
  assert.equal(state.clip, "invalidChoice");
  state = previewSimClipEnded(state);
  assert.equal(state.phase, "choice");
  state = previewSimDigit(state, "1");
  state = previewSimDigit(state, "#");
  assert.equal(state.clip, "invalidCount");
  state = previewSimClipEnded(state);
  state = previewSimDigit(state, "0");
  state = previewSimCountIdle(state);
  assert.equal(state.clip, "invalidCount");
  state = previewSimClipEnded(state);
  state = previewSimDigit(state, "2");
  state = previewSimDigit(state, "#");
  assert.equal(state.clip, "thanksYes");
  assert.equal(state.countDigits, "2");
});

test("intro ignores unrelated keys, and the count stops at three digits", () => {
  let state = createPreviewSim();
  state = previewSimDigit(state, "9");
  assert.equal(state.clip, "intro");

  state = previewSimDigit(state, "1");
  for (const digit of ["1", "2", "3", "4"]) {
    state = previewSimDigit(state, digit);
  }
  assert.equal(state.countDigits, "123");
  assert.equal(IVR_PREVIEW_COUNT_DIGIT_MAX, 3);
  assert.equal(IVR_PREVIEW_COUNT_IDLE_MS, 1000);
  state = previewSimCountIdle(state);
  assert.equal(state.clip, "thanksYes");
});

test("sample call route and screen do not dial or write guest data", () => {
  const route = readSrc("app/api/ivr/preview/route.ts");
  const screen = readSrc("app/components/IvrCallPreview.jsx");
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");

  assert.match(route, /export async function GET/);
  assert.equal(route.includes("export async function POST"), false);
  assert.equal(route.includes("IvrCallAttempt"), false);
  assert.equal(route.includes("ensureAutoIvrNarration"), false);
  assert.equal(route.includes("synthesizeElevenLabsSpeech"), false);
  assert.equal(route.includes("telnyx"), false);
  assert.equal(route.includes(".updateOne"), false);
  assert.equal(route.includes(".save("), false);
  assert.match(route, /resolveSpokenIvrEventName/);

  assert.match(screen, /האזנה לשיחה לדוגמה/);
  assert.match(screen, /\/api\/ivr\/preview/);
  assert.equal(screen.includes("telnyx"), false);
  assert.equal(screen.includes("rsvp"), false);
  assert.match(panel, /IvrCallPreview/);
  assert.match(panel, /ivr-auto-narration-note/);
  assert.equal(panel.includes("הקלטה אישית"), false);
  assert.equal(panel.includes("אני מאשר"), false);

  assert.match(webhook, /const COUNT_DIGIT_MAX = 3/);
  assert.match(webhook, /const COUNT_INTER_DIGIT_MS = 1000/);
  assert.equal(readSrc("lib/calls/ivrDialer.ts").includes("ivrPreviewSim"), false);
});
