/**
 * Ensure shared post-DTMF system prompts exist once (ElevenLabs → R2).
 */

import IvrSystemAudio from "@/models/IvrSystemAudio";
import {
  IVR_SYSTEM_PROMPTS,
  type IvrSystemPromptKey,
} from "@/lib/calls/ivrScript";
import {
  getDefaultIvrVoiceId,
  hashTtsContent,
  synthesizeElevenLabsSpeech,
} from "@/lib/calls/elevenlabs";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  ivrSystemR2Key,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";

export async function ensureIvrSystemPromptAudio(
  key: IvrSystemPromptKey,
  voiceId?: string
) {
  const text = IVR_SYSTEM_PROMPTS[key];
  const resolvedVoice = String(voiceId || getDefaultIvrVoiceId() || "").trim();
  if (!resolvedVoice) {
    throw new Error("IVR_SYSTEM_VOICE_ID / ELEVENLABS_DEFAULT_VOICE_ID missing");
  }

  const contentHash = hashTtsContent(text, resolvedVoice);
  const existing = await IvrSystemAudio.findOne({ key }).lean();

  if (
    existing &&
    existing.contentHash === contentHash &&
    existing.audioUrl &&
    existing.r2Key
  ) {
    return existing;
  }

  const synth = await synthesizeElevenLabsSpeech({
    text,
    voiceId: resolvedVoice,
  });

  const publicToken = createIvrAudioPublicToken();
  const r2Key = ivrSystemR2Key(key, contentHash, "mp3");

  await uploadIvrAudioToR2({
    key: r2Key,
    buffer: synth.buffer,
    contentType: synth.contentType,
  });

  const audioUrl = buildIvrPublicAudioUrl(publicToken);

  const doc = await IvrSystemAudio.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        text,
        voiceId: resolvedVoice,
        audioUrl,
        publicToken,
        r2Key,
        contentType: synth.contentType,
        contentHash,
      },
    },
    { upsert: true, new: true }
  ).lean();

  return doc;
}

export async function ensureAllIvrSystemPrompts(voiceId?: string) {
  const keys = Object.keys(IVR_SYSTEM_PROMPTS) as IvrSystemPromptKey[];
  const results = [];
  for (const key of keys) {
    results.push(await ensureIvrSystemPromptAudio(key, voiceId));
  }
  return results;
}

export async function getIvrSystemAudioUrl(key: IvrSystemPromptKey) {
  const doc = await ensureIvrSystemPromptAudio(key);
  return String(doc?.audioUrl || "");
}
