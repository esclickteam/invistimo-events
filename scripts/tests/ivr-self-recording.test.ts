/**
 * Personal IVR intro: one file up to 45s replaces the AI open, event name,
 * and menu prompt. Digits still use the shared phase machine.
 * No live Telnyx dials and no guest RSVP writes.
 */

import "./support/r2-test-env";
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initialIvrCallState,
  reduceIvrCall,
  type IvrCallMachineState,
  type IvrMachineEvent,
} from "../../lib/calls/ivrCallPhase";
import { IVR_COMPOSE_VERSION } from "../../lib/calls/ivrComposeIntro";
import { IVR_SELF_RECORD_MAX_SECONDS } from "../../lib/calls/ivrScript";
import {
  ivrIntroPlaybackPlan,
  personalIntroMediaUrl,
  prepareSelfRecordingForStorage,
  probedSelfRecordingTooLong,
  reportedSelfRecordingTooLong,
  selfRecordingContentTypeBlocksPlayback,
} from "../../lib/calls/ivrSelfRecording";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

function wavPcm(seconds: number, sampleRate = 8000) {
  const samples = Math.max(1, Math.round(seconds * sampleRate));
  const data = Buffer.alloc(samples * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function apply(state: IvrCallMachineState, event: IvrMachineEvent) {
  return reduceIvrCall(state, event);
}

function introPlaying() {
  const answered = apply(initialIvrCallState(), { type: "answered" });
  assert.equal(answered.commands[0]?.type, "play_intro");
  assert.equal(answered.state.audioRunning, true);
  assert.equal(answered.state.promptKind, "intro");
  return answered.state;
}

const hasFfmpeg =
  existsSync("/usr/bin/ffmpeg") || existsSync("/usr/local/bin/ffmpeg");

test("reported and probed durations block anything over 45 seconds", () => {
  assert.equal(IVR_SELF_RECORD_MAX_SECONDS, 45);
  for (const seconds of [10, 30, 45]) {
    assert.equal(reportedSelfRecordingTooLong(seconds), false);
    assert.equal(probedSelfRecordingTooLong(seconds), false);
  }
  assert.equal(reportedSelfRecordingTooLong(45.1), true);
  assert.equal(reportedSelfRecordingTooLong(46), true);
  assert.equal(probedSelfRecordingTooLong(45.4), false);
  assert.equal(probedSelfRecordingTooLong(46), true);
  assert.equal(selfRecordingContentTypeBlocksPlayback("audio/webm"), true);
  assert.equal(selfRecordingContentTypeBlocksPlayback("audio/mpeg"), false);
  assert.equal(selfRecordingContentTypeBlocksPlayback(""), false);
});

test("10, 30 and 45 second recordings become one mp3; longer audio is rejected", async () => {
  if (!hasFfmpeg) {
    assert.equal(reportedSelfRecordingTooLong(46), true);
    return;
  }
  for (const seconds of [10, 30, 45]) {
    const prepared = await prepareSelfRecordingForStorage({
      buffer: wavPcm(seconds),
      reportedSeconds: seconds,
    });
    assert.equal(prepared.ok, true, `expected ${seconds}s to be stored`);
    if (!prepared.ok) return;
    assert.equal(prepared.contentType, "audio/mpeg");
    assert.ok(prepared.buffer.length > 64);
    assert.ok(
      prepared.durationSeconds >= seconds - 1 &&
        prepared.durationSeconds <= 45,
      `stored duration ${prepared.durationSeconds} for ${seconds}s`
    );
    assert.equal(prepared.buffer[0] === 0x49 || prepared.buffer[0] === 0xff, true);
  }

  const tooLong = await prepareSelfRecordingForStorage({
    buffer: wavPcm(46),
    reportedSeconds: 0,
  });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.error, "DURATION_TOO_LONG");

  const reportedLong = await prepareSelfRecordingForStorage({
    buffer: wavPcm(2),
    reportedSeconds: 46,
  });
  assert.equal(reportedLong.ok, false);
  if (!reportedLong.ok) assert.equal(reportedLong.error, "DURATION_TOO_LONG");
});

test("personal playback replaces the three AI intro segments and leaves them stored", () => {
  const personal = "https://www.invistimo.com/api/ivr/media/personal";
  const eventName = "https://www.invistimo.com/api/ivr/media/name";
  const composed = "https://www.invistimo.com/api/ivr/media/composed";
  const files = { personal, eventName, composed };

  const selfPlan = ivrIntroPlaybackPlan({
    audioMode: "self_recorded",
    personalIntroUrl: personal,
    eventNameAudioUrl: eventName,
    composedIntroAudioUrl: composed,
  });
  assert.equal(selfPlan.audioMode, "self_recorded");
  assert.equal(selfPlan.introAudioUrl, personal);
  assert.equal(selfPlan.eventNameAudioUrl, "");
  assert.equal(selfPlan.composedIntroAudioUrl, "");
  assert.equal(selfPlan.replacesAiIntroSegments, true);

  const aiPlan = ivrIntroPlaybackPlan({
    audioMode: "ai",
    personalIntroUrl: personal,
    eventNameAudioUrl: eventName,
    composedIntroAudioUrl: composed,
  });
  assert.equal(aiPlan.audioMode, "ai");
  assert.equal(aiPlan.introAudioUrl, composed);
  assert.equal(aiPlan.eventNameAudioUrl, eventName);
  assert.equal(aiPlan.composedIntroAudioUrl, composed);
  assert.equal(aiPlan.replacesAiIntroSegments, false);
  assert.deepEqual(files, { personal, eventName, composed });
});

test("approved personal preview URL is the file Telnyx will play", async () => {
  ensureR2Env();
  const { resolveApprovedNarrationUrl } = await import("../../lib/calls/ivrDialer");
  const personalToken = "a".repeat(32);
  const composedToken = "b".repeat(32);
  const eventToken = "c".repeat(32);
  const personalUrl = `https://www.invistimo.com/api/ivr/media/${personalToken}`;
  const user = {
    ivrConfig: {
      audioMode: "self_recorded",
      voiceGender: "female",
      eventNameAudio: {
        status: "ready",
        approved: true,
        publicToken: eventToken,
        audioUrl: `https://www.invistimo.com/api/ivr/media/${eventToken}`,
        contentType: "audio/mpeg",
      },
      composedIntroAudio: {
        status: "ready",
        approved: true,
        publicToken: composedToken,
        audioUrl: `https://www.invistimo.com/api/ivr/media/${composedToken}`,
        contentType: "audio/mpeg",
        composeVersion: IVR_COMPOSE_VERSION,
        contentHash: "composed-hash",
      },
      introAudio: {
        status: "ready",
        approved: true,
        publicToken: personalToken,
        audioUrl: "https://stale.example/old.webm",
        r2Key: `ivr/intro/user/${personalToken}.mp3`,
        contentType: "audio/mpeg",
        durationSeconds: 30,
      },
      recordingApproval: {
        approved: true,
        audioMode: "self_recorded",
        audioPublicToken: personalToken,
        audioContentHash: `self:${personalToken}`,
        audioUrl: "https://stale.example/old.webm",
      },
    },
  };

  const guestUrl = resolveApprovedNarrationUrl(user);
  const previewUrl = personalIntroMediaUrl(user.ivrConfig.introAudio);
  assert.equal(previewUrl, personalUrl);
  assert.equal(guestUrl, previewUrl);
  assert.equal(guestUrl.includes(composedToken), false);
  assert.equal(guestUrl.includes(eventToken), false);

  const webm = {
    ivrConfig: {
      ...user.ivrConfig,
      introAudio: {
        ...user.ivrConfig.introAudio,
        contentType: "audio/webm",
      },
    },
  };
  assert.equal(resolveApprovedNarrationUrl(webm), "");

  const long = {
    ivrConfig: {
      ...user.ivrConfig,
      introAudio: {
        ...user.ivrConfig.introAudio,
        contentType: "audio/mpeg",
        durationSeconds: 46,
      },
    },
  };
  assert.equal(resolveApprovedNarrationUrl(long), "");

  const ai = {
    ivrConfig: {
      ...user.ivrConfig,
      audioMode: "ai",
      recordingApproval: {
        ...user.ivrConfig.recordingApproval,
        audioMode: "ai",
        audioPublicToken: composedToken,
        audioContentHash: "composed-hash",
      },
    },
  };
  const aiUrl = resolveApprovedNarrationUrl(ai);
  assert.match(aiUrl, new RegExp(composedToken));
  assert.equal(aiUrl.includes(personalToken), false);
  assert.equal(
    personalIntroMediaUrl(ai.ivrConfig.introAudio).includes(personalToken),
    true
  );
});

test("digits 1, 2 and 3 during the personal intro commit once and continue the same tree", () => {
  for (const digit of ["1", "2", "3"] as const) {
    const playing = introPlaying();
    const committed = apply(playing, { type: "dtmf", digit, stage: "intro" });
    if (digit === "1") {
      assert.equal(committed.commands[0]?.type, "play_ask_count");
      assert.equal(committed.state.rsvpApplied, false);
      assert.equal(
        committed.commands[0] && "mediaSlot" in committed.commands[0]
          ? committed.commands[0].mediaSlot
          : "",
        "none"
      );
      const again = apply(committed.state, { type: "dtmf", digit: "1", stage: "intro" });
      assert.equal(again.commands[0]?.type, "ignore");
      assert.equal(again.commands.some((command) => command.type === "play_ask_count"), false);
    } else {
      assert.equal(committed.commands[0]?.type, "apply_rsvp");
      assert.equal(committed.commands[1]?.type, "play_thanks");
      assert.equal(committed.state.rsvpApplied, true);
      const late = apply(committed.state, {
        type: "gather_ended",
        digits: digit,
        status: "valid",
        generation: playing.mediaGeneration,
        stage: "intro",
      });
      assert.equal(late.commands.some((command) => command.type === "apply_rsvp"), false);
      assert.equal(late.commands.some((command) => command.type === "play_thanks"), false);
    }
    const latePlayback = apply(committed.state, {
      type: "playback_ended",
      stage: "intro",
      status: "completed",
      generation: playing.mediaGeneration,
    });
    assert.equal(latePlayback.commands[0]?.type, "ignore");
    assert.equal(
      latePlayback.commands.some(
        (command) => command.type === "play_intro" || command.type === "apply_rsvp"
      ),
      false
    );
  }
});

test("a digit after the personal intro ends still follows the existing choice window", () => {
  const playing = introPlaying();
  const ended = apply(playing, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: playing.mediaGeneration,
  });
  assert.equal(ended.commands[0]?.type, "keep_gather");
  assert.equal(ended.state.introCompleted, true);
  const choice = apply(ended.state, {
    type: "gather_ended",
    digits: "1",
    status: "valid",
    generation: ended.state.mediaGeneration,
    stage: "intro",
  });
  assert.equal(choice.commands[0]?.type, "play_ask_count");
  const counted = apply(choice.state, {
    type: "gather_ended",
    digits: "4",
    status: "valid",
    generation: choice.state.mediaGeneration,
    stage: "ask_count",
  });
  assert.equal(counted.commands[0]?.type, "apply_rsvp");
  if (counted.commands[0]?.type === "apply_rsvp") {
    assert.equal(counted.commands[0].rsvp, "yes");
    assert.equal(counted.commands[0].attendingCount, 4);
  }
  const duplicate = apply(counted.state, {
    type: "gather_ended",
    digits: "4",
    status: "valid",
    generation: choice.state.mediaGeneration,
    stage: "ask_count",
  });
  assert.equal(duplicate.commands.some((command) => command.type === "apply_rsvp"), false);
});

test("personal intro uses the existing gather and does not build an AI file", () => {
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  const playIntro = machine.slice(
    machine.indexOf("function playIntroAudio"),
    machine.indexOf("async function reopenGatherAfterPrompt")
  );
  assert.match(playIntro, /playGatherPrompt/);
  assert.match(playIntro, /"intro"/);
  assert.match(playIntro, /"choice"/);
  assert.equal(playIntro.includes("self_recorded"), false);
  assert.match(machine, /const CHOICE_TIMEOUT_MS = 15000;/);

  const upload = readSrc("app/api/ivr/audio/upload/route.ts");
  assert.match(upload, /prepareSelfRecordingForStorage/);
  assert.match(upload, /DURATION_TOO_LONG/);
  assert.equal(upload.includes("eventNameAudio"), false);
  assert.equal(upload.includes("composedIntroAudio"), false);
  assert.equal(upload.includes("composeIvrIntroAudio"), false);

  const dialer = readSrc("lib/calls/ivrDialer.ts");
  const execute = dialer.slice(
    dialer.indexOf("export async function executeIvrRound"),
    dialer.indexOf("export async function fillIvrRoundCapacity")
  );
  const confirmAt = execute.indexOf("confirmSelfRecordingAvailableToTelnyx");
  const claimAt = execute.indexOf("claimRound(");
  assert.ok(confirmAt > 0 && claimAt > confirmAt);
  assert.match(execute, /audioMode === "self_recorded"/);
  assert.match(execute, /ivrIntroPlaybackPlan/);

  const start = readSrc("lib/calls/ivrInboundStart.ts");
  const matched = start.slice(
    start.indexOf("const playback = ivrIntroPlaybackPlan"),
    start.indexOf("INBOUND_IVR_CLAIMED")
  );
  assert.match(matched, /audioMode: playback\.audioMode/);
  assert.equal(matched.includes('audioMode: "ai"'), false);
  assert.match(matched, /introAudioUrl = playback.introAudioUrl/);

  const media = readSrc("app/api/ivr/media/[token]/route.ts");
  assert.match(media, /PERSONAL_R2_KEY_MISSING/);
  assert.match(media, /self \? introKey : composedKey/);

  const ui = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(ui, /data-testid="ivr-self-preview"/);
  assert.match(ui, /תצוגה מקדימה זהה/);
  assert.match(ui, /measureAudioDuration/);
  assert.match(ui, /SELF_MAX_SECONDS/);
});
