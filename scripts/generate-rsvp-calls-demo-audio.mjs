#!/usr/bin/env node
/**
 * One-shot / controlled-publish generator for the /rsvp/calls Dana IVR demo.
 *
 * Uses the same locked female voice id, model, language, voice settings and
 * outbound script segments as production IVR (lib/calls/elevenlabs.ts +
 * lib/calls/ivrScript.ts + lib/calls/ivrComposeIntro.ts pause).
 *
 * Does NOT change admin voice packs or customer calls.
 *
 * Behavior:
 * - If public/audio/rsvp-calls-dana-demo.mp3 already exists → skip (exit 0)
 *   unless FORCE_RSVP_CALLS_DEMO_AUDIO=1.
 * - If ELEVENLABS_API_KEY is missing → skip with warning (exit 0) so local
 *   builds without the secret still succeed; the player shows a clear error.
 * - Otherwise synthesizes once and writes the static MP3 + meta JSON.
 *
 * Usage:
 *   node scripts/generate-rsvp-calls-demo-audio.mjs
 *   FORCE_RSVP_CALLS_DEMO_AUDIO=1 node scripts/generate-rsvp-calls-demo-audio.mjs
 */

import { createHash } from "crypto";
import { spawn } from "child_process";
import { createRequire } from "module";
import { access, mkdir, writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/audio/rsvp-calls-dana-demo.mp3");
const META = path.join(ROOT, "public/audio/rsvp-calls-dana-demo.meta.json");

const IVR_LOCKED_FEMALE_VOICE_ID = "V0stpogHp8KBgdErUZbd";
const IVR_TTS_MODEL_ID = "eleven_v3";
const IVR_TTS_OUTPUT_FORMAT = "mp3_44100_128";
const IVR_TTS_LANGUAGE_CODE = "he";
const IVR_TTS_VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};
const NAME_PAUSE_SEC = 0.08;
const DEMO_EVENT_NAME = "החתונה של מיה ואלון";

/** Matches IVR_GLOBAL_PACK_TEXTS outbound + spoken event name. */
const SEGMENTS = [
  { id: "before", text: "שלום, אנחנו מתקשרים בנוגע לאירוע" },
  { id: "name", text: DEMO_EVENT_NAME },
  {
    id: "after",
    text: "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו. לאישור הגעה, הקישו 1. לאי הגעה, הקישו 2. אם עדיין אינכם יודעים, הקישו 3.",
  },
];

function normalizeSecretApiKey(raw) {
  let key = String(raw || "");
  key = key.replace(/^\uFEFF/, "");
  key = key.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  key = key.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\s+/g, "");
}

function getApiKey() {
  for (const name of ["ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY", "XI_API_KEY"]) {
    const raw = process.env[name];
    if (!raw) continue;
    const key = normalizeSecretApiKey(raw);
    if (key) return key;
  }
  return "";
}

function resolveFfmpeg() {
  try {
    const fromPkg = require("ffmpeg-static");
    if (fromPkg) return String(fromPkg);
  } catch {
    /* fall through */
  }
  return process.env.FFMPEG_PATH || process.env.FFMPEG_BIN || "ffmpeg";
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function synthesize(text, voiceId, apiKey) {
  const body = {
    text,
    model_id: IVR_TTS_MODEL_ID,
    language_code: IVR_TTS_LANGUAGE_CODE,
    voice_settings: { ...IVR_TTS_VOICE_SETTINGS },
  };
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}?output_format=${encodeURIComponent(IVR_TTS_OUTPUT_FORMAT)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`));
    });
  });
}

async function main() {
  const force = String(process.env.FORCE_RSVP_CALLS_DEMO_AUDIO || "").trim() === "1";
  if (!force && (await fileExists(OUT))) {
    console.log("Demo audio already present — skip:", OUT);
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      "ELEVENLABS_API_KEY missing — skipping Dana demo generation. Player will show unavailable until the static MP3 is published."
    );
    return;
  }

  const voiceId =
    String(process.env.IVR_FEMALE_VOICE_ID || "").trim() || IVR_LOCKED_FEMALE_VOICE_ID;
  const ffmpeg = resolveFfmpeg();
  console.log(
    "Using female voice id:",
    voiceId === IVR_LOCKED_FEMALE_VOICE_ID ? "locked Dana id" : "env override"
  );
  console.log("Model:", IVR_TTS_MODEL_ID, "lang:", IVR_TTS_LANGUAGE_CODE);
  console.log("ffmpeg:", ffmpeg);

  const dir = await mkdtemp(path.join(tmpdir(), "ivr-demo-"));
  try {
    const wavs = [];
    for (const seg of SEGMENTS) {
      console.log("Synthesize", seg.id, "…");
      const mp3 = await synthesize(seg.text, voiceId, apiKey);
      const mp3Path = path.join(dir, `${seg.id}.mp3`);
      const wavPath = path.join(dir, `${seg.id}.wav`);
      await writeFile(mp3Path, mp3);
      // Match compose: mono 44.1kHz + light silence trim + loudnorm
      await run(ffmpeg, [
        "-y",
        "-i",
        mp3Path,
        "-af",
        "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-38dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-38dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ac",
        "1",
        "-ar",
        "44100",
        wavPath,
      ]);
      wavs.push(wavPath);
    }

    const pauseWav = path.join(dir, "pause.wav");
    await run(ffmpeg, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=44100:cl=mono`,
      "-t",
      String(NAME_PAUSE_SEC),
      pauseWav,
    ]);

    const listFile = path.join(dir, "concat.txt");
    const list = [
      `file '${wavs[0]}'`,
      `file '${pauseWav}'`,
      `file '${wavs[1]}'`,
      `file '${pauseWav}'`,
      `file '${wavs[2]}'`,
    ].join("\n");
    await writeFile(listFile, list);

    const outWav = path.join(dir, "out.wav");
    await run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outWav]);

    await mkdir(path.dirname(OUT), { recursive: true });
    await run(ffmpeg, [
      "-y",
      "-i",
      outWav,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-ac",
      "1",
      OUT,
    ]);

    const buf = await readFile(OUT);
    const meta = {
      generatedAt: new Date().toISOString(),
      voiceId,
      voiceNameExpected: "Dana",
      modelId: IVR_TTS_MODEL_ID,
      languageCode: IVR_TTS_LANGUAGE_CODE,
      voiceSettings: IVR_TTS_VOICE_SETTINGS,
      outputFormat: IVR_TTS_OUTPUT_FORMAT,
      pauseSeconds: NAME_PAUSE_SEC,
      eventName: DEMO_EVENT_NAME,
      segments: SEGMENTS.map((s) => s.id),
      bytes: buf.length,
      sha256: createHash("sha256").update(buf).digest("hex"),
      note: "Marketing demo only. Same Dana lock + settings as production IVR outbound intro.",
    };
    await writeFile(META, JSON.stringify(meta, null, 2) + "\n");
    console.log("Wrote", OUT);
    console.log("Meta", META);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
