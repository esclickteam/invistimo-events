/**
 * Server-side seamless compose of:
 *   global introBeforeEventName + eventNameAudio + global introAfterEventName
 *
 * No ElevenLabs credits — ffmpeg only (trim silence, normalize, short crossfade).
 */

import { createHash } from "crypto";
import { chmodSync, copyFileSync, existsSync, statSync } from "fs";
import { createRequire } from "module";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";

/** Outbound only: introBeforeEventName + event name + introAfterEventName. */
export const IVR_COMPOSE_VERSION = "v2-outbound-segments";

/**
 * Inbound only: inboundBeforeEventName + event name + inboundAfterEventName.
 * Different wording from the outbound file, so it must not reuse that hash.
 */
export const IVR_INBOUND_COMPOSE_VERSION = "v1-inbound-segments";

/** Very short natural pause around the event name (seconds). */
const NAME_PAUSE_SEC = 0.08;

/** Silence inserted around the event name inside one file, in milliseconds. */
export const IVR_COMPOSED_SEGMENT_PAUSE_MS = Math.round(NAME_PAUSE_SEC * 1000);

/**
 * The old inbound player issued a separate Telnyx media command per clip and
 * waited for call.playback.ended between them. One composed file is a single command.
 */
export const IVR_INBOUND_CHAINED_MEDIA_COMMANDS = 3;
export const IVR_INBOUND_CONTINUOUS_MEDIA_COMMANDS = 1;
/** Crossfade duration at junctions (seconds) — soft join, not a hard cut. */
const CROSSFADE_SEC = 0.03;

const require = createRequire(import.meta.url);

let resolvedFfmpegBin: string | null = null;

/** Ignore Next's bundled placeholder (`/ROOT/node_modules/...`), which does not exist on Vercel. */
export function selectFfmpegBinary(
  candidates: string[],
  exists: (filePath: string) => boolean
): string | null {
  for (const candidate of candidates) {
    const filePath = String(candidate || "").trim();
    if (!filePath) continue;
    if (filePath === "/ROOT" || filePath.startsWith("/ROOT/")) continue;
    if (exists(filePath)) return filePath;
  }
  return null;
}

function ffmpegSearchPaths(reported: string | null): string[] {
  const cwd = process.cwd();
  const taskRoot = process.env.LAMBDA_TASK_ROOT || "";
  return [
    process.env.FFMPEG_PATH || "",
    process.env.FFMPEG_BIN || "",
    reported || "",
    path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"),
    taskRoot
      ? path.join(taskRoot, "node_modules", "ffmpeg-static", "ffmpeg")
      : "",
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
  ];
}

function makeRunnable(source: string): string {
  const dest = path.join(tmpdir(), "ivr-ffmpeg");
  try {
    if ((statSync(source).mode & 0o111) !== 0) return source;
    chmodSync(source, 0o755);
    return source;
  } catch {
    /* The traced binary is often not executable on the read-only function bundle. */
  }
  copyFileSync(source, dest);
  chmodSync(dest, 0o755);
  return dest;
}

function resolveFfmpegPath() {
  if (resolvedFfmpegBin) return resolvedFfmpegBin;

  let reported: string | null = null;
  try {
    const ffmpegStatic = require("ffmpeg-static") as string | null;
    if (typeof ffmpegStatic === "string") reported = ffmpegStatic;
  } catch {
    reported = null;
  }

  const found = selectFfmpegBinary(ffmpegSearchPaths(reported), existsSync);
  if (!found) {
    if (reported && (reported === "/ROOT" || reported.startsWith("/ROOT/"))) {
      throw new Error(
        "ffmpeg_failed:ENOENT:static binary was not included in the function bundle"
      );
    }
    resolvedFfmpegBin = "ffmpeg";
    return resolvedFfmpegBin;
  }

  resolvedFfmpegBin = makeRunnable(found);
  return resolvedFfmpegBin;
}

function runFfmpeg(args: string[]): Promise<void> {
  const bin = resolveFfmpegPath();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["-y", "-hide_banner", "-loglevel", "error", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg_failed:${code}:${stderr.slice(0, 400)}`));
    });
  });
}

/**
 * Prepare one clip: mono 44.1kHz PCM wav, silence trimmed, loudness normalized.
 */
async function prepareClip(inputPath: string, outputPath: string) {
  // Trim leading/trailing silence; keep a tiny tail so speech doesn't clip.
  // Then loudnorm so before/name/after sit at the same level.
  const af = [
    "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-38dB:detection=peak",
    "areverse",
    "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-38dB:detection=peak",
    "areverse",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
  ].join(",");

  await runFfmpeg([
    "-i",
    inputPath,
    "-af",
    af,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

async function makeSilenceWav(outputPath: string, seconds: number) {
  await runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=44100:cl=mono`,
    "-t",
    String(seconds),
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

/**
 * Join prepared wavs with short silence pads + micro crossfade.
 * Order: before | pause | name | pause | after
 */
async function joinWithNaturalPauses(input: {
  beforeWav: string;
  nameWav: string;
  afterWav: string;
  pauseWav: string;
  outMp3: string;
}) {
  // acrossfade chain for soft junctions after short silence pads.
  // Graph: before~pause → ab; ab~name → abn; abn~pause → abnp; abnp~after → out
  const filter = [
    `[0][3]acrossfade=d=${CROSSFADE_SEC}:c1=tri:c2=tri[bp]`,
    `[bp][1]acrossfade=d=${CROSSFADE_SEC}:c1=tri:c2=tri[bpn]`,
    `[bpn][3]acrossfade=d=${CROSSFADE_SEC}:c1=tri:c2=tri[bpnp]`,
    `[bpnp][2]acrossfade=d=${CROSSFADE_SEC}:c1=tri:c2=tri[out]`,
  ].join(";");

  await runFfmpeg([
    "-i",
    input.beforeWav,
    "-i",
    input.nameWav,
    "-i",
    input.afterWav,
    "-i",
    input.pauseWav,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-b:a",
    "128k",
    "-f",
    "mp3",
    input.outMp3,
  ]);
}

function composeContentHash(
  version: string,
  input: {
    beforeHash: string;
    eventNameHash: string;
    afterHash: string;
    voiceId: string;
  }
) {
  return createHash("sha256")
    .update(
      [
        version,
        input.voiceId,
        input.beforeHash,
        input.eventNameHash,
        input.afterHash,
        String(NAME_PAUSE_SEC),
        String(CROSSFADE_SEC),
      ].join("|")
    )
    .digest("hex");
}

export function contentHashForComposedIntro(input: {
  beforeHash: string;
  eventNameHash: string;
  afterHash: string;
  voiceId: string;
}) {
  return composeContentHash(IVR_COMPOSE_VERSION, input);
}

export function contentHashForComposedInbound(input: {
  beforeHash: string;
  eventNameHash: string;
  afterHash: string;
  voiceId: string;
}) {
  return composeContentHash(IVR_INBOUND_COMPOSE_VERSION, input);
}

export async function composeIvrIntroAudio(input: {
  beforeMp3: Buffer;
  eventNameMp3: Buffer;
  afterMp3: Buffer;
}): Promise<{ buffer: Buffer; contentType: string; durationSeconds: number | null }> {
  if (!input.beforeMp3?.length || !input.eventNameMp3?.length || !input.afterMp3?.length) {
    throw new Error("IVR_COMPOSE_MISSING_INPUT");
  }

  const dir = await mkdtemp(path.join(tmpdir(), "ivr-compose-"));
  try {
    const beforeIn = path.join(dir, "before.in.mp3");
    const nameIn = path.join(dir, "name.in.mp3");
    const afterIn = path.join(dir, "after.in.mp3");
    const beforeWav = path.join(dir, "before.wav");
    const nameWav = path.join(dir, "name.wav");
    const afterWav = path.join(dir, "after.wav");
    const pauseWav = path.join(dir, "pause.wav");
    const outMp3 = path.join(dir, "composed.mp3");

    await Promise.all([
      writeFile(beforeIn, input.beforeMp3),
      writeFile(nameIn, input.eventNameMp3),
      writeFile(afterIn, input.afterMp3),
    ]);

    await Promise.all([
      prepareClip(beforeIn, beforeWav),
      prepareClip(nameIn, nameWav),
      prepareClip(afterIn, afterWav),
      makeSilenceWav(pauseWav, NAME_PAUSE_SEC),
    ]);

    try {
      await joinWithNaturalPauses({
        beforeWav,
        nameWav,
        afterWav,
        pauseWav,
        outMp3,
      });
    } catch (xfadeErr) {
      // Fallback for very short clips where acrossfade can't run.
      console.warn(
        "[ivrComposeIntro] acrossfade failed — concat fallback",
        xfadeErr instanceof Error ? xfadeErr.message : xfadeErr
      );
      const listFile = path.join(dir, "concat.txt");
      await writeFile(
        listFile,
        [
          `file '${beforeWav}'`,
          `file '${pauseWav}'`,
          `file '${nameWav}'`,
          `file '${pauseWav}'`,
          `file '${afterWav}'`,
        ].join("\n")
      );
      await runFfmpeg([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-ar",
        "44100",
        "-ac",
        "1",
        "-b:a",
        "128k",
        "-f",
        "mp3",
        outMp3,
      ]);
    }

    const buffer = await readFile(outMp3);
    if (!buffer.length) throw new Error("IVR_COMPOSE_EMPTY_OUTPUT");

    // Rough duration from mp3 size @ 128kbps (optional metadata).
    const durationSeconds = Math.max(1, Math.round((buffer.length * 8) / 128000));

    return {
      buffer,
      contentType: "audio/mpeg",
      durationSeconds,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}
