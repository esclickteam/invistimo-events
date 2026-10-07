/**
 * Server-only ElevenLabs Text-to-Speech.
 *
 * Reads process.env.ELEVENLABS_API_KEY only inside this module.
 * Never import this file from client components.
 * Never return, log, or serialize the API key value.
 */

import { createHash } from "crypto";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  preview_url?: string | null;
  labels?: Record<string, string>;
};

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !String(key).trim()) {
    throw new Error("ELEVENLABS_API_KEY_MISSING");
  }
  return String(key).trim();
}

/** Strip any accidental secret material before surfacing errors. */
export function sanitizeElevenLabsErrorMessage(message: unknown): string {
  let text = String(message || "ELEVENLABS_REQUEST_FAILED");
  const key = process.env.ELEVENLABS_API_KEY;
  if (key && key.length >= 8) {
    text = text.split(key).join("[REDACTED]");
  }
  // Also redact common header-style leaks if a provider echoes them.
  text = text.replace(/xi-api-key["'\s:=]+[^\s"',}]+/gi, "xi-api-key:[REDACTED]");
  return text.slice(0, 300);
}

export function hashTtsContent(text: string, voiceId: string) {
  return createHash("sha256")
    .update(`${voiceId}\n${text}`)
    .digest("hex");
}

export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = getApiKey();

  const res = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    voices?: ElevenLabsVoice[];
    detail?: unknown;
  } | null;

  if (!res.ok) {
    throw new Error(
      sanitizeElevenLabsErrorMessage(
        `ElevenLabs voices failed (${res.status})`
      )
    );
  }

  return Array.isArray(data?.voices) ? data!.voices! : [];
}

export async function synthesizeElevenLabsSpeech(input: {
  text: string;
  voiceId: string;
  modelId?: string;
}): Promise<{ buffer: Buffer; contentType: string; contentHash: string }> {
  const apiKey = getApiKey();
  const voiceId = String(input.voiceId || "").trim();
  const text = String(input.text || "").trim();

  if (!voiceId) throw new Error("voiceId is required");
  if (!text) throw new Error("text is required");

  const modelId =
    input.modelId ||
    process.env.ELEVENLABS_MODEL_ID ||
    "eleven_multilingual_v2";

  const res = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    // Consume body for status only — do not forward provider payload to clients/logs.
    await res.text().catch(() => "");
    throw new Error(
      sanitizeElevenLabsErrorMessage(
        `ElevenLabs TTS failed (${res.status})`
      )
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "audio/mpeg";

  return {
    buffer,
    contentType,
    contentHash: hashTtsContent(text, voiceId),
  };
}

/** Default voice id override via env (not secret). */
export function getDefaultIvrVoiceId() {
  return (
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ||
    process.env.IVR_SYSTEM_VOICE_ID ||
    ""
  );
}
