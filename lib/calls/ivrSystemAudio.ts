/**
 * Ensure shared post-DTMF system prompts exist once (ElevenLabs → R2).
 * Also caches inbound intro audio keyed by spoken text hash.
 */

import IvrSystemAudio from "@/models/IvrSystemAudio";
import {
  buildIvrInboundIntroText,
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

async function ensureCachedPromptAudio(input: {
  key: string;
  text: string;
  voiceId?: string;
}) {
  const text = String(input.text || "").trim();
  if (!text) {
    throw new Error("IVR_PROMPT_TEXT_EMPTY");
  }

  const resolvedVoice = String(
    input.voiceId || getDefaultIvrVoiceId() || ""
  ).trim();
  if (!resolvedVoice) {
    throw new Error("IVR_SYSTEM_VOICE_ID / ELEVENLABS_DEFAULT_VOICE_ID missing");
  }

  const contentHash = hashTtsContent(text, resolvedVoice);
  const existing = await IvrSystemAudio.findOne({ key: input.key }).lean();

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
  const r2Key = ivrSystemR2Key(input.key, contentHash, "mp3");

  await uploadIvrAudioToR2({
    key: r2Key,
    buffer: synth.buffer,
    contentType: synth.contentType,
  });

  const audioUrl = buildIvrPublicAudioUrl(publicToken);

  const doc = await IvrSystemAudio.findOneAndUpdate(
    { key: input.key },
    {
      $set: {
        key: input.key,
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

export async function ensureIvrSystemPromptAudio(
  key: IvrSystemPromptKey,
  voiceId?: string
) {
  const text = IVR_SYSTEM_PROMPTS[key];
  return ensureCachedPromptAudio({ key, text, voiceId });
}

/** Cache inbound greeting audio per event-name / pronunciation / voice. */
export async function ensureIvrInboundIntroAudio(input: {
  eventName: string;
  eventNamePronunciation?: string;
  voiceId?: string;
}) {
  const text = buildIvrInboundIntroText({
    eventName: input.eventName,
    eventNamePronunciation: input.eventNamePronunciation,
  });
  const resolvedVoice = String(
    input.voiceId || getDefaultIvrVoiceId() || ""
  ).trim();
  const contentHash = hashTtsContent(text, resolvedVoice || "default");
  const key = `inboundIntro:${contentHash.slice(0, 24)}`;
  return ensureCachedPromptAudio({
    key,
    text,
    voiceId: input.voiceId,
  });
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
