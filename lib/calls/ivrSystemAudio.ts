/**
 * Global Invistimo IVR voice packs (female / male).
 * Fixed script segments are synthesized once per gender and reused for every
 * user, event, and call. Per-event TTS is only the event name (elsewhere).
 */

import IvrSystemAudio from "@/models/IvrSystemAudio";
import {
  buildIvrInboundIntroText,
  globalPackAudioKey,
  IVR_GLOBAL_PACK_TEXTS,
  IVR_SYSTEM_PROMPT_TO_PACK_SEGMENT,
  IVR_SYSTEM_PROMPTS,
  type IvrGlobalPackSegmentKey,
  type IvrSystemPromptKey,
  type IvrVoiceGender,
  normalizeIvrVoiceGender,
} from "@/lib/calls/ivrScript";
import {
  getDefaultIvrVoiceId,
  getIvrVoiceIdForGender,
  hashTtsContent,
  synthesizeElevenLabsSpeech,
} from "@/lib/calls/elevenlabs";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  ivrSystemR2Key,
  resolveIvrPublicAudioUrl,
  uploadIvrAudioToR2,
  verifyIvrAudioInR2,
} from "@/lib/calls/ivrAudioStorage";

export type GlobalPackSegmentAudio = {
  key: string;
  segment: IvrGlobalPackSegmentKey;
  text: string;
  voiceId: string;
  audioUrl: string;
  publicToken?: string;
  r2Key?: string;
  contentHash: string;
  reused: boolean;
};

export type GlobalVoicePack = {
  gender: IvrVoiceGender;
  voiceId: string;
  segments: Record<IvrGlobalPackSegmentKey, GlobalPackSegmentAudio>;
};

async function ensureCachedPromptAudio(input: {
  key: string;
  text: string;
  voiceId?: string;
  /** When true, never call ElevenLabs — throw if missing/stale. */
  reuseOnly?: boolean;
  /** Prosody hint only — not spoken; used for introBefore → event name join. */
  nextText?: string;
}): Promise<{ doc: any; reused: boolean }> {
  const text = String(input.text || "").trim();
  if (!text) {
    throw new Error("IVR_PROMPT_TEXT_EMPTY");
  }

  const resolvedVoice = String(
    input.voiceId || getDefaultIvrVoiceId() || ""
  ).trim();
  if (!resolvedVoice) {
    throw new Error(
      "IVR female/male voice ids missing (IVR_FEMALE_VOICE_ID / IVR_MALE_VOICE_ID)"
    );
  }

  // Include nextText in hash so introBefore regenerates when join hint changes.
  const nextText = String(input.nextText || "").trim();
  const contentHash = hashTtsContent(
    nextText ? `${text}\n→${nextText}` : text,
    resolvedVoice
  );
  const existing = await IvrSystemAudio.findOne({ key: input.key }).lean();

  if (
    existing &&
    existing.contentHash === contentHash &&
    existing.r2Key &&
    existing.publicToken
  ) {
    const verified = await verifyIvrAudioInR2(String(existing.r2Key));
    if (verified.ok) {
      // Refresh public URL to current production host (avoid stale *.vercel.app).
      const audioUrl = resolveIvrPublicAudioUrl({
        publicToken: existing.publicToken,
        storedUrl: existing.audioUrl,
      });
      if (audioUrl && audioUrl !== existing.audioUrl) {
        await IvrSystemAudio.updateOne(
          { key: input.key },
          { $set: { audioUrl } }
        );
      }
      return {
        doc: {
          ...existing,
          audioUrl: audioUrl || existing.audioUrl,
          contentType: verified.contentType || existing.contentType,
        },
        reused: true,
      };
    }

    // Mongo row exists but R2 object missing/empty — not ready.
    if (input.reuseOnly) {
      throw new Error(`IVR_GLOBAL_SEGMENT_UNPLAYABLE:${input.key}`);
    }
    // Fall through to regenerate.
  } else if (
    existing &&
    existing.contentHash === contentHash &&
    existing.audioUrl &&
    existing.r2Key &&
    input.reuseOnly
  ) {
    // Legacy row without publicToken — still require R2 object.
    const verified = await verifyIvrAudioInR2(String(existing.r2Key));
    if (!verified.ok) {
      throw new Error(`IVR_GLOBAL_SEGMENT_UNPLAYABLE:${input.key}`);
    }
    return { doc: existing, reused: true };
  }

  if (input.reuseOnly) {
    throw new Error(`IVR_GLOBAL_SEGMENT_MISSING:${input.key}`);
  }

  const synth = await synthesizeElevenLabsSpeech({
    text,
    voiceId: resolvedVoice,
  });

  if (!synth?.buffer?.length) {
    throw new Error("IVR_TTS_EMPTY_AUDIO");
  }

  const publicToken = createIvrAudioPublicToken();
  const r2Key = ivrSystemR2Key(input.key, contentHash, "mp3");

  // uploadIvrAudioToR2 verifies HeadObject size > 0 before returning.
  const uploaded = await uploadIvrAudioToR2({
    key: r2Key,
    buffer: synth.buffer,
    contentType: synth.contentType || "audio/mpeg",
  });

  const audioUrl = buildIvrPublicAudioUrl(publicToken);
  if (!audioUrl) {
    throw new Error("IVR_AUDIO_URL_BUILD_FAILED");
  }

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
        contentType: uploaded.contentType || synth.contentType || "audio/mpeg",
        contentHash,
      },
    },
    { upsert: true, new: true }
  ).lean();

  return { doc, reused: false };
}

export async function ensureGlobalPackSegment(input: {
  gender: IvrVoiceGender;
  segment: IvrGlobalPackSegmentKey;
  /** Test/ops: refuse to synthesize — only return existing cache. */
  reuseOnly?: boolean;
}): Promise<GlobalPackSegmentAudio> {
  const voiceId = getIvrVoiceIdForGender(input.gender);
  if (!voiceId) {
    throw new Error(
      input.gender === "male"
        ? "IVR_MALE_VOICE_ID missing"
        : "IVR_FEMALE_VOICE_ID missing"
    );
  }

  const text = IVR_GLOBAL_PACK_TEXTS[input.segment];
  const key = globalPackAudioKey(input.gender, input.segment);
  const { doc, reused } = await ensureCachedPromptAudio({
    key,
    text,
    voiceId,
    reuseOnly: input.reuseOnly,
  });

  return {
    key,
    segment: input.segment,
    text,
    voiceId,
    audioUrl: String(doc?.audioUrl || ""),
    publicToken: String(doc?.publicToken || ""),
    r2Key: String(doc?.r2Key || ""),
    contentHash: String(doc?.contentHash || ""),
    reused,
  };
}

/**
 * Ensure (or load) the full global pack for one gender.
 * Fixed texts are created at most once per gender for the whole platform.
 */
export async function ensureGlobalVoicePack(
  gender: IvrVoiceGender | string,
  options?: { reuseOnly?: boolean }
): Promise<GlobalVoicePack> {
  const normalized = normalizeIvrVoiceGender(gender);
  if (!normalized) {
    throw new Error("INVALID_VOICE_GENDER");
  }

  const voiceId = getIvrVoiceIdForGender(normalized);
  if (!voiceId) {
    throw new Error(
      normalized === "male"
        ? "IVR_MALE_VOICE_ID missing"
        : "IVR_FEMALE_VOICE_ID missing"
    );
  }

  const segmentKeys = Object.keys(
    IVR_GLOBAL_PACK_TEXTS
  ) as IvrGlobalPackSegmentKey[];

  const segments = {} as Record<IvrGlobalPackSegmentKey, GlobalPackSegmentAudio>;
  for (const segment of segmentKeys) {
    segments[segment] = await ensureGlobalPackSegment({
      gender: normalized,
      segment,
      reuseOnly: options?.reuseOnly,
    });
  }

  return { gender: normalized, voiceId, segments };
}

export async function getGlobalPackSegmentUrl(
  gender: IvrVoiceGender | string,
  segment: IvrGlobalPackSegmentKey
): Promise<string> {
  const audio = await ensureGlobalPackSegment({
    gender: normalizeIvrVoiceGender(gender) || "female",
    segment,
  });
  return String(audio.audioUrl || "");
}

/** Resolve DTMF follow-up audio from the caller's selected global pack. */
export async function getIvrSystemAudioUrlForGender(
  gender: IvrVoiceGender | string | null | undefined,
  key: IvrSystemPromptKey
): Promise<string> {
  const packSegment = IVR_SYSTEM_PROMPT_TO_PACK_SEGMENT[key];
  if (packSegment) {
    const g = normalizeIvrVoiceGender(gender) || "female";
    return getGlobalPackSegmentUrl(g, packSegment);
  }

  // Inbound-only prompts: still cached once per voice id.
  return getIvrSystemAudioUrl(key, getIvrVoiceIdForGender(gender));
}

export async function ensureIvrSystemPromptAudio(
  key: IvrSystemPromptKey,
  voiceId?: string
) {
  const packSegment = IVR_SYSTEM_PROMPT_TO_PACK_SEGMENT[key];
  if (packSegment) {
    // Prefer female pack when only a bare voiceId is supplied (legacy callers).
    const gender: IvrVoiceGender =
      voiceId && voiceId === getIvrVoiceIdForGender("male")
        ? "male"
        : "female";
    const audio = await ensureGlobalPackSegment({ gender, segment: packSegment });
    return {
      key: audio.key,
      text: audio.text,
      voiceId: audio.voiceId,
      audioUrl: audio.audioUrl,
      publicToken: audio.publicToken,
      r2Key: audio.r2Key,
      contentHash: audio.contentHash,
    };
  }

  const text = IVR_SYSTEM_PROMPTS[key];
  const { doc } = await ensureCachedPromptAudio({ key, text, voiceId });
  return doc;
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
  const { doc } = await ensureCachedPromptAudio({
    key,
    text,
    voiceId: input.voiceId,
  });
  return doc;
}

export async function ensureAllIvrSystemPrompts(voiceId?: string) {
  const gender: IvrVoiceGender =
    voiceId && voiceId === getIvrVoiceIdForGender("male") ? "male" : "female";
  const pack = await ensureGlobalVoicePack(gender);
  return Object.values(pack.segments);
}

export async function getIvrSystemAudioUrl(
  key: IvrSystemPromptKey,
  voiceId?: string
) {
  const doc = await ensureIvrSystemPromptAudio(key, voiceId);
  return String(doc?.audioUrl || "");
}

/**
 * Warm both global packs once (ops / first deploy).
 * Safe to call repeatedly — existing hashes skip ElevenLabs.
 */
export async function ensureBothGlobalVoicePacks(options?: {
  reuseOnly?: boolean;
}) {
  const results: GlobalVoicePack[] = [];
  for (const gender of ["female", "male"] as IvrVoiceGender[]) {
    try {
      if (!getIvrVoiceIdForGender(gender)) continue;
      results.push(await ensureGlobalVoicePack(gender, options));
    } catch (error) {
      console.warn("[ivr] global pack warm skipped", {
        gender,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return results;
}
