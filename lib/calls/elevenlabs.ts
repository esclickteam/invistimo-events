/**
 * Server-only ElevenLabs Text-to-Speech.
 * API key must stay in ELEVENLABS_API_KEY — never expose to frontend.
 */

import { createHash } from "crypto";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  preview_url?: string | null;
  labels?: Record<string, string>;
};

function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY || "";
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY is missing");
  }
  return key;
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
      `ElevenLabs voices failed (${res.status}): ${JSON.stringify(data?.detail || data)}`
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
    const errText = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 500)}`
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

/** Default Hebrew-friendly voice id override via env when listing fails. */
export function getDefaultIvrVoiceId() {
  return (
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ||
    process.env.IVR_SYSTEM_VOICE_ID ||
    ""
  );
}
