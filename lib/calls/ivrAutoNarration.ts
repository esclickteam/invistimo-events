/**
 * Prepare the existing AI narration for calls that have not started.
 *
 * Uses the locked female voice and the global pack texts already in the
 * system. The only per-event clip is the event name from event details.
 * Personal recordings and past call attempts are left in place.
 *
 * The same file is used for every IVR guest, including kosher numbers.
 * Audience selection, scheduling, and dialing stay on their existing paths.
 */

import connectDB from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { IVR_LOCKED_FEMALE_VOICE_ID, synthesizeElevenLabsSpeech } from "@/lib/calls/elevenlabs";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  getIvrAudioObjectFromR2,
  ivrComposedIntroR2Key,
  ivrEventNameR2Key,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";
import { buildComposedInboundAudio } from "@/lib/calls/ivrComposedInbound";
import {
  composeIvrIntroAudio,
  contentHashForComposedInbound,
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
  IVR_INBOUND_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";
import {
  assignIvrConfig,
  normalizeIvrAudioSubdoc,
} from "@/lib/calls/ivrConfigPersist";
import { hydrateApprovedPackVoiceIds } from "@/lib/calls/ivrAdminVoicePacks";
import { ensureGlobalVoicePack } from "@/lib/calls/ivrSystemAudio";
import { assertApprovedPackForGender } from "@/lib/calls/ivrSystemVoices";
import { buildIvrEventNameSpeechText } from "@/lib/calls/ivrScript";
import {
  classifyStoredAiNarration,
  ivrSpokenNameHash,
  mergeRetainedAudioClips,
  resolveSpokenIvrEventName,
} from "@/lib/calls/ivrSpokenEventName";

const VOICE_GENDER = "female" as const;

const inflight = new Map<string, Promise<EnsureAutoIvrNarrationResult>>();

export type EnsureAutoIvrNarrationResult = {
  ok: boolean;
  reused: boolean;
  spokenName: string;
  reason: string;
  message: string;
  ivrConfig: any | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function clipRef(audio: any) {
  const publicToken = clean(audio?.publicToken);
  const r2Key = clean(audio?.r2Key);
  if (!publicToken || !r2Key) return null;
  return {
    publicToken,
    r2Key,
    contentType: clean(audio?.contentType) || "audio/mpeg",
    retainedAt: new Date(),
  };
}

function retainedFromConfig(cfg: any) {
  const approvalToken = clean(cfg?.recordingApproval?.audioPublicToken);
  const composed = cfg?.composedIntroAudio;
  const approvalClip =
    approvalToken && clean(composed?.r2Key)
      ? {
          publicToken: approvalToken,
          r2Key: clean(composed.r2Key),
          contentType: clean(composed.contentType) || "audio/mpeg",
          retainedAt: new Date(),
        }
      : null;
  return mergeRetainedAudioClips(cfg?.retainedAudioClips, [
    clipRef(cfg?.eventNameAudio),
    clipRef(cfg?.composedIntroAudio),
    clipRef(cfg?.composedInboundAudio),
    approvalClip,
    clipRef(cfg?.introAudio),
  ]);
}

async function loadEventDetails(ownerId: unknown) {
  const invitation = await Invitation.findOne({ ownerId })
    .sort({ eventDate: 1, createdAt: -1 })
    .lean();
  let event: any = null;
  const eventId = (invitation as any)?.eventId;
  if (eventId) {
    event = await Event.findById(eventId).lean();
  }
  if (!event) {
    event = await Event.findOne({ userId: ownerId }).sort({ updatedAt: -1 }).lean();
  }
  return { invitation, event };
}

async function stitchOutbound(input: {
  userId: string;
  voiceId: string;
  eventNameHash: string;
  eventNameR2Key: string;
  beforeR2Key: string;
  beforeHash: string;
  afterR2Key: string;
  afterHash: string;
}) {
  const [beforeObj, nameObj, afterObj] = await Promise.all([
    getIvrAudioObjectFromR2(input.beforeR2Key),
    getIvrAudioObjectFromR2(input.eventNameR2Key),
    getIvrAudioObjectFromR2(input.afterR2Key),
  ]);
  const composed = await composeIvrIntroAudio({
    beforeMp3: beforeObj.buffer,
    eventNameMp3: nameObj.buffer,
    afterMp3: afterObj.buffer,
  });
  const publicToken = createIvrAudioPublicToken();
  const r2Key = ivrComposedIntroR2Key(input.userId, publicToken, "mp3");
  await uploadIvrAudioToR2({
    key: r2Key,
    buffer: composed.buffer,
    contentType: composed.contentType,
  });
  return normalizeIvrAudioSubdoc({
    status: "ready",
    source: "compose",
    publicToken,
    audioUrl: buildIvrPublicAudioUrl(publicToken),
    r2Key,
    contentType: composed.contentType,
    contentHash: contentHashForComposedIntro({
      beforeHash: input.beforeHash,
      eventNameHash: input.eventNameHash,
      afterHash: input.afterHash,
      voiceId: input.voiceId,
    }),
    durationSeconds: composed.durationSeconds,
    generatedAt: new Date(),
    composeVersion: IVR_COMPOSE_VERSION,
    eventNameContentHash: input.eventNameHash,
    approved: false,
    approvedAt: null,
  });
}

function approvalFor(composed: any, approvedAt: Date) {
  return {
    approved: true,
    approvedAt,
    audioMode: "ai" as const,
    voiceGender: VOICE_GENDER,
    audioPublicToken: clean(composed?.publicToken),
    audioContentHash: clean(composed?.contentHash),
    audioUrl: clean(composed?.audioUrl),
  };
}

function plainConfig(user: any) {
  const cfg = user?.ivrConfig;
  if (!cfg) return null;
  if (typeof cfg.toObject === "function") {
    try {
      return cfg.toObject();
    } catch {
      return { ...cfg };
    }
  }
  return cfg;
}

async function ensureAutoIvrNarrationOnce(
  userId: string
): Promise<EnsureAutoIvrNarrationResult> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user || !isIvrCallsUser(user)) {
    return {
      ok: false,
      reused: false,
      spokenName: "",
      reason: "NOT_IVR",
      message: "",
      ivrConfig: plainConfig(user),
    };
  }

  const { invitation, event } = await loadEventDetails(user._id);
  const spokenName = resolveSpokenIvrEventName({ invitation, event });
  const voiceId = IVR_LOCKED_FEMALE_VOICE_ID;

  try {
    await hydrateApprovedPackVoiceIds();
    await assertApprovedPackForGender(VOICE_GENDER);
  } catch (error) {
    console.error("[ivr] auto narration pack", error);
    return {
      ok: false,
      reused: false,
      spokenName,
      reason: "VOICE_PACK_NOT_READY",
      message:
        "הקריינות הגלובלית עדיין לא זמינה. התזמון נשמר, והמערכת תנסה שוב לפני החיוג.",
      ivrConfig: plainConfig(user),
    };
  }

  const pack = await ensureGlobalVoicePack(VOICE_GENDER, { reuseOnly: true });
  const before = pack.segments.introBeforeEventName;
  const after = pack.segments.introAfterEventName;
  const inboundBefore = pack.segments.inboundBeforeEventName;
  const inboundAfter = pack.segments.inboundAfterEventName;
  if (!before?.r2Key || !after?.r2Key || !before.contentHash || !after.contentHash) {
    return {
      ok: false,
      reused: false,
      spokenName,
      reason: "VOICE_PACK_NOT_READY",
      message:
        "הקריינות הגלובלית עדיין לא זמינה. התזמון נשמר, והמערכת תנסה שוב לפני החיוג.",
      ivrConfig: plainConfig(user),
    };
  }

  const packHashes = {
    beforeHash: String(before.contentHash),
    afterHash: String(after.contentHash),
    inboundBeforeHash: String(inboundBefore?.contentHash || ""),
    inboundAfterHash: String(inboundAfter?.contentHash || ""),
    voiceId,
  };
  const cfg = user.ivrConfig || {};
  const kind = classifyStoredAiNarration({
    spokenName,
    voiceGender: VOICE_GENDER,
    pack: packHashes,
    cfg,
    composeVersion: IVR_COMPOSE_VERSION,
    inboundComposeVersion: IVR_INBOUND_COMPOSE_VERSION,
  });

  if (kind === "ready") {
    return {
      ok: true,
      reused: true,
      spokenName,
      reason: "",
      message: "",
      ivrConfig: plainConfig(user),
    };
  }

  const nameHash = ivrSpokenNameHash({
    spokenName,
    voiceId,
    voiceGender: VOICE_GENDER,
  });
  const spokenText = buildIvrEventNameSpeechText({
    eventName: spokenName,
  });
  let eventNameAudio = normalizeIvrAudioSubdoc(cfg.eventNameAudio);
  let composedIntroAudio = normalizeIvrAudioSubdoc(cfg.composedIntroAudio);
  let composedInboundAudio = normalizeIvrAudioSubdoc(cfg.composedInboundAudio);
  const retainedAudioClips = retainedFromConfig(cfg);

  if (kind === "rebuild") {
    assignIvrConfig(user, {
      audioMode: "ai",
      eventName: spokenName,
      eventNamePronunciation: "",
      voiceGender: VOICE_GENDER,
      systemVoiceId: voiceId,
      voiceId,
      eventNameAudio: {
        ...eventNameAudio,
        status: eventNameAudio.status === "ready" ? "stale" : eventNameAudio.status,
        approved: false,
        approvedAt: null,
      },
      composedIntroAudio: {
        ...composedIntroAudio,
        status: composedIntroAudio.status === "ready" ? "stale" : composedIntroAudio.status,
        approved: false,
        approvedAt: null,
      },
      composedInboundAudio: {
        ...composedInboundAudio,
        status:
          composedInboundAudio.status === "ready" ? "stale" : composedInboundAudio.status,
        approved: false,
        approvedAt: null,
      },
      recordingApproval: {
        approved: false,
        approvedAt: null,
        audioMode: "ai",
        voiceGender: VOICE_GENDER,
        audioPublicToken: "",
        audioContentHash: "",
        audioUrl: "",
      },
      retainedAudioClips,
      updatedAt: new Date(),
    });
    await user.save();

    try {
      const synth = await synthesizeElevenLabsSpeech({
        text: spokenText,
        voiceId,
      });
      const publicToken = createIvrAudioPublicToken();
      const r2Key = ivrEventNameR2Key(String(user._id), publicToken, "mp3");
      await uploadIvrAudioToR2({
        key: r2Key,
        buffer: synth.buffer,
        contentType: synth.contentType,
      });
      eventNameAudio = normalizeIvrAudioSubdoc({
        status: "ready",
        source: "elevenlabs",
        publicToken,
        audioUrl: buildIvrPublicAudioUrl(publicToken),
        r2Key,
        contentType: synth.contentType,
        contentHash: nameHash,
        durationSeconds: null,
        generatedAt: new Date(),
        textSnapshot: spokenText,
        approved: false,
        approvedAt: null,
      });
      assignIvrConfig(user, {
        audioMode: "ai",
        eventName: spokenName,
        eventNamePronunciation: "",
        voiceGender: VOICE_GENDER,
        systemVoiceId: voiceId,
        voiceId,
        eventNameAudio,
        retainedAudioClips,
        updatedAt: new Date(),
      });
      await user.save();
    } catch (error) {
      console.error("[ivr] auto narration tts", error);
      return {
        ok: false,
        reused: false,
        spokenName,
        reason: "TTS_FAILED",
        message:
          "לא הצלחנו להכין את קריינות ה-AI משם האירוע. התזמון נשמר, והמערכת תנסה שוב לפני החיוג.",
        ivrConfig: plainConfig(user),
      };
    }
  }

  if (kind === "rebuild" || kind === "compose") {
    try {
      composedIntroAudio = await stitchOutbound({
        userId: String(user._id),
        voiceId,
        eventNameHash: nameHash,
        eventNameR2Key: clean(eventNameAudio.r2Key),
        beforeR2Key: String(before.r2Key),
        beforeHash: String(before.contentHash),
        afterR2Key: String(after.r2Key),
        afterHash: String(after.contentHash),
      });
    } catch (error) {
      console.error("[ivr] auto narration compose", error);
      return {
        ok: false,
        reused: false,
        spokenName,
        reason: "COMPOSE_FAILED",
        message:
          "שם האירוע מוכן, אבל חיבור ההקלטה המלאה נכשל. התזמון נשמר, והמערכת תנסה שוב לפני החיוג.",
        ivrConfig: plainConfig(user),
      };
    }
  }

  if (inboundBefore?.r2Key && inboundAfter?.r2Key) {
    const inboundHash = contentHashForComposedInbound({
      beforeHash: String(inboundBefore.contentHash || ""),
      eventNameHash: nameHash,
      afterHash: String(inboundAfter.contentHash || ""),
      voiceId,
    });
    const inboundCurrent =
      composedInboundAudio.status === "ready" &&
      clean(composedInboundAudio.composeVersion) === IVR_INBOUND_COMPOSE_VERSION &&
      clean(composedInboundAudio.contentHash) === inboundHash &&
      clean(composedInboundAudio.r2Key);
    if (!inboundCurrent) {
      try {
        const built = await buildComposedInboundAudio({
          userId: String(user._id),
          voiceId,
          eventNameHash: nameHash,
          eventNameR2Key: clean(eventNameAudio.r2Key),
          beforeR2Key: String(inboundBefore.r2Key),
          beforeHash: String(inboundBefore.contentHash || ""),
          afterR2Key: String(inboundAfter.r2Key),
          afterHash: String(inboundAfter.contentHash || ""),
        });
        composedInboundAudio = normalizeIvrAudioSubdoc(built);
      } catch (error) {
        console.error("[ivr] auto narration inbound compose", error);
      }
    }
  }

  const approvedAt = new Date();
  assignIvrConfig(user, {
    audioMode: "ai",
    eventName: spokenName,
    eventNamePronunciation: "",
    voiceGender: VOICE_GENDER,
    systemVoiceId: voiceId,
    voiceId,
    eventNameAudio: {
      ...eventNameAudio,
      approved: true,
      approvedAt,
    },
    composedIntroAudio: {
      ...composedIntroAudio,
      approved: true,
      approvedAt,
    },
    composedInboundAudio: composedInboundAudio?.r2Key
      ? {
          ...composedInboundAudio,
          approved: true,
          approvedAt,
        }
      : composedInboundAudio,
    recordingApproval: approvalFor(composedIntroAudio, approvedAt),
    retainedAudioClips,
    updatedAt: approvedAt,
  });
  await user.save();

  return {
    ok: true,
    reused: kind !== "rebuild",
    spokenName,
    reason: "",
    message: "",
    ivrConfig: plainConfig(user),
  };
}

export function ensureAutoIvrNarration(userId: string) {
  const key = clean(userId);
  if (!key) {
    return Promise.resolve({
      ok: false,
      reused: false,
      spokenName: "",
      reason: "MISSING_USER",
      message: "",
      ivrConfig: null,
    } satisfies EnsureAutoIvrNarrationResult);
  }
  const existing = inflight.get(key);
  if (existing) return existing;
  const run = ensureAutoIvrNarrationOnce(key).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, run);
  return run;
}
