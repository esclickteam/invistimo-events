/**
 * Personal IVR intro: one couple-recorded file, at most 45 seconds.
 * It replaces the AI open + event name + menu prompt. After a digit, the
 * shared phase machine plays the existing system follow-ups.
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { IVR_SELF_RECORD_MAX_SECONDS } from "@/lib/calls/ivrScript";
import { selectFfmpegBinary } from "@/lib/calls/ivrComposeIntro";
import {
  resolveIvrPublicAudioUrl,
  verifyIvrAudioInR2,
} from "@/lib/calls/ivrAudioStorage";

/** Probe may sit slightly over a clip that was stopped at exactly 45s. */
export const IVR_SELF_RECORD_PROBE_SLACK_SECONDS = 0.5;

const TELNYX_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
]);

export function isTelnyxSelfRecordingContentType(contentType: string | null | undefined) {
  const raw = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return TELNYX_AUDIO_TYPES.has(raw);
}

/**
 * A known non-mp3/wav type cannot be handed to Telnyx.
 * Empty type is not a block here — the dial-time R2 check decides.
 */
export function selfRecordingContentTypeBlocksPlayback(
  contentType: string | null | undefined
) {
  const raw = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!raw) return false;
  return !TELNYX_AUDIO_TYPES.has(raw);
}

export function reportedSelfRecordingTooLong(seconds: number) {
  return Number.isFinite(seconds) && seconds > IVR_SELF_RECORD_MAX_SECONDS;
}

export function probedSelfRecordingTooLong(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return false;
  return seconds > IVR_SELF_RECORD_MAX_SECONDS + IVR_SELF_RECORD_PROBE_SLACK_SECONDS;
}

export function storedSelfRecordingTooLong(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return false;
  return Number(seconds) > IVR_SELF_RECORD_MAX_SECONDS;
}

export type IvrIntroPlaybackPlan = {
  audioMode: "ai" | "self_recorded";
  /** The only file played before the guest presses 1, 2, or 3. */
  introAudioUrl: string;
  eventNameAudioUrl: string;
  composedIntroAudioUrl: string;
  /** Personal file stands in for all three AI intro segments. */
  replacesAiIntroSegments: boolean;
};

/**
 * Personal mode plays the approved couple file and nothing else before the digit.
 * AI mode keeps the composed intro and the event-name clip.
 * Inputs are not mutated.
 */
export function ivrIntroPlaybackPlan(input: {
  audioMode: string | null | undefined;
  personalIntroUrl: string;
  eventNameAudioUrl: string;
  composedIntroAudioUrl: string;
}): IvrIntroPlaybackPlan {
  if (input.audioMode === "self_recorded") {
    return {
      audioMode: "self_recorded",
      introAudioUrl: String(input.personalIntroUrl || ""),
      eventNameAudioUrl: "",
      composedIntroAudioUrl: "",
      replacesAiIntroSegments: true,
    };
  }
  const composed = String(input.composedIntroAudioUrl || "");
  return {
    audioMode: "ai",
    introAudioUrl: composed || String(input.personalIntroUrl || ""),
    eventNameAudioUrl: String(input.eventNameAudioUrl || ""),
    composedIntroAudioUrl: composed,
    replacesAiIntroSegments: false,
  };
}

/** Browser preview and the Telnyx intro must be this same public file. */
export function personalIntroMediaUrl(intro: {
  publicToken?: string | null;
  audioUrl?: string | null;
} | null | undefined) {
  return resolveIvrPublicAudioUrl({
    publicToken: intro?.publicToken,
    storedUrl: intro?.audioUrl,
  });
}

export type PreparedSelfRecording =
  | {
      ok: true;
      buffer: Buffer;
      contentType: "audio/mpeg";
      durationSeconds: number;
    }
  | {
      ok: false;
      error: "EMPTY_FILE" | "DURATION_TOO_LONG" | "TRANSCODE_FAILED";
      maxSeconds: number;
    };

function ffmpegBin() {
  return (
    selectFfmpegBinary(
      [
        process.env.FFMPEG_PATH || "",
        process.env.FFMPEG_BIN || "",
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
      ],
      existsSync
    ) || "ffmpeg"
  );
}

function runFfmpeg(args: string[]) {
  const bin = ffmpegBin();
  return new Promise<void>((resolve, reject) => {
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

function probeDurationSeconds(filePath: string): Promise<number | null> {
  const bin = ffmpegBin();
  const ffprobe =
    selectFfmpegBinary(
      [bin.replace(/ffmpeg$/, "ffprobe"), "/usr/bin/ffprobe", "/usr/local/bin/ffprobe"],
      existsSync
    ) || "";

  if (ffprobe) {
    return new Promise((resolve) => {
      const child = spawn(
        ffprobe,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          filePath,
        ],
        { stdio: ["ignore", "pipe", "pipe"] }
      );
      let stdout = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk || "");
      });
      child.on("error", () => resolve(null));
      child.on("close", (code) => {
        if (code !== 0) return resolve(null);
        const n = Number(String(stdout || "").trim());
        resolve(Number.isFinite(n) && n > 0 ? n : null);
      });
    });
  }

  return new Promise((resolve) => {
    const child = spawn(bin, ["-i", filePath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", () => resolve(null));
    child.on("close", () => {
      const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
      if (!match) return resolve(null);
      const total =
        Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      resolve(Number.isFinite(total) && total > 0 ? total : null);
    });
  });
}

/**
 * Store one Telnyx-playable mp3 of at most 45 seconds.
 * A source longer than the cap is rejected, not trimmed into a call file.
 */
export async function prepareSelfRecordingForStorage(input: {
  buffer: Buffer;
  reportedSeconds: number;
}): Promise<PreparedSelfRecording> {
  const maxSeconds = IVR_SELF_RECORD_MAX_SECONDS;
  if (!input.buffer?.length) {
    return { ok: false, error: "EMPTY_FILE", maxSeconds };
  }
  if (reportedSelfRecordingTooLong(input.reportedSeconds)) {
    return { ok: false, error: "DURATION_TOO_LONG", maxSeconds };
  }

  const dir = await mkdtemp(path.join(tmpdir(), "ivr-self-"));
  const sourcePath = path.join(dir, "source.bin");
  const mp3Path = path.join(dir, "intro.mp3");
  try {
    await writeFile(sourcePath, input.buffer);
    const probed = await probeDurationSeconds(sourcePath);
    if (probedSelfRecordingTooLong(probed)) {
      return { ok: false, error: "DURATION_TOO_LONG", maxSeconds };
    }

    await runFfmpeg([
      "-i",
      sourcePath,
      "-t",
      String(maxSeconds),
      "-ar",
      "44100",
      "-ac",
      "1",
      "-b:a",
      "128k",
      "-f",
      "mp3",
      mp3Path,
    ]);

    const buffer = await readFile(mp3Path);
    if (!buffer.length) {
      return { ok: false, error: "TRANSCODE_FAILED", maxSeconds };
    }
    const stored = await probeDurationSeconds(mp3Path);
    if (stored != null && stored > maxSeconds + IVR_SELF_RECORD_PROBE_SLACK_SECONDS) {
      return { ok: false, error: "DURATION_TOO_LONG", maxSeconds };
    }
    const durationSeconds = Math.min(
      maxSeconds,
      Math.max(
        1,
        Math.round(
          stored && stored > 0
            ? stored
            : input.reportedSeconds > 0
              ? input.reportedSeconds
              : maxSeconds
        )
      )
    );
    return {
      ok: true,
      buffer,
      contentType: "audio/mpeg",
      durationSeconds,
    };
  } catch {
    return { ok: false, error: "TRANSCODE_FAILED", maxSeconds };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}

/** R2 object Telnyx will fetch through /api/ivr/media. No live dial. */
export async function confirmSelfRecordingAvailableToTelnyx(r2Key: string) {
  const key = String(r2Key || "").trim();
  if (!key) {
    return {
      ok: false as const,
      reason: "ההקלטה האישית לא נשמרה באחסון — אי אפשר לחייג",
    };
  }
  const head = await verifyIvrAudioInR2(key, { timeoutMs: 2500 });
  if (!head.ok) {
    return {
      ok: false as const,
      reason: "ההקלטה האישית לא זמינה ל־Telnyx — החיוג לא יצא",
    };
  }
  if (selfRecordingContentTypeBlocksPlayback(head.contentType)) {
    return {
      ok: false as const,
      reason:
        "ההקלטה האישית אינה בפורמט ש־Telnyx יכול להשמיע. יש להקליט מחדש.",
    };
  }
  return { ok: true as const, reason: "" };
}
