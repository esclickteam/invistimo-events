/**
 * Inbound narration is one prebuilt file, not three Telnyx playbacks.
 * No live calls and no ElevenLabs.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  composeIvrIntroAudio,
  contentHashForComposedInbound,
  contentHashForComposedIntro,
  IVR_COMPOSED_SEGMENT_PAUSE_MS,
  IVR_INBOUND_CHAINED_MEDIA_COMMANDS,
  IVR_INBOUND_CONTINUOUS_MEDIA_COMMANDS,
  IVR_INBOUND_COMPOSE_VERSION,
  selectFfmpegBinary,
} from "../../lib/calls/ivrComposeIntro";
import { existsSync } from "node:fs";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("inbound and outbound compositions do not share a file hash", () => {
  const input = {
    beforeHash: "before",
    eventNameHash: "name",
    afterHash: "after",
    voiceId: "voice",
  };
  assert.notEqual(
    contentHashForComposedInbound(input),
    contentHashForComposedIntro(input)
  );
  assert.equal(IVR_INBOUND_COMPOSE_VERSION, "v1-inbound-segments");
  assert.equal(IVR_COMPOSED_SEGMENT_PAUSE_MS, 80);
  assert.equal(IVR_INBOUND_CHAINED_MEDIA_COMMANDS, 3);
  assert.equal(IVR_INBOUND_CONTINUOUS_MEDIA_COMMANDS, 1);
});

test("a ready inbound file plays only when it matches the stored event name", async () => {
  process.env.R2_BUCKET_NAME ||= "test-bucket";
  process.env.R2_ENDPOINT ||= "https://example.r2.cloudflarestorage.com";
  process.env.R2_ACCESS_KEY_ID ||= "test";
  process.env.R2_SECRET_ACCESS_KEY ||= "test";
  process.env.NEXT_PUBLIC_APP_URL = "https://www.invistimo.com";
  const { composedInboundPlaybackUrl } = await import(
    "../../lib/calls/ivrComposedInbound.ts"
  );
  const current = composedInboundPlaybackUrl({
    eventNameAudio: { status: "ready", contentHash: "name-hash" },
    composedInboundAudio: {
      status: "ready",
      composeVersion: IVR_INBOUND_COMPOSE_VERSION,
      eventNameContentHash: "name-hash",
      publicToken: "token-token-token-token",
      audioUrl: "https://example.test/old.mp3",
    },
  });
  assert.match(current, /token-token-token-token/);

  const stale = composedInboundPlaybackUrl({
    eventNameAudio: { status: "ready", contentHash: "new-name" },
    composedInboundAudio: {
      status: "ready",
      composeVersion: IVR_INBOUND_COMPOSE_VERSION,
      eventNameContentHash: "name-hash",
      publicToken: "token-token-token-token",
      audioUrl: "https://example.test/old.mp3",
    },
  });
  assert.equal(stale, "");
});

test("stitching three clips yields one file with only the short internal pause", async (t) => {
  const ffmpeg = selectFfmpegBinary(
    [
      process.env.FFMPEG_PATH || "",
      path.join(root, "node_modules", "ffmpeg-static", "ffmpeg"),
    ],
    existsSync
  );
  if (!ffmpeg) {
    t.skip("ffmpeg binary unavailable");
    return;
  }

  const dir = await mkdtemp(path.join(tmpdir(), "ivr-inbound-compose-"));
  try {
    async function tone(name: string, seconds: number) {
      const file = path.join(dir, name);
      await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpeg, [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:sample_rate=44100",
          "-t",
          String(seconds),
          "-ac",
          "1",
          "-b:a",
          "128k",
          file,
        ]);
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`tone ${code}`))
        );
      });
      return readFile(file);
    }

    const [beforeMp3, eventNameMp3, afterMp3] = await Promise.all([
      tone("before.mp3", 0.4),
      tone("name.mp3", 0.35),
      tone("after.mp3", 0.5),
    ]);

    const started = Date.now();
    const composed = await composeIvrIntroAudio({
      beforeMp3,
      eventNameMp3,
      afterMp3,
    });
    const stitchMs = Date.now() - started;

    assert.equal(composed.contentType, "audio/mpeg");
    assert.ok(composed.buffer.length > beforeMp3.length);
    assert.ok(composed.buffer.length > eventNameMp3.length);
    assert.ok(composed.buffer.length > afterMp3.length);
    assert.equal(IVR_COMPOSED_SEGMENT_PAUSE_MS < 200, true);
    assert.ok(stitchMs < 15000, `stitch took ${stitchMs}ms`);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
});

test("live inbound prefers one gather and outbound playback is unchanged", () => {
  const start = readSrc("lib/calls/ivrInboundStart.ts");
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(start, /gatherIvrUsingAudio/);
  assert.match(start, /composedInboundPlaybackUrl/);
  assert.equal(start.includes("synthesizeElevenLabsSpeech"), false);
  assert.match(webhook, /startOutboundFromBeginning/);
  assert.match(webhook, /introBeforeEventName/);
  assert.match(webhook, /play_event_name/);
  assert.match(dialer, /IvrCallAttempt\.create/);
  assert.equal(dialer.includes("synthesizeElevenLabsSpeech"), false);
  assert.match(readSrc("lib/calls/ivrComposedInbound.ts"), /composeIvrIntroAudio/);
  assert.equal(
    readSrc("lib/calls/ivrComposedInbound.ts").includes(
      "synthesizeElevenLabsSpeech"
    ),
    false
  );
});
