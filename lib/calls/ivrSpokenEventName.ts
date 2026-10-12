/**
 * Spoken event name for IVR.
 * Taken from event details only — never from a separate narration field.
 * Fixed pack wording, voices, and keypad flow stay unchanged.
 */

import {
  eventTypeHeadline,
  isPlaceholderEventTitle,
  pickGuestFacingEventType,
  pickGuestFacingTitle,
} from "@/lib/eventDetails/centralEventDetails";
import { contentHashForComposedInbound, contentHashForComposedIntro } from "@/lib/calls/ivrComposeIntro";
import {
  contentHashForIvrEventName,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

/**
 * Name inserted into the existing AI narration.
 * A real "שם האירוע" wins. If it is empty, the headline is built from the
 * event type and hosts already saved on the event (for example
 * "החתונה של דניאל ונועה").
 */
export function resolveSpokenIvrEventName(input: {
  invitation?: any;
  event?: any;
}): string {
  const title = pickGuestFacingTitle(input.event, input.invitation);
  if (title) return title;

  const hosts =
    clean(input.invitation?.hostsNames) || clean(input.event?.hostsNames);
  const eventType = pickGuestFacingEventType(input.event, input.invitation);
  const headline = clean(eventTypeHeadline(eventType, hosts, ""));
  if (headline && !isPlaceholderEventTitle(headline)) return headline;
  return "האירוע";
}

const RETAINED_CLIP_LIMIT = 80;

export function mergeRetainedAudioClips(existing: unknown, incoming: unknown[]) {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  const rows = [
    ...(Array.isArray(existing) ? existing : []),
    ...incoming.filter(Boolean),
  ];
  for (const row of rows) {
    const token = String((row as { publicToken?: string })?.publicToken || "").trim();
    const r2Key = String((row as { r2Key?: string })?.r2Key || "").trim();
    if (!token || !r2Key || seen.has(token)) continue;
    seen.add(token);
    out.push({
      publicToken: token,
      r2Key,
      contentType:
        String((row as { contentType?: string })?.contentType || "").trim() ||
        "audio/mpeg",
      retainedAt: (row as { retainedAt?: Date })?.retainedAt || new Date(),
    });
  }
  return out.slice(-RETAINED_CLIP_LIMIT);
}

export function ivrSpokenNameHash(input: {
  spokenName: string;
  voiceId: string;
  voiceGender?: IvrVoiceGender;
}) {
  return contentHashForIvrEventName({
    eventName: input.spokenName,
    eventNamePronunciation: "",
    voiceGender: input.voiceGender || "female",
    voiceId: input.voiceId,
  });
}

export type IvrNarrationPackHashes = {
  beforeHash: string;
  afterHash: string;
  inboundBeforeHash?: string;
  inboundAfterHash?: string;
  voiceId: string;
};

/**
 * Whether the stored AI clips already match the live event name.
 * "ready" can be dialed. "approve" only needs the approval flags.
 * "compose" reuses the event-name clip (no new TTS).
 * "compose-inbound" updates only the callback file.
 * "rebuild" needs a new event-name clip.
 */
export function classifyStoredAiNarration(input: {
  spokenName: string;
  voiceGender: IvrVoiceGender;
  pack: IvrNarrationPackHashes;
  cfg: any;
  composeVersion: string;
  inboundComposeVersion: string;
}): "ready" | "approve" | "compose" | "compose-inbound" | "rebuild" {
  const cfg = input.cfg || {};
  const nameHash = ivrSpokenNameHash({
    spokenName: input.spokenName,
    voiceId: input.pack.voiceId,
    voiceGender: input.voiceGender,
  });
  const eventAudio = cfg.eventNameAudio || {};
  const eventReady =
    eventAudio.status === "ready" &&
    clean(eventAudio.contentHash) === nameHash &&
    clean(eventAudio.r2Key) &&
    clean(eventAudio.publicToken || eventAudio.audioUrl);

  if (!eventReady) return "rebuild";

  const composeHash = contentHashForComposedIntro({
    beforeHash: input.pack.beforeHash,
    eventNameHash: nameHash,
    afterHash: input.pack.afterHash,
    voiceId: input.pack.voiceId,
  });
  const composed = cfg.composedIntroAudio || {};
  const composedReady =
    composed.status === "ready" &&
    clean(composed.composeVersion) === input.composeVersion &&
    clean(composed.contentHash) === composeHash &&
    clean(composed.r2Key) &&
    clean(composed.publicToken || composed.audioUrl);

  if (!composedReady) return "compose";

  const inboundBefore = clean(input.pack.inboundBeforeHash);
  const inboundAfter = clean(input.pack.inboundAfterHash);
  if (inboundBefore && inboundAfter) {
    const inboundHash = contentHashForComposedInbound({
      beforeHash: inboundBefore,
      eventNameHash: nameHash,
      afterHash: inboundAfter,
      voiceId: input.pack.voiceId,
    });
    const inbound = cfg.composedInboundAudio || {};
    const inboundReady =
      inbound.status === "ready" &&
      clean(inbound.composeVersion) === input.inboundComposeVersion &&
      clean(inbound.contentHash) === inboundHash &&
      clean(inbound.eventNameContentHash) === nameHash &&
      clean(inbound.r2Key);
    if (!inboundReady) return "compose-inbound";
  }

  const approval = cfg.recordingApproval || {};
  const approved =
    cfg.audioMode === "ai" &&
    clean(cfg.voiceGender) === input.voiceGender &&
    clean(cfg.eventName) === input.spokenName &&
    !clean(cfg.eventNamePronunciation) &&
    eventAudio.approved === true &&
    composed.approved === true &&
    approval.approved === true &&
    approval.audioMode === "ai" &&
    clean(approval.audioContentHash) === composeHash &&
    clean(approval.audioPublicToken) === clean(composed.publicToken);

  return approved ? "ready" : "approve";
}
