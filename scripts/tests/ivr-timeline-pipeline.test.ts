/**
 * IVR timeline must use Mongoose 9 updatePipeline, and new-user answer
 * must not race into silence when the approved file is missing.
 * No Telnyx dials and no guest RSVP writes.
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

function ensureR2Env() {
  process.env.R2_BUCKET_NAME ||= "test-bucket";
  process.env.R2_ACCOUNT_ID ||= "test-account";
  process.env.R2_ACCESS_KEY_ID ||= "test-key";
  process.env.R2_SECRET_ACCESS_KEY ||= "test-secret";
  process.env.R2_ENDPOINT ||= "https://example.invalid";
  process.env.NEXT_PUBLIC_APP_URL ||= "https://www.invistimo.com";
}

test("pushIvrTimeline uses updatePipeline for aggregation updates", () => {
  const src = readSrc("lib/calls/ivrCallTimeline.ts");
  assert.match(src, /updatePipeline:\s*true/);
  assert.match(src, /IvrCallAttempt\.updateOne/);
  assert.match(src, /\$concatArrays/);
  const updateCall = src.slice(src.indexOf("IvrCallAttempt.updateOne"));
  assert.match(updateCall, /updatePipeline:\s*true/);
});

test("timeline entry builder keeps append-only facts", async () => {
  ensureR2Env();
  const { buildTimelineEntry, playbackCommandLabel } = await import(
    "../../lib/calls/ivrCallTimeline"
  );
  const entry = buildTimelineEntry({
    source: "telnyx",
    kind: "playback_started",
    label: "התחילה השמעה",
    detail: "call.playback.started",
    eventType: "call.playback.started",
  });
  assert.equal(entry.source, "telnyx");
  assert.equal(entry.kind, "playback_started");
  assert.equal(entry.eventType, "call.playback.started");
  assert.ok(entry.at instanceof Date);
  assert.equal(
    playbackCommandLabel("play_event_name"),
    "נשלחה פקודת השמעה: פתיח"
  );
  assert.equal(
    playbackCommandLabel("intro_after_event"),
    "נשלחה פקודת השמעה: שם האירוע"
  );
  assert.equal(playbackCommandLabel("choice"), "נשלחה פקודת השמעה: המשך");
});

test("inbound start stamps AUDIO_NOT_READY before answer", () => {
  const start = readSrc("lib/calls/ivrInboundStart.ts");
  const matchedCreateAt = start.indexOf("introAudioUrl,");
  const matchedAnswerAt = start.indexOf(
    "await answerIvrCall",
    matchedCreateAt
  );
  const errorAt = start.indexOf('error: "AUDIO_NOT_READY"', matchedCreateAt);
  assert.ok(matchedCreateAt > 0 && matchedAnswerAt > matchedCreateAt);
  assert.ok(errorAt > matchedCreateAt && errorAt < matchedAnswerAt);
  assert.equal(start.includes('attempt.error = "AUDIO_NOT_READY"'), false);
  assert.match(start, /hasIntroAudio/);
  assert.match(start, /audioNotReady/);
  assert.match(start, /composedInboundPlaybackUrl/);
});

test("answer claim does not require playbackStartedAt null", () => {
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  const claimBlock = machine.slice(
    machine.indexOf("export async function handleIvrAnswered"),
    machine.indexOf("export async function handleIvrPlaybackEnded")
  );
  assert.equal(claimBlock.includes("playbackStartedAt: null"), false);
  assert.match(claimBlock, /IVR_ANSWER_CLAIM_MISSED|speakNotReady/);
  assert.match(claimBlock, /AUDIO_NOT_READY/);
});

test("new user without approved composition is not dial-ready", async () => {
  ensureR2Env();
  const { resolveApprovedNarrationUrl } = await import(
    "../../lib/calls/ivrDialer"
  );
  const { IVR_COMPOSE_VERSION } = await import(
    "../../lib/calls/ivrComposeIntro"
  );

  const brandNew = {
    ivrConfig: {
      audioMode: "ai",
      voiceGender: "female",
      eventNameAudio: { status: "missing", approved: false },
      composedIntroAudio: { status: "missing", approved: false },
      recordingApproval: { approved: false },
    },
  };
  assert.equal(resolveApprovedNarrationUrl(brandNew), "");

  const token = "a".repeat(32);
  const readyExisting = {
    ivrConfig: {
      audioMode: "ai",
      voiceGender: "female",
      eventNameAudio: {
        status: "ready",
        approved: true,
        publicToken: token,
        audioUrl: `https://www.invistimo.com/api/ivr/media/${token}`,
      },
      composedIntroAudio: {
        status: "ready",
        approved: true,
        publicToken: token,
        audioUrl: `https://www.invistimo.com/api/ivr/media/${token}`,
        composeVersion: IVR_COMPOSE_VERSION,
      },
      recordingApproval: {
        approved: true,
        audioMode: "ai",
        audioPublicToken: token,
        audioUrl: `https://www.invistimo.com/api/ivr/media/${token}`,
      },
    },
  };
  const url = resolveApprovedNarrationUrl(readyExisting);
  assert.match(url, /\/api\/ivr\/media\//);
  assert.match(url, new RegExp(token));
});

test("media helper rejects empty and non-audio buffers", async () => {
  ensureR2Env();
  const { looksLikePlayableAudioBuffer, isPlayableAudioContentType } =
    await import("../../lib/calls/ivrAudioStorage");

  assert.equal(isPlayableAudioContentType("audio/mpeg"), true);
  assert.equal(isPlayableAudioContentType("text/html"), false);
  assert.equal(looksLikePlayableAudioBuffer(Buffer.alloc(0)), false);
  assert.equal(looksLikePlayableAudioBuffer(Buffer.alloc(32, 0)), false);
  assert.equal(
    looksLikePlayableAudioBuffer(
      Buffer.from("not audio at all, just text padding!!")
    ),
    false
  );

  const id3 = Buffer.alloc(128, 0);
  id3[0] = 0x49;
  id3[1] = 0x44;
  id3[2] = 0x33;
  assert.equal(looksLikePlayableAudioBuffer(id3, "audio/mpeg"), true);

  const mpeg = Buffer.alloc(128, 0);
  mpeg[0] = 0xff;
  mpeg[1] = 0xfb;
  assert.equal(looksLikePlayableAudioBuffer(mpeg, "audio/mpeg"), true);
});

test("media route returns INVALID_AUDIO for non-playable payloads", () => {
  const media = readSrc("app/api/ivr/media/[token]/route.ts");
  assert.match(media, /looksLikePlayableAudioBuffer/);
  assert.match(media, /INVALID_AUDIO/);
  assert.match(media, /EMPTY_AUDIO/);
});

test("webhook still drives answer → playback → gather for new and existing users", () => {
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  const start = readSrc("lib/calls/ivrInboundStart.ts");
  assert.match(webhook, /pushIvrTimeline/);
  assert.match(webhook, /handleIvrAnswered/);
  assert.match(webhook, /handleIvrPlaybackEnded/);
  assert.match(machine, /playbackIvrAudio/);
  assert.match(machine, /gatherIvrDigits/);
  assert.match(start, /resolveApprovedNarrationUrl/);
  assert.match(start, /composedInboundPlaybackUrl/);
  assert.match(start, /phase:\s*"RINGING"/);
  assert.equal(start.includes("ensureComposedInboundAudioForUser"), false);
  assert.equal(start.includes("gatherIvrUsingAudio"), false);
});

test("pushIvrTimeline passes updatePipeline to mongoose updateOne", async () => {
  ensureR2Env();
  const IvrCallAttempt = (await import("../../models/IvrCallAttempt")).default;
  const calls: unknown[] = [];
  const original = IvrCallAttempt.updateOne.bind(IvrCallAttempt);
  IvrCallAttempt.updateOne = ((filter: unknown, update: unknown, options: unknown) => {
    calls.push({ filter, update, options });
    return Promise.resolve({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });
  }) as typeof IvrCallAttempt.updateOne;

  try {
    const { pushIvrTimeline } = await import("../../lib/calls/ivrCallTimeline");
    await pushIvrTimeline("507f1f77bcf86cd799439011", {
      source: "telnyx",
      kind: "answered",
      label: "האורח ענה",
      eventType: "call.answered",
    }, {
      setIfEmpty: { ringingAt: new Date("2026-10-09T12:00:00.000Z") },
    });
  } finally {
    IvrCallAttempt.updateOne = original;
  }

  assert.equal(calls.length, 1);
  const call = calls[0] as {
    update: unknown;
    options: { updatePipeline?: boolean };
  };
  assert.equal(Array.isArray(call.update), true);
  assert.equal(call.options?.updatePipeline, true);
});
