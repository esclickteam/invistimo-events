/**
 * One inbound narration file per event, built before the call:
 * inboundBeforeEventName + event name + inboundAfterEventName.
 *
 * ffmpeg stitch of the locked clips only. No ElevenLabs, no wording change.
 * Outbound keeps its own composed file (different script).
 */

import User from "@/models/User";
import {
  composeIvrIntroAudio,
  contentHashForComposedInbound,
  IVR_INBOUND_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";
import {
  createIvrAudioPublicToken,
  getIvrAudioObjectFromR2,
  ivrComposedInboundR2Key,
  resolveIvrPublicAudioUrl,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";
import { normalizeIvrVoiceGender } from "@/lib/calls/ivrScript";
import { ensureGlobalVoicePack } from "@/lib/calls/ivrSystemAudio";

export function composedInboundPlaybackUrl(cfg: any): string {
  const composed = cfg?.composedInboundAudio;
  const eventName = cfg?.eventNameAudio;
  if (String(eventName?.status || "") !== "ready") return "";
  if (String(composed?.status || "") !== "ready") return "";
  if (String(composed?.composeVersion || "") !== IVR_INBOUND_COMPOSE_VERSION) {
    return "";
  }
  const eventHash = String(eventName?.contentHash || "");
  const storedEventHash = String(composed?.eventNameContentHash || "");
  if (!eventHash || !storedEventHash || eventHash !== storedEventHash) return "";
  return resolveIvrPublicAudioUrl({
    publicToken: composed?.publicToken,
    storedUrl: composed?.audioUrl,
  });
}

export async function buildComposedInboundAudio(input: {
  userId: string;
  voiceId: string;
  eventNameHash: string;
  eventNameR2Key: string;
  beforeR2Key: string;
  beforeHash: string;
  afterR2Key: string;
  afterHash: string;
}) {
  if (!input.beforeR2Key || !input.afterR2Key || !input.eventNameR2Key) {
    throw new Error("IVR_INBOUND_COMPOSE_SEGMENTS_MISSING");
  }

  const contentHash = contentHashForComposedInbound({
    beforeHash: input.beforeHash,
    eventNameHash: input.eventNameHash,
    afterHash: input.afterHash,
    voiceId: input.voiceId,
  });

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
  const r2Key = ivrComposedInboundR2Key(input.userId, publicToken, "mp3");
  await uploadIvrAudioToR2({
    key: r2Key,
    buffer: composed.buffer,
    contentType: composed.contentType,
  });

  return {
    status: "ready" as const,
    source: "compose" as const,
    publicToken,
    audioUrl: resolveIvrPublicAudioUrl({ publicToken }),
    r2Key,
    contentType: composed.contentType,
    contentHash,
    eventNameContentHash: input.eventNameHash,
    durationSeconds: composed.durationSeconds,
    generatedAt: new Date(),
    composeVersion: IVR_INBOUND_COMPOSE_VERSION,
    approved: false,
    approvedAt: null,
  };
}

/**
 * Return the stored inbound file when it still matches the event-name clip
 * and the current global inbound segments. Otherwise stitch and save it.
 * Callers that already have a matching URL should skip this.
 */
const composeFailureAt = new Map<string, number>();
const COMPOSE_RETRY_MS = 5 * 60 * 1000;

export async function ensureComposedInboundAudioForUser(
  userId: string,
  options?: { force?: boolean }
): Promise<string> {
  const failedAt = composeFailureAt.get(userId);
  if (
    !options?.force &&
    failedAt &&
    Date.now() - failedAt < COMPOSE_RETRY_MS
  ) {
    const cachedUser = await User.findById(userId).select("ivrConfig").lean();
    return composedInboundPlaybackUrl(
      (cachedUser as { ivrConfig?: any } | null)?.ivrConfig
    );
  }

  const user = await User.findById(userId).select("ivrConfig").lean();
  const cfg = (user as { ivrConfig?: any } | null)?.ivrConfig;
  if (!cfg || cfg.audioMode === "self_recorded") return "";

  const ready = composedInboundPlaybackUrl(cfg);
  const eventName = cfg.eventNameAudio;
  if (String(eventName?.status || "") !== "ready" || !eventName?.r2Key) {
    return ready;
  }

  const gender = normalizeIvrVoiceGender(cfg.voiceGender);
  if (!gender) return ready;

  let pack: Awaited<ReturnType<typeof ensureGlobalVoicePack>>;
  try {
    pack = await ensureGlobalVoicePack(gender, { reuseOnly: true });
  } catch (error) {
    console.error("[ivr] inbound pack unavailable for compose", error);
    composeFailureAt.set(userId, Date.now());
    return ready;
  }

  const before = pack.segments.inboundBeforeEventName;
  const after = pack.segments.inboundAfterEventName;
  const voiceId = String(pack.voiceId || "");
  const eventNameHash = String(eventName.contentHash || "");
  if (!before?.r2Key || !after?.r2Key || !voiceId || !eventNameHash) {
    composeFailureAt.set(userId, Date.now());
    return ready;
  }

  const expected = contentHashForComposedInbound({
    beforeHash: String(before.contentHash || ""),
    eventNameHash,
    afterHash: String(after.contentHash || ""),
    voiceId,
  });
  const existing = cfg.composedInboundAudio;
  if (
    ready &&
    String(existing?.contentHash || "") === expected &&
    String(existing?.composeVersion || "") === IVR_INBOUND_COMPOSE_VERSION
  ) {
    return ready;
  }

  try {
    const built = await buildComposedInboundAudio({
      userId,
      voiceId,
      eventNameHash,
      eventNameR2Key: String(eventName.r2Key),
      beforeR2Key: String(before.r2Key),
      beforeHash: String(before.contentHash || ""),
      afterR2Key: String(after.r2Key),
      afterHash: String(after.contentHash || ""),
    });

    await User.updateOne(
      { _id: userId },
      { $set: { "ivrConfig.composedInboundAudio": built } }
    );
    composeFailureAt.delete(userId);
    return String(built.audioUrl || "");
  } catch (error) {
    composeFailureAt.set(userId, Date.now());
    throw error;
  }
}
