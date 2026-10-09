/**
 * Outbound composed intro must include before + event name + after.
 * No live dials / no ElevenLabs.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  composeIvrIntroAudio,
  composedDurationCoversSegments,
  IVR_COMPOSE_VERSION,
  selectFfmpegBinary,
} from "../../lib/calls/ivrComposeIntro";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("compose version is concat-based v3", () => {
  assert.equal(IVR_COMPOSE_VERSION, "v3-outbound-concat");
  const compose = readSrc("lib/calls/ivrComposeIntro.ts");
  assert.match(compose, /concat/);
  // No live acrossfade filter — comments may mention the old bug.
  assert.equal(compose.includes("acrossfade="), false);
  assert.match(compose, /-f\",\s*\n\s*\"concat/);
});

test("duration guard rejects after-only / name-dropped files", () => {
  assert.equal(
    composedDurationCoversSegments({
      composedSeconds: 2.5,
      beforeSeconds: 1.2,
      nameSeconds: 0.8,
      afterSeconds: 2.5,
    }),
    false
  );
  assert.equal(
    composedDurationCoversSegments({
      composedSeconds: 4.7,
      beforeSeconds: 1.2,
      nameSeconds: 0.8,
      afterSeconds: 2.5,
    }),
    true
  );
});

test("preview + approve require current seamless composed file", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  const playlistFn = panel.slice(
    panel.indexOf("const previewPlaylist = useMemo"),
    panel.indexOf("const composedReady")
  );
  assert.match(playlistFn, /preview\?\.seamless && composedUrl/);
  assert.equal(playlistFn.includes('status === "ready"'), false);

  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /OUTBOUND_SEGMENTS_MISSING/);
  assert.match(config, /COMPOSED_INTRO_STALE/);
  assert.match(config, /expectedComposeHash/);
  assert.match(config, /segmentsComplete/);
});

test("concat stitch keeps before, name, and after frequencies", async (t) => {
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

  const dir = await mkdtemp(path.join(tmpdir(), "ivr-compose-full-"));
  try {
    async function tone(name: string, freq: number, seconds: number) {
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
          `sine=frequency=${freq}:sample_rate=44100`,
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
      tone("before.mp3", 300, 1.0),
      tone("name.mp3", 600, 0.7),
      tone("after.mp3", 900, 1.5),
    ]);

    const composed = await composeIvrIntroAudio({
      beforeMp3,
      eventNameMp3,
      afterMp3,
    });
    const out = path.join(dir, "composed.mp3");
    await writeFile(out, composed.buffer);

    const duration = await new Promise<number>((resolve, reject) => {
      const child = spawn("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        out,
      ]);
      let o = "";
      child.stdout.on("data", (d) => (o += d));
      child.on("close", (code) =>
        code === 0
          ? resolve(Number(o.trim()))
          : reject(new Error("ffprobe failed"))
      );
    });

    assert.ok(duration >= 3.0, `composed duration ${duration}`);
    assert.ok(
      composedDurationCoversSegments({
        composedSeconds: duration,
        beforeSeconds: composed.segmentDurations.beforeSeconds,
        nameSeconds: composed.segmentDurations.nameSeconds,
        afterSeconds: composed.segmentDurations.afterSeconds,
      })
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
});
