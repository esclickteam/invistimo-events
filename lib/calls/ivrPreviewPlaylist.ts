/**
 * Which existing IVR clips a sample call may play.
 * Read-only: it does not synthesize, compose, or approve anything.
 */

import {
  IVR_COMPOSE_VERSION,
  IVR_INBOUND_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";
import { classifyStoredAiNarration } from "@/lib/calls/ivrSpokenEventName";
import {
  buildIvrIntroText,
  IVR_GLOBAL_PACK_TEXTS,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";

export type IvrPreviewClipUrls = {
  askCount: string;
  thanksYes: string;
  thanksOther: string;
  invalidChoice: string;
  invalidCount: string;
};

export type IvrPreviewPlaylist = {
  ready: boolean;
  spokenName: string;
  introUrls: string[];
  clips: IvrPreviewClipUrls;
  texts: {
    intro: string;
    askCount: string;
    thanksYes: string;
    thanksOther: string;
    invalidChoice: string;
    invalidCount: string;
  };
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function buildIvrPreviewPlaylist(input: {
  spokenName: string;
  voiceGender: IvrVoiceGender;
  voiceId: string;
  cfg: any;
  composedUrl: string;
  eventNameUrl: string;
  beforeUrl: string;
  beforeHash: string;
  afterUrl: string;
  afterHash: string;
  inboundBeforeHash?: string;
  inboundAfterHash?: string;
  clips: IvrPreviewClipUrls;
}): IvrPreviewPlaylist {
  const spokenName = clean(input.spokenName) || "האירוע";
  const texts = {
    intro: buildIvrIntroText({ eventName: spokenName }),
    askCount: IVR_GLOBAL_PACK_TEXTS.afterPress1,
    thanksYes: IVR_GLOBAL_PACK_TEXTS.afterValidQuantity,
    thanksOther: IVR_GLOBAL_PACK_TEXTS.afterPress2Or3,
    invalidChoice: IVR_GLOBAL_PACK_TEXTS.invalidInput,
    invalidCount: IVR_GLOBAL_PACK_TEXTS.invalidGuestCount,
  };
  const clips = input.clips;
  const followUpsReady = Boolean(
    clips.askCount &&
      clips.thanksYes &&
      clips.thanksOther &&
      clips.invalidChoice &&
      clips.invalidCount
  );

  const kind = input.voiceId
    ? classifyStoredAiNarration({
        spokenName,
        voiceGender: input.voiceGender,
        pack: {
          beforeHash: input.beforeHash,
          afterHash: input.afterHash,
          inboundBeforeHash: input.inboundBeforeHash || "",
          inboundAfterHash: input.inboundAfterHash || "",
          voiceId: input.voiceId,
        },
        cfg: input.cfg,
        composeVersion: IVR_COMPOSE_VERSION,
        inboundComposeVersion: IVR_INBOUND_COMPOSE_VERSION,
      })
    : "rebuild";

  const composedUrl = clean(input.composedUrl);
  const parts = [clean(input.beforeUrl), clean(input.eventNameUrl), clean(input.afterUrl)].filter(
    Boolean
  );
  let introUrls: string[] = [];
  if (
    (kind === "ready" || kind === "approve" || kind === "compose-inbound") &&
    composedUrl
  ) {
    introUrls = [composedUrl];
  } else if (kind !== "rebuild" && parts.length === 3) {
    introUrls = parts;
  }

  return {
    ready: introUrls.length > 0 && followUpsReady,
    spokenName,
    introUrls,
    clips,
    texts,
  };
}
