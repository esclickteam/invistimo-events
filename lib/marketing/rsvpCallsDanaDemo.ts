/**
 * Marketing Dana demo for /rsvp/calls.
 *
 * Uses the same locked Dana voice, TTS settings, outbound script segments and
 * ffmpeg compose path as live IVR. Audio is cached in R2 (and optionally the
 * committed public/ file) so visitors never trigger per-click TTS.
 *
 * Does not change admin voice packs or customer calls.
 */

import { access, readFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";
import {
  IVR_GLOBAL_PACK_TEXTS,
  buildIvrEventNameSpeechText,
} from "@/lib/calls/ivrScript";
import {
  IVR_LOCKED_FEMALE_VOICE_ID,
  IVR_TTS_LANGUAGE_CODE,
  hashTtsContent,
  synthesizeElevenLabsSpeech,
} from "@/lib/calls/elevenlabs";
import { composeIvrIntroAudio } from "@/lib/calls/ivrComposeIntro";
import {
  getIvrAudioObjectFromR2,
  uploadIvrAudioToR2,
  verifyIvrAudioInR2,
} from "@/lib/calls/ivrAudioStorage";

/** Fixed demo event name used across RSVP marketing pages. */
export const RSVP_CALLS_DEMO_EVENT_NAME = "החתונה של מיה ואלון";

/** Stable R2 object — regenerate only via FORCE_RSVP_CALLS_DEMO_AUDIO / controlled publish. */
export const RSVP_CALLS_DANA_DEMO_R2_KEY = "marketing/rsvp-calls-dana-demo.mp3";

const PUBLIC_DEMO_PATH = path.join(
  process.cwd(),
  "public/audio/rsvp-calls-dana-demo.mp3"
);

let inflight: Promise<{ buffer: Buffer; contentType: string; source: string }> | null =
  null;

async function readLocalPublicDemo(): Promise<Buffer | null> {
  try {
    await access(PUBLIC_DEMO_PATH, fsConstants.F_OK);
    const buf = await readFile(PUBLIC_DEMO_PATH);
    return buf.length > 64 ? buf : null;
  } catch {
    return null;
  }
}

async function readR2Demo(): Promise<{ buffer: Buffer; contentType: string } | null> {
  const verified = await verifyIvrAudioInR2(RSVP_CALLS_DANA_DEMO_R2_KEY);
  if (!verified.ok) return null;
  try {
    const obj = await getIvrAudioObjectFromR2(RSVP_CALLS_DANA_DEMO_R2_KEY);
    if (!obj.buffer?.length) return null;
    return { buffer: obj.buffer, contentType: obj.contentType || "audio/mpeg" };
  } catch {
    return null;
  }
}

async function synthesizeAndComposeDemo(): Promise<Buffer> {
  const voiceId = IVR_LOCKED_FEMALE_VOICE_ID;
  const beforeText = IVR_GLOBAL_PACK_TEXTS.introBeforeEventName;
  const nameText = buildIvrEventNameSpeechText({
    eventName: RSVP_CALLS_DEMO_EVENT_NAME,
  });
  const afterText = IVR_GLOBAL_PACK_TEXTS.introAfterEventName;

  const [before, name, after] = await Promise.all([
    synthesizeElevenLabsSpeech({
      text: beforeText,
      voiceId,
      languageCode: IVR_TTS_LANGUAGE_CODE,
    }),
    synthesizeElevenLabsSpeech({
      text: nameText,
      voiceId,
      languageCode: IVR_TTS_LANGUAGE_CODE,
    }),
    synthesizeElevenLabsSpeech({
      text: afterText,
      voiceId,
      languageCode: IVR_TTS_LANGUAGE_CODE,
    }),
  ]);

  // Content hashes keep this aligned with IVR cache identity (voice + text).
  void hashTtsContent(beforeText, voiceId);
  void hashTtsContent(nameText, voiceId);
  void hashTtsContent(afterText, voiceId);

  const composed = await composeIvrIntroAudio({
    beforeMp3: before.buffer,
    eventNameMp3: name.buffer,
    afterMp3: after.buffer,
  });

  return composed.buffer;
}

async function createAndStoreDemo(): Promise<{
  buffer: Buffer;
  contentType: string;
  source: string;
}> {
  const buffer = await synthesizeAndComposeDemo();
  await uploadIvrAudioToR2({
    key: RSVP_CALLS_DANA_DEMO_R2_KEY,
    buffer,
    contentType: "audio/mpeg",
  });
  return { buffer, contentType: "audio/mpeg", source: "generated" };
}

/**
 * Resolve the marketing Dana demo MP3.
 * Prefer committed public file → R2 cache → one-shot generate + R2 store.
 */
export async function getOrCreateRsvpCallsDanaDemo(options?: {
  forceRegenerate?: boolean;
}): Promise<{ buffer: Buffer; contentType: string; source: string }> {
  const force =
    Boolean(options?.forceRegenerate) ||
    String(process.env.FORCE_RSVP_CALLS_DEMO_AUDIO || "").trim() === "1";

  if (!force) {
    const local = await readLocalPublicDemo();
    if (local) {
      return { buffer: local, contentType: "audio/mpeg", source: "public" };
    }
    const cached = await readR2Demo();
    if (cached) {
      return { ...cached, source: "r2" };
    }
  }

  if (!inflight) {
    inflight = createAndStoreDemo().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
