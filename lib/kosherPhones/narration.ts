import { createHash } from "crypto";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { ensureAutoIvrNarration } from "@/lib/calls/ivrAutoNarration";
import { mergeRetainedAudioClips } from "@/lib/calls/ivrSpokenEventName";
import {
  composeIvrIntroAudio,
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  getIvrAudioObjectFromR2,
  resolveIvrPublicAudioUrl,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";
import { getIvrVoiceIdForGender, synthesizeElevenLabsSpeech } from "@/lib/calls/elevenlabs";
import { ensureGlobalPackSegment } from "@/lib/calls/ivrSystemAudio";
import { normalizeIvrVoiceGender, type IvrVoiceGender } from "@/lib/calls/ivrScript";
import { resolveIvrRoundAudio } from "@/lib/calls/ivrDialer";
import {
  buildKosherCallScript,
  resolveKosherSpokenEventName,
} from "@/lib/kosherPhones/match";

export type KosherNarration = {
  spokenName: string;
  speechText: string;
  source: "custom" | "ivr" | "invitation";
  script: string;
  ready: boolean;
  error: string;
  introAudioUrl: string;
  eventNameAudioUrl: string;
  voiceGender: IvrVoiceGender;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function reuseExistingIvrAudio(user: any, speechText: string) {
  const audio = resolveIvrRoundAudio(user);
  if (!audio.audioReady || !audio.introAudioUrl) return null;
  const snapshot = clean(user?.ivrConfig?.eventNameAudio?.textSnapshot);
  const configured = clean(user?.ivrConfig?.eventName);
  if (snapshot !== speechText && configured !== speechText) return null;
  return {
    introAudioUrl: audio.introAudioUrl,
    eventNameAudioUrl: audio.eventNameAudioUrl || "",
    voiceGender: audio.voiceGender || ("female" as const),
  };
}

function reuseStoredKosherAudio(invitation: any, speechText: string) {
  const stored = invitation?.kosherCallAudio;
  if (stored?.status !== "ready") return null;
  if (clean(stored.spokenName) !== speechText && clean(stored.speechText) !== speechText) {
    return null;
  }
  const composed = stored.composedIntroAudio || {};
  const introAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: composed.publicToken,
    storedUrl: composed.audioUrl,
  });
  if (!introAudioUrl) return null;
  const event = stored.eventNameAudio || {};
  return {
    introAudioUrl,
    eventNameAudioUrl: resolveIvrPublicAudioUrl({
      publicToken: event.publicToken,
      storedUrl: event.audioUrl,
    }),
    voiceGender: normalizeIvrVoiceGender(stored.voiceGender) || ("female" as const),
  };
}

export function describeKosherNarration(input: {
  invitation: any;
  user: any;
}): KosherNarration {
  const spoken = resolveKosherSpokenEventName({
    invitation: input.invitation,
    invitationTitle: input.invitation?.title,
  });
  const reused =
    reuseStoredKosherAudio(input.invitation, spoken.speechText) ||
    reuseExistingIvrAudio(input.user, spoken.speechText);
  const storedError =
    input.invitation?.kosherCallAudio?.status === "failed"
      ? clean(input.invitation?.kosherCallAudio?.error)
      : "";

  return {
    spokenName: spoken.displayName,
    speechText: spoken.speechText,
    source: spoken.source,
    script: buildKosherCallScript(spoken.speechText),
    ready: Boolean(reused?.introAudioUrl),
    error: reused ? "" : storedError,
    introAudioUrl: reused?.introAudioUrl || "",
    eventNameAudioUrl: reused?.eventNameAudioUrl || "",
    voiceGender: reused?.voiceGender || "female",
  };
}

async function retainReplacedKosherClips(user: any, invitation: any) {
  const stored = invitation?.kosherCallAudio || {};
  const incoming = [stored.eventNameAudio, stored.composedIntroAudio]
    .map((clip) => {
      const publicToken = clean(clip?.publicToken);
      const r2Key = clean(clip?.r2Key);
      if (!publicToken || !r2Key) return null;
      return {
        publicToken,
        r2Key,
        contentType: clean(clip?.contentType) || "audio/mpeg",
        retainedAt: new Date(),
      };
    })
    .filter(Boolean);
  if (!incoming.length || !user?._id) return;
  const retainedAudioClips = mergeRetainedAudioClips(
    user?.ivrConfig?.retainedAudioClips,
    incoming
  );
  await User.updateOne(
    { _id: user._id },
    { $set: { "ivrConfig.retainedAudioClips": retainedAudioClips } }
  );
}

export async function ensureKosherNarration(input: {
  invitation: any;
  user: any;
}): Promise<KosherNarration> {
  if (input.user?._id && isIvrCallsUser(input.user)) {
    const prepared = await ensureAutoIvrNarration(String(input.user._id)).catch(
      () => null
    );
    if (prepared?.ivrConfig) {
      input.user.ivrConfig = prepared.ivrConfig;
    }
  }

  const current = describeKosherNarration(input);
  if (current.ready) return current;

  const gender: IvrVoiceGender = current.voiceGender || "female";
  const voiceId = getIvrVoiceIdForGender(gender);
  if (!voiceId) {
    return {
      ...current,
      ready: false,
      error: "NARRATION_UNAVAILABLE",
    };
  }

  try {
    const [before, after, name] = await Promise.all([
      ensureGlobalPackSegment({ gender, segment: "introBeforeEventName" }),
      ensureGlobalPackSegment({ gender, segment: "introAfterEventName" }),
      synthesizeElevenLabsSpeech({
        text: current.speechText,
        voiceId,
      }),
    ]);

    const beforeKey = String(before.r2Key || "");
    const afterKey = String(after.r2Key || "");
    if (!beforeKey || !afterKey) {
      throw new Error("NARRATION_UNAVAILABLE");
    }

    const [beforeObject, afterObject] = await Promise.all([
      getIvrAudioObjectFromR2(beforeKey),
      getIvrAudioObjectFromR2(afterKey),
    ]);

    const composed = await composeIvrIntroAudio({
      beforeMp3: beforeObject.buffer,
      eventNameMp3: name.buffer,
      afterMp3: afterObject.buffer,
    });

    const userId = String(input.user?._id || input.invitation?.ownerId || "kosher");
    const nameToken = createIvrAudioPublicToken();
    const composedToken = createIvrAudioPublicToken();
    const nameKey = `ivr/kosher-event-name/${userId}/${nameToken}.mp3`;
    const composedKey = `ivr/kosher-composed/${userId}/${composedToken}.mp3`;

    await uploadIvrAudioToR2({
      key: nameKey,
      buffer: name.buffer,
      contentType: name.contentType || "audio/mpeg",
    });
    await uploadIvrAudioToR2({
      key: composedKey,
      buffer: composed.buffer,
      contentType: composed.contentType || "audio/mpeg",
    });

    const contentHash = contentHashForComposedIntro({
      beforeHash: before.contentHash,
      eventNameHash: createHash("sha256").update(name.buffer).digest("hex"),
      afterHash: after.contentHash,
      voiceId,
    });

    const nameUrl = buildIvrPublicAudioUrl(nameToken);
    const composedUrl = buildIvrPublicAudioUrl(composedToken);

    await retainReplacedKosherClips(input.user, input.invitation);

    await Invitation.updateOne(
      { _id: input.invitation._id },
      {
        $set: {
          kosherCallAudio: {
            spokenName: current.speechText,
            speechText: current.speechText,
            status: "ready",
            error: "",
            voiceGender: gender,
            eventNameAudio: {
              publicToken: nameToken,
              audioUrl: nameUrl,
              r2Key: nameKey,
              contentType: "audio/mpeg",
              textSnapshot: current.speechText,
            },
            composedIntroAudio: {
              publicToken: composedToken,
              audioUrl: composedUrl,
              r2Key: composedKey,
              contentType: "audio/mpeg",
              contentHash,
              composeVersion: IVR_COMPOSE_VERSION,
            },
            updatedAt: new Date(),
          },
        },
      }
    );

    return {
      ...current,
      ready: true,
      error: "",
      introAudioUrl: composedUrl,
      eventNameAudioUrl: nameUrl,
      voiceGender: gender,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NARRATION_UNAVAILABLE";
    await Invitation.updateOne(
      { _id: input.invitation._id },
      {
        $set: {
          "kosherCallAudio.status": "failed",
          "kosherCallAudio.error": message.slice(0, 300),
          "kosherCallAudio.spokenName": current.speechText,
          "kosherCallAudio.speechText": current.speechText,
          "kosherCallAudio.updatedAt": new Date(),
        },
      }
    ).catch(() => undefined);

    return {
      ...current,
      ready: false,
      error: message || "NARRATION_UNAVAILABLE",
    };
  }
}
