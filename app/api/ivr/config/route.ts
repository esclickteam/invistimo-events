import { NextRequest, NextResponse } from "next/server";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  requireIvrSession,
  resolveIvrTargetUser,
} from "@/lib/calls/ivrRequestAuth";
import {
  buildIvrEventNameSpeechText,
  buildIvrRecommendedScriptForDisplay,
  contentHashForIvrEventName,
  IVR_GLOBAL_PACK_TEXTS,
  IVR_SELF_RECORD_MAX_SECONDS,
  IVR_SELF_RECORD_RECOMMENDED_SECONDS,
  normalizeIvrVoiceGender,
  resolveIvrEventName,
  resolveIvrEventNamePronunciation,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";
import {
  getIvrVoiceIdForGender,
  IVR_LOCKED_FEMALE_VOICE_ID,
  sanitizeElevenLabsErrorMessage,
  synthesizeElevenLabsSpeech,
  voiceErrorToClientPayload,
} from "@/lib/calls/elevenlabs";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  getIvrAudioObjectFromR2,
  ivrComposedIntroR2Key,
  ivrEventNameR2Key,
  resolveIvrPublicAudioUrl,
  uploadIvrAudioToR2,
  verifyIvrAudioInR2,
  verifyIvrPublicAudioHttp,
} from "@/lib/calls/ivrAudioStorage";
import {
  ensureGlobalVoicePack,
  warmIvrChoiceFollowUps,
} from "@/lib/calls/ivrSystemAudio";
import {
  assertApprovedPackForGender,
  getIvrSystemVoiceChoices,
} from "@/lib/calls/ivrSystemVoices";
import { hydrateApprovedPackVoiceIds } from "@/lib/calls/ivrAdminVoicePacks";
import {
  composeIvrIntroAudio,
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";
import {
  assignIvrConfig,
  ivrPersistErrorPayload,
  normalizeIvrAudioSubdoc,
} from "@/lib/calls/ivrConfigPersist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthedIvrUser(req: NextRequest) {
  const session = await requireIvrSession(req);
  if ("error" in session) {
    return { error: session.error, status: session.status };
  }
  return {
    user: session.user,
    isAdmin: session.isAdmin,
    userId: session.userId,
  };
}

function resolveConfigGender(cfg: any): IvrVoiceGender | null {
  const fromField = normalizeIvrVoiceGender(cfg?.voiceGender);
  if (fromField) return fromField;

  return null;
}


function composedIntroIsCurrentOutbound(
  composed: any,
  expectedContentHash?: string
) {
  if (
    composed?.status !== "ready" ||
    !Boolean(composed?.audioUrl || composed?.publicToken) ||
    String(composed?.composeVersion || "") !== IVR_COMPOSE_VERSION
  ) {
    return false;
  }
  const expected = String(expectedContentHash || "").trim();
  if (expected) {
    return String(composed?.contentHash || "") === expected;
  }
  return true;
}

/** Pack must expose both outbound open segments before approve/dial. */
function outboundPackSegmentsReady(
  pack: Awaited<ReturnType<typeof ensureGlobalVoicePack>> | null | undefined
) {
  const before = pack?.segments?.introBeforeEventName;
  const after = pack?.segments?.introAfterEventName;
  return Boolean(
    before?.r2Key &&
      before?.contentHash &&
      (before?.audioUrl || before?.publicToken) &&
      after?.r2Key &&
      after?.contentHash &&
      (after?.audioUrl || after?.publicToken)
  );
}

/**
 * Page-load safe: no R2/HTTP. Missing token/key marks unplayable; otherwise
 * leave mediaPlayable null so the browser player reports the real result.
 * Never blocks GET /api/ivr/config.
 */
function attachComposedMediaHealthLight(ivrConfig: any) {
  const composed = ivrConfig?.composedIntroAudio;
  if (!composed || typeof composed !== "object") return ivrConfig;
  if (composed.status !== "ready") {
    composed.mediaPlayable = false;
    composed.mediaError = composed.mediaError || "";
    return ivrConfig;
  }
  const hasKey = Boolean(String(composed.r2Key || "").trim());
  const hasToken = Boolean(String(composed.publicToken || "").trim());
  if (!hasKey || !hasToken) {
    composed.mediaPlayable = false;
    composed.mediaError = !hasKey ? "MISSING_R2_KEY" : "MISSING_TOKEN";
  } else {
    composed.mediaPlayable = null;
    composed.mediaError = "";
  }
  return ivrConfig;
}

/**
 * Write-path health only (approve/recompose/generate). Timed R2 HEAD — never
 * nested public HTTP fetch (that deadlocked page load via self-fetch).
 */
async function attachComposedMediaHealth(ivrConfig: any) {
  const composed = ivrConfig?.composedIntroAudio;
  if (!composed || typeof composed !== "object") return ivrConfig;
  if (composed.status !== "ready") {
    composed.mediaPlayable = false;
    return ivrConfig;
  }
  try {
    const head = await verifyIvrAudioInR2(String(composed.r2Key || ""), {
      timeoutMs: 2500,
    });
    composed.mediaPlayable = head.ok === true;
    composed.mediaBytes = head.sizeBytes || 0;
    composed.mediaError = head.ok ? "" : head.reason || "MEDIA_UNAVAILABLE";
  } catch (error) {
    composed.mediaPlayable = null;
    composed.mediaError =
      error instanceof Error ? error.message.slice(0, 80) : "MEDIA_CHECK_FAILED";
  }
  return ivrConfig;
}

/** After Mongo save — public token must resolve for browser + Telnyx. */
async function assertSavedComposedMediaPublic(composed: any) {
  const url = resolveIvrPublicAudioUrl({
    publicToken: composed?.publicToken,
    storedUrl: composed?.audioUrl,
  });
  if (!url) {
    throw new Error("IVR_COMPOSE_PUBLIC_URL_MISSING");
  }
  const http = await verifyIvrPublicAudioHttp(url, { timeoutMs: 8000 });
  if (!http.ok) {
    throw new Error(
      `IVR_COMPOSE_PUBLIC_MEDIA_UNREACHABLE:${http.reason || http.status || "FAIL"}`
    );
  }
  return http;
}

function serializePreviewUrls(input: {
  gender: IvrVoiceGender | null;
  eventNameAudioUrl?: string;
  composedIntroAudioUrl?: string;
  composedIsCurrent?: boolean;
  pack?: Awaited<ReturnType<typeof ensureGlobalVoicePack>> | null;
}) {
  const eventName = String(input.eventNameAudioUrl || "");
  const composed =
    input.composedIsCurrent === true
      ? String(input.composedIntroAudioUrl || "")
      : "";

  if (!input.gender || !input.pack) {
    return {
      introBeforeEventNameUrl: "",
      eventNameAudioUrl: eventName,
      introAfterEventNameUrl: "",
      inboundBeforeEventNameUrl: "",
      inboundAfterEventNameUrl: "",
      composedIntroAudioUrl: composed,
      /** Outbound only. Inbound clips are never mixed into this playlist. */
      playlist: composed ? [composed] : ([] as string[]),
      inboundPlaylist: [] as string[],
      seamless: Boolean(composed),
      segmentsComplete: false,
    };
  }

  const before = String(
    input.pack.segments.introBeforeEventName?.audioUrl || ""
  );
  const after = String(input.pack.segments.introAfterEventName?.audioUrl || "");
  const inboundBefore = String(
    input.pack.segments.inboundBeforeEventName?.audioUrl || ""
  );
  const inboundAfter = String(
    input.pack.segments.inboundAfterEventName?.audioUrl || ""
  );
  const segmentsComplete = Boolean(before && eventName && after);
  // Prefer the single composed file Telnyx will play. Never emit a partial
  // [after]-only playlist that skips the open + event name.
  const playlist = composed
    ? [composed]
    : segmentsComplete
      ? [before, eventName, after]
      : [];
  // Inbound uses the same approved file. Do not preview a second script.
  const inboundPlaylist = composed ? [composed] : [];

  return {
    introBeforeEventNameUrl: before,
    eventNameAudioUrl: eventName,
    introAfterEventNameUrl: after,
    inboundBeforeEventNameUrl: inboundBefore,
    inboundAfterEventNameUrl: inboundAfter,
    composedIntroAudioUrl: composed,
    playlist,
    inboundPlaylist,
    seamless: Boolean(composed),
    segmentsComplete,
  };
}

async function buildAndStoreComposedIntro(input: {
  userId: string;
  voiceId: string;
  eventNameHash: string;
  eventNameR2Key: string;
  pack: Awaited<ReturnType<typeof ensureGlobalVoicePack>>;
}) {
  const beforeSeg = input.pack.segments.introBeforeEventName;
  const afterSeg = input.pack.segments.introAfterEventName;
  if (!beforeSeg?.r2Key || !afterSeg?.r2Key || !input.eventNameR2Key) {
    throw new Error("IVR_COMPOSE_SEGMENTS_MISSING");
  }

  const composeHash = contentHashForComposedIntro({
    beforeHash: String(beforeSeg.contentHash || ""),
    eventNameHash: input.eventNameHash,
    afterHash: String(afterSeg.contentHash || ""),
    voiceId: input.voiceId,
  });

  const [beforeObj, nameObj, afterObj] = await Promise.all([
    getIvrAudioObjectFromR2(String(beforeSeg.r2Key)),
    getIvrAudioObjectFromR2(String(input.eventNameR2Key)),
    getIvrAudioObjectFromR2(String(afterSeg.r2Key)),
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

  const audioUrl = buildIvrPublicAudioUrl(publicToken);

  return {
    status: "ready" as const,
    source: "compose" as const,
    publicToken,
    audioUrl,
    r2Key,
    contentType: composed.contentType,
    contentHash: composeHash,
    durationSeconds: composed.durationSeconds,
    generatedAt: new Date(),
    composeVersion: IVR_COMPOSE_VERSION,
    segmentDurations: composed.segmentDurations,
    beforeContentHash: String(beforeSeg.contentHash || ""),
    eventNameContentHash: input.eventNameHash,
    afterContentHash: String(afterSeg.contentHash || ""),
    approved: false,
    approvedAt: null,
  };
}

function serializeIvrConfig(
  cfg: any,
  pack?: Awaited<ReturnType<typeof ensureGlobalVoicePack>> | null
) {
  const eventName = resolveIvrEventName(cfg);
  const eventNamePronunciation = resolveIvrEventNamePronunciation(cfg);
  const previewText = buildIvrRecommendedScriptForDisplay({ eventName });
  const voiceGender = resolveConfigGender(cfg);
  const systemVoiceId = voiceGender
    ? getIvrVoiceIdForGender(voiceGender)
    : String(cfg?.systemVoiceId || cfg?.voiceId || "");

  const eventNameAudio =
    cfg?.eventNameAudio ||
    // Legacy AI full-intro was stored on introAudio — treat as missing for AI pack mode.
    { status: "missing", approved: false };

  const composedIntroAudio =
    cfg?.composedIntroAudio || { status: "missing", approved: false };

  const eventNameAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: eventNameAudio?.publicToken,
    storedUrl: eventNameAudio?.audioUrl,
  });
  const composedIntroAudioUrl = resolveIvrPublicAudioUrl({
    publicToken: composedIntroAudio?.publicToken,
    storedUrl: composedIntroAudio?.audioUrl,
  });

  const expectedComposeHash =
    voiceGender &&
    pack?.segments?.introBeforeEventName?.contentHash &&
    pack?.segments?.introAfterEventName?.contentHash &&
    eventNameAudio?.contentHash
      ? contentHashForComposedIntro({
          beforeHash: String(pack.segments.introBeforeEventName.contentHash),
          eventNameHash: String(eventNameAudio.contentHash),
          afterHash: String(pack.segments.introAfterEventName.contentHash),
          voiceId: systemVoiceId || getIvrVoiceIdForGender(voiceGender),
        })
      : "";

  const composedIsCurrent = composedIntroIsCurrentOutbound(
    composedIntroAudio,
    expectedComposeHash
  );
  const previewAudio = serializePreviewUrls({
    gender: voiceGender,
    eventNameAudioUrl,
    composedIntroAudioUrl: composedIsCurrent ? composedIntroAudioUrl : "",
    composedIsCurrent,
    pack: pack || null,
  });

  const followUpAudio = pack
    ? {
        afterPress1Url: String(pack.segments.afterPress1?.audioUrl || ""),
        afterValidQuantityUrl: String(
          pack.segments.afterValidQuantity?.audioUrl || ""
        ),
        afterPress2Or3Url: String(pack.segments.afterPress2Or3?.audioUrl || ""),
        invalidInputUrl: String(pack.segments.invalidInput?.audioUrl || ""),
      }
    : {
        afterPress1Url: "",
        afterValidQuantityUrl: "",
        afterPress2Or3Url: "",
        invalidInputUrl: "",
      };

  return {
    audioMode: cfg?.audioMode || "ai",
    eventName,
    eventNamePronunciation,
    voiceGender,
    /** Never expose ElevenLabs voice names/ids to clients — gender only. */
    eventNameAudio: {
      ...normalizeIvrAudioSubdoc(eventNameAudio),
      audioUrl: eventNameAudioUrl || eventNameAudio?.audioUrl || "",
    },
    composedIntroAudio: {
      ...normalizeIvrAudioSubdoc(composedIntroAudio),
      audioUrl: composedIntroAudioUrl || composedIntroAudio?.audioUrl || "",
    },
    /** Self-recorded path only */
    introAudio: cfg?.introAudio || { status: "missing", approved: false },
    recordingApproval: cfg?.recordingApproval || {
      approved: false,
      approvedAt: null,
      audioMode: cfg?.audioMode || null,
      voiceGender,
      audioPublicToken: "",
      audioContentHash: "",
      audioUrl: "",
    },
    previewText,
    recommendedScript: previewText,
    previewAudio,
    followUpAudio,
    globalPackReady: Boolean(pack),
    selfRecordMaxSeconds: IVR_SELF_RECORD_MAX_SECONDS,
    selfRecordRecommendedSeconds: IVR_SELF_RECORD_RECOMMENDED_SECONDS,
    systemPromptTexts: {
      introBeforeEventName: IVR_GLOBAL_PACK_TEXTS.introBeforeEventName,
      introAfterEventName: IVR_GLOBAL_PACK_TEXTS.introAfterEventName,
      afterPress1: IVR_GLOBAL_PACK_TEXTS.afterPress1,
      afterValidQuantity: IVR_GLOBAL_PACK_TEXTS.afterValidQuantity,
      afterPress2Or3: IVR_GLOBAL_PACK_TEXTS.afterPress2Or3,
      invalidInput: IVR_GLOBAL_PACK_TEXTS.invalidInput,
      askGuestCount: IVR_GLOBAL_PACK_TEXTS.afterPress1,
      thanksAttending: IVR_GLOBAL_PACK_TEXTS.afterValidQuantity,
      thanksReceived: IVR_GLOBAL_PACK_TEXTS.afterPress2Or3,
    },
    systemVoices: [] as Array<{ gender: string; label: string }>,
  };
}

async function loadPackSafe(gender: IvrVoiceGender | null) {
  if (!gender) return null;
  try {
    await hydrateApprovedPackVoiceIds();
    return await ensureGlobalVoicePack(gender, { reuseOnly: true });
  } catch (error) {
    console.warn(
      "[ivr/config] global pack load failed",
      sanitizeElevenLabsErrorMessage(
        error instanceof Error ? error.message : "pack_failed"
      )
    );
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthedIvrUser(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const user = await resolveIvrTargetUser({
      sessionUser: auth.user,
      isAdmin: auth.isAdmin,
      requestedUserId: new URL(req.url).searchParams.get("userId"),
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    await hydrateApprovedPackVoiceIds();
    const gender = resolveConfigGender(user.ivrConfig || {});
    const systemVoices = await getIvrSystemVoiceChoices();
    const pack = await loadPackSafe(gender);
    let approvalReset = false;
    const cfg = user.ivrConfig || {};
    const composed = cfg.composedIntroAudio;
    const approval = cfg.recordingApproval;
    const staleAiComposition =
      cfg.audioMode !== "self_recorded" &&
      approval?.audioMode !== "self_recorded" &&
      composed?.status === "ready" &&
      String(composed?.composeVersion || "") !== IVR_COMPOSE_VERSION &&
      (approval?.approved === true ||
        composed?.approved === true ||
        cfg.eventNameAudio?.approved === true);
    // GET must not mutate approvals. Dialer already blocks stale composeVersion.
    // Persisting a wipe here silently lost client approvals after deploy/version bumps.
    if (staleAiComposition) {
      approvalReset = true;
    }
    // Never await R2/HTTP on GET — a hung media check froze the whole screen.
    const ivrConfig = attachComposedMediaHealthLight(
      serializeIvrConfig(user.ivrConfig || {}, pack)
    );
    ivrConfig.systemVoices = systemVoices.voices.map((v) => ({
      gender: v.gender,
      label: v.label,
    }));

    return NextResponse.json({
      ok: true,
      callsType: user.callsType || "human",
      includeCalls: Boolean(user.includeCalls),
      approvalReset,
      ivrConfig,
      callRoundsSchedule: user.callRoundsSchedule || { enabled: false, rounds: [] },
      systemVoicesOnly: true,
      packsReady: systemVoices.packsReady,
    });
  } catch (error) {
    console.error("[ivr/config GET]", error);
    const payload = ivrPersistErrorPayload(error);
    return NextResponse.json(
      { ok: false, error: payload.error, message: payload.message },
      { status: payload.status }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthedIvrUser(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const user = await resolveIvrTargetUser({
      sessionUser: auth.user,
      isAdmin: auth.isAdmin,
      requestedUserId: body.userId,
    });

    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const prev = user.ivrConfig || {};
    const action = String(body.action || "").trim();

    // Rebuild composed intro from existing event-name + global packs (no TTS).
    if (action === "recompose_intro") {
      const eventNameAudio = prev.eventNameAudio || {};
      if (
        eventNameAudio.status !== "ready" ||
        !eventNameAudio.r2Key ||
        !eventNameAudio.contentHash
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "EVENT_NAME_AUDIO_MISSING",
            message: "אין מקטע שם אירוע שמור — יש ליצור את שם האירוע לפני חיבור מחדש.",
          },
          { status: 400 }
        );
      }
      const voiceGender = resolveConfigGender(prev);
      if (!voiceGender) {
        return NextResponse.json(
          { ok: false, error: "VOICE_GENDER_REQUIRED" },
          { status: 400 }
        );
      }
      await hydrateApprovedPackVoiceIds();
      await assertApprovedPackForGender(voiceGender);
      const pack = await ensureGlobalVoicePack(voiceGender);
      const voiceId = getIvrVoiceIdForGender(voiceGender);
      try {
        const composedIntroAudio = await buildAndStoreComposedIntro({
          userId: String(user._id),
          voiceId,
          eventNameHash: String(eventNameAudio.contentHash || ""),
          eventNameR2Key: String(eventNameAudio.r2Key || ""),
          pack,
        });
        assignIvrConfig(user, {
          audioMode: "ai",
          voiceGender,
          systemVoiceId: voiceId,
          voiceId,
          eventNameAudio: {
            ...normalizeIvrAudioSubdoc(eventNameAudio),
            approved: false,
            approvedAt: null,
          },
          composedIntroAudio,
          recordingApproval: {
            approved: false,
            approvedAt: null,
            audioMode: "ai",
            voiceGender,
            audioPublicToken: "",
            audioContentHash: "",
            audioUrl: "",
          },
          updatedAt: new Date(),
        });
        await user.save();
        try {
          await assertSavedComposedMediaPublic(composedIntroAudio);
        } catch (publicErr) {
          const detail =
            publicErr instanceof Error ? publicErr.message : "PUBLIC_MEDIA_FAIL";
          console.error("[ivr/config PATCH recompose] public media", detail);
          return NextResponse.json(
            {
              ok: false,
              error: "COMPOSE_PUBLIC_MEDIA_UNREACHABLE",
              message:
                "הקובץ נשמר באחסון אבל כתובת המדיה הציבורית לא נגישה לדפדפן/Telnyx. נסו שוב או בדקו את /api/ivr/media.",
              detail,
            },
            { status: 500 }
          );
        }
        const ivrConfig = await attachComposedMediaHealth(
          serializeIvrConfig(user.ivrConfig, pack)
        );
        return NextResponse.json({
          ok: true,
          recomposed: true,
          ivrConfig,
          message:
            "הקובץ המחובר נוצר מחדש מהמקטעים הקיימים. האזינו ואשרו שוב לפני חיוג.",
        });
      } catch (composeError) {
        const payload = ivrPersistErrorPayload(composeError);
        console.error("[ivr/config PATCH recompose]", composeError);
        return NextResponse.json(
          {
            ok: false,
            error: "COMPOSE_FAILED",
            message: payload.message,
            detail:
              composeError instanceof Error ? composeError.message : undefined,
          },
          { status: 500 }
        );
      }
    }

    // Approve / unapprove event-name (AI) or self-recorded intro audio.
    if (action === "approve_audio") {
      const mode = prev.audioMode || "ai";
      if (mode === "self_recorded") {
        const intro = prev.introAudio || {};
        if (intro.status !== "ready" || !intro.audioUrl) {
          return NextResponse.json(
            { ok: false, error: "AUDIO_NOT_READY" },
            { status: 400 }
          );
        }
        const approvedAt = new Date();
        assignIvrConfig(user, {
          introAudio: {
            ...normalizeIvrAudioSubdoc(intro),
            approved: true,
            approvedAt,
          },
          recordingApproval: {
            approved: true,
            approvedAt,
            audioMode: "self_recorded",
            voiceGender: null,
            audioPublicToken: String(intro.publicToken || ""),
            audioContentHash: String(intro.contentHash || ""),
            audioUrl: String(intro.audioUrl || ""),
          },
          updatedAt: approvedAt,
        });
      } else {
        const eventNameAudio = prev.eventNameAudio || {};
        const composedIntroAudio = prev.composedIntroAudio || {};
        const voiceGender = resolveConfigGender(prev);
        // Approve only after listening to the seamless composed intro.
        if (
          eventNameAudio.status !== "ready" ||
          !eventNameAudio.audioUrl ||
          !eventNameAudio.r2Key ||
          !eventNameAudio.contentHash ||
          composedIntroAudio.status !== "ready" ||
          !(composedIntroAudio.audioUrl || composedIntroAudio.publicToken)
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: "COMPOSED_INTRO_NOT_READY",
              message:
                "יש להאזין לתצוגה המקדימה המחוברת (משפט אחד) לפני אישור.",
            },
            { status: 400 }
          );
        }
        if (!voiceGender) {
          return NextResponse.json(
            { ok: false, error: "VOICE_GENDER_REQUIRED" },
            { status: 400 }
          );
        }
        await hydrateApprovedPackVoiceIds();
        await assertApprovedPackForGender(voiceGender);
        const pack = await ensureGlobalVoicePack(voiceGender, {
          reuseOnly: true,
        });
        if (!outboundPackSegmentsReady(pack)) {
          return NextResponse.json(
            {
              ok: false,
              error: "OUTBOUND_SEGMENTS_MISSING",
              message:
                "חסר מקטע פתיח או המשך קריינות ב־Voice Pack. אין לאשר לפני שיש את כל שלושת המקטעים.",
            },
            { status: 400 }
          );
        }
        const voiceId = getIvrVoiceIdForGender(voiceGender);
        const expectedComposeHash = contentHashForComposedIntro({
          beforeHash: String(
            pack.segments.introBeforeEventName.contentHash || ""
          ),
          eventNameHash: String(eventNameAudio.contentHash || ""),
          afterHash: String(
            pack.segments.introAfterEventName.contentHash || ""
          ),
          voiceId,
        });
        if (
          !composedIntroIsCurrentOutbound(
            composedIntroAudio,
            expectedComposeHash
          )
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: "COMPOSED_INTRO_STALE",
              message:
                "הקובץ המחובר אינו כולל את הפתיח המלא + שם האירוע בגרסה העדכנית. לחצו על «יצירה מחדש של הקובץ המחובר», האזינו ואשרו.",
              requiredComposeVersion: IVR_COMPOSE_VERSION,
              composeVersion: String(composedIntroAudio.composeVersion || ""),
            },
            { status: 400 }
          );
        }
        const mediaHead = await verifyIvrAudioInR2(
          String(composedIntroAudio.r2Key || "")
        );
        if (!mediaHead.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: "COMPOSED_MEDIA_UNAVAILABLE",
              message:
                "קובץ הקריינות המחובר לא נגיש כרגע. לחצו על «יצירה מחדש של הקובץ המחובר» ואז אשרו שוב.",
              mediaError: mediaHead.reason || "MEDIA_UNAVAILABLE",
            },
            { status: 400 }
          );
        }
        const approvedAt = new Date();
        const lockedUrl = resolveIvrPublicAudioUrl({
          publicToken: composedIntroAudio.publicToken,
          storedUrl: composedIntroAudio.audioUrl,
        });
        assignIvrConfig(user, {
          audioMode: "ai",
          eventNameAudio: {
            ...normalizeIvrAudioSubdoc(eventNameAudio),
            approved: true,
            approvedAt,
          },
          composedIntroAudio: {
            ...normalizeIvrAudioSubdoc(composedIntroAudio),
            approved: true,
            approvedAt,
            audioUrl: lockedUrl || composedIntroAudio.audioUrl,
            contentHash: expectedComposeHash,
            composeVersion: IVR_COMPOSE_VERSION,
          },
          recordingApproval: {
            approved: true,
            approvedAt,
            audioMode: "ai",
            voiceGender,
            audioPublicToken: String(composedIntroAudio.publicToken || ""),
            audioContentHash: expectedComposeHash,
            audioUrl: lockedUrl || String(composedIntroAudio.audioUrl || ""),
          },
          updatedAt: approvedAt,
        });
      }
      await user.save();
      const gender = resolveConfigGender(user.ivrConfig);
      void warmIvrChoiceFollowUps(gender || "female");
      const pack = await loadPackSafe(gender);
      return NextResponse.json({
        ok: true,
        ivrConfig: await attachComposedMediaHealth(
          serializeIvrConfig(user.ivrConfig, pack)
        ),
      });
    }

    const nextEventName = String(
      body.eventName ?? resolveIvrEventName(prev) ?? ""
    ).trim();
    const nextPronunciation = String(
      body.eventNamePronunciation ??
        resolveIvrEventNamePronunciation(prev) ??
        ""
    ).trim();

    let nextGender =
      normalizeIvrVoiceGender(body.voiceGender) ||
      resolveConfigGender({
        ...prev,
        voiceId: body.voiceId ?? prev.voiceId,
      });

    await hydrateApprovedPackVoiceIds();
    const systemVoices = await getIvrSystemVoiceChoices();

    const nextVoice = nextGender
      ? getIvrVoiceIdForGender(nextGender)
      : String(prev.systemVoiceId || prev.voiceId || "").trim();
    const nextMode = body.audioMode ?? prev.audioMode ?? "ai";

    const hash = nextGender
      ? contentHashForIvrEventName({
          eventName: nextEventName,
          eventNamePronunciation: nextPronunciation,
          voiceGender: nextGender,
          voiceId: nextVoice,
        })
      : "";

    let eventNameAudio = normalizeIvrAudioSubdoc(prev.eventNameAudio);
    const prevHash = String(eventNameAudio?.contentHash || "");
    const fieldsChanged =
      (prevHash && hash && hash !== prevHash) ||
      String(resolveIvrEventName(prev)) !== nextEventName ||
      String(resolveIvrEventNamePronunciation(prev)) !== nextPronunciation ||
      String(prev.voiceGender || "") !== String(nextGender || "") ||
      String(prev.systemVoiceId || prev.voiceId || "") !== nextVoice;

    let composedIntroAudio = normalizeIvrAudioSubdoc(prev.composedIntroAudio);
    let introAudio = normalizeIvrAudioSubdoc(prev.introAudio);
    let recordingApproval = prev.recordingApproval || {
      approved: false,
    };

    const modeChanged = String(prev.audioMode || "") !== String(nextMode || "");
    const selfInvalidated =
      nextMode === "self_recorded" &&
      (fieldsChanged || modeChanged) &&
      introAudio?.approved;

    if (
      eventNameAudio?.status === "ready" &&
      fieldsChanged &&
      nextMode === "ai"
    ) {
      eventNameAudio = {
        ...normalizeIvrAudioSubdoc(eventNameAudio),
        status: "stale",
        approved: false,
        approvedAt: null,
      };
    }

    if (
      composedIntroAudio?.status === "ready" &&
      fieldsChanged &&
      nextMode === "ai"
    ) {
      composedIntroAudio = {
        ...normalizeIvrAudioSubdoc(composedIntroAudio),
        status: "stale",
        approved: false,
        approvedAt: null,
      };
    }

    if (selfInvalidated) {
      introAudio = {
        ...normalizeIvrAudioSubdoc(introAudio),
        approved: false,
        approvedAt: null,
      };
    }

    if (fieldsChanged || modeChanged || selfInvalidated) {
      recordingApproval = {
        approved: false,
        approvedAt: null,
        audioMode: nextMode,
        voiceGender: nextGender,
        audioPublicToken: "",
        audioContentHash: "",
        audioUrl: "",
      };
    }

    assignIvrConfig(user, {
      audioMode: nextMode,
      eventName: nextEventName,
      eventNamePronunciation: nextPronunciation,
      voiceGender: nextGender,
      systemVoiceId: nextVoice,
      voiceId: nextVoice,
      eventNameAudio,
      composedIntroAudio,
      introAudio,
      recordingApproval,
      updatedAt: new Date(),
    });

    await user.save();

    const pack = await loadPackSafe(nextGender);
    const ivrConfig = serializeIvrConfig(user.ivrConfig, pack);
    ivrConfig.systemVoices = systemVoices.voices.map((v) => ({
      gender: v.gender,
      label: v.label,
    }));

    return NextResponse.json({
      ok: true,
      ivrConfig,
      packsReady: systemVoices.packsReady,
      needsRegenerate: eventNameAudio?.status === "stale",
      needsApproval: Boolean(
        eventNameAudio?.status === "ready" && !eventNameAudio?.approved
      ),
    });
  } catch (error) {
    console.error("[ivr/config PATCH]", error);
    const payload = ivrPersistErrorPayload(error);
    return NextResponse.json(
      { ok: false, error: payload.error, message: payload.message },
      { status: payload.status }
    );
  }
}

/**
 * Generate AI event-name audio only.
 * Fixed pack segments are ensured once globally — never re-TTS'd as the event payload.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthedIvrUser(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "generate_ai");

    const user = await resolveIvrTargetUser({
      sessionUser: auth.user,
      isAdmin: auth.isAdmin,
      requestedUserId: body.userId,
    });

    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (action === "ensure_system_prompts" || action === "ensure_global_packs") {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_ONLY",
          message:
            "יצירת קטעים קבועים מתבצעת רק באדמין → שיחות מוקלטות → הגדרות קריינות",
        },
        { status: 403 }
      );
    }

    const cfg = user.ivrConfig || {};
    const eventName = String(
      body.eventName || resolveIvrEventName(cfg) || ""
    ).trim();
    const eventNamePronunciation = String(
      body.eventNamePronunciation ||
        resolveIvrEventNamePronunciation(cfg) ||
        ""
    ).trim();

    // New customer AI audio is the locked female pack only.
    // Stored audio is left unchanged until this generate request runs.
    const voiceGender = "female";

    await hydrateApprovedPackVoiceIds();

    try {
      await assertApprovedPackForGender(voiceGender);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "VOICE_PACKS_NOT_APPROVED",
          message:
            "הקריינות הגלובלית עדיין לא אושרה באדמין. לא ניתן ליצור שם אירוע.",
        },
        { status: 409 }
      );
    }

    // Customer TTS uses only the two locked voices. No voice catalog.
    const voiceId = IVR_LOCKED_FEMALE_VOICE_ID;
    if (!eventName || !voiceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_FIELDS",
          message: !voiceId
            ? "קול המערכת לא הוגדר ב-Voice Pack המאושר."
            : "חסר שם אירוע",
        },
        { status: 400 }
      );
    }

    // Load approved global pack only (reuse — never create fixed texts here).
    const pack = await ensureGlobalVoicePack(voiceGender, { reuseOnly: true });
    const packReuseStats = Object.fromEntries(
      Object.entries(pack.segments).map(([k, v]) => [k, v.reused])
    );

    const spokenName = buildIvrEventNameSpeechText({
      eventName,
      eventNamePronunciation,
    });

    const hash = contentHashForIvrEventName({
      eventName,
      eventNamePronunciation,
      voiceGender,
      voiceId,
    });

    const expectedComposeHash = contentHashForComposedIntro({
      beforeHash: String(
        pack.segments.introBeforeEventName?.contentHash || ""
      ),
      eventNameHash: hash,
      afterHash: String(pack.segments.introAfterEventName?.contentHash || ""),
      voiceId,
    });

    let eventNameAudio = cfg.eventNameAudio;
    let reusedEventName = false;

    // Reuse existing event-name audio if hash matches — never re-TTS on Play.
    if (
      eventNameAudio?.status === "ready" &&
      eventNameAudio?.contentHash === hash &&
      eventNameAudio?.audioUrl &&
      eventNameAudio?.r2Key &&
      !body.force
    ) {
      reusedEventName = true;
    } else {
      // ONLY synthesize the event name — never the fixed pack texts here.
      const synth = await synthesizeElevenLabsSpeech({
        text: spokenName,
        voiceId,
      });
      const publicToken = createIvrAudioPublicToken();
      const r2Key = ivrEventNameR2Key(String(user._id), publicToken, "mp3");

      await uploadIvrAudioToR2({
        key: r2Key,
        buffer: synth.buffer,
        contentType: synth.contentType,
      });

      const audioUrl = buildIvrPublicAudioUrl(publicToken);
      eventNameAudio = normalizeIvrAudioSubdoc({
        status: "ready",
        source: "elevenlabs",
        publicToken,
        audioUrl,
        r2Key,
        contentType: synth.contentType,
        contentHash: hash,
        durationSeconds: null,
        generatedAt: new Date(),
        textSnapshot: spokenName,
        approved: false,
        approvedAt: null,
      });

      // Persist the clip before compose. A compose/save failure must not
      // force another ElevenLabs call on the next attempt.
      assignIvrConfig(user, {
        audioMode: "ai",
        eventName,
        eventNamePronunciation,
        voiceGender,
        systemVoiceId: voiceId,
        voiceId,
        eventNameAudio,
        composedIntroAudio: cfg.composedIntroAudio,
        introAudio: cfg.introAudio,
        recordingApproval: {
          approved: false,
          approvedAt: null,
          audioMode: "ai",
          voiceGender,
          audioPublicToken: "",
          audioContentHash: "",
          audioUrl: "",
        },
        updatedAt: new Date(),
      });
      await user.save();
    }

    // Seamless compose on the server (ffmpeg) — no ElevenLabs credits.
    let composedIntroAudio = user.ivrConfig?.composedIntroAudio || cfg.composedIntroAudio;
    let reusedCompose = false;
    if (
      composedIntroAudio?.status === "ready" &&
      composedIntroAudio?.contentHash === expectedComposeHash &&
      composedIntroAudio?.audioUrl &&
      composedIntroAudio?.r2Key &&
      !body.force
    ) {
      reusedCompose = true;
    } else {
      try {
        composedIntroAudio = await buildAndStoreComposedIntro({
          userId: String(user._id),
          voiceId,
          eventNameHash: hash,
          eventNameR2Key: String(eventNameAudio.r2Key || ""),
          pack,
        });
      } catch (composeError) {
        const payload = ivrPersistErrorPayload(composeError);
        console.error("[ivr/config POST compose]", composeError);
        return NextResponse.json(
          {
            ok: false,
            error: "COMPOSE_FAILED",
            message: payload.message,
            eventNameSaved: true,
            eventNameAudio,
          },
          { status: 500 }
        );
      }
    }

    const composedInboundAudio = normalizeIvrAudioSubdoc(
      user.ivrConfig?.composedInboundAudio || cfg.composedInboundAudio
    );

    const keepApproval =
      reusedEventName &&
      reusedCompose &&
      !body.force &&
      eventNameAudio?.approved === true &&
      composedIntroAudio?.approved === true;

    assignIvrConfig(user, {
      audioMode: "ai",
      eventName,
      eventNamePronunciation,
      voiceGender,
      systemVoiceId: voiceId,
      voiceId,
      eventNameAudio: {
        ...normalizeIvrAudioSubdoc(eventNameAudio),
        approved: keepApproval,
        approvedAt: keepApproval ? eventNameAudio?.approvedAt || null : null,
      },
      composedIntroAudio: {
        ...normalizeIvrAudioSubdoc(composedIntroAudio),
        approved: keepApproval,
        approvedAt: keepApproval
          ? composedIntroAudio?.approvedAt || null
          : null,
      },
      composedInboundAudio,
      introAudio: cfg.introAudio,
      recordingApproval: keepApproval
        ? user.ivrConfig?.recordingApproval
        : {
            approved: false,
            approvedAt: null,
            audioMode: "ai",
            voiceGender,
            audioPublicToken: "",
            audioContentHash: "",
            audioUrl: "",
          },
      updatedAt: new Date(),
    });

    await user.save();
    void warmIvrChoiceFollowUps(voiceGender);

    if (!reusedCompose || body.force) {
      try {
        await assertSavedComposedMediaPublic(composedIntroAudio);
      } catch (publicErr) {
        const detail =
          publicErr instanceof Error ? publicErr.message : "PUBLIC_MEDIA_FAIL";
        console.error("[ivr/config POST] public media", detail);
        return NextResponse.json(
          {
            ok: false,
            error: "COMPOSE_PUBLIC_MEDIA_UNREACHABLE",
            message:
              "שם האירוע נשמר, אבל כתובת הקובץ המחובר לא נגישה להשמעה. לחצו שוב על יצירה/חיבור מחדש.",
            detail,
            eventNameSaved: true,
            eventNameAudio: user.ivrConfig?.eventNameAudio,
          },
          { status: 500 }
        );
      }
    }

    const previewAudio = serializePreviewUrls({
      gender: voiceGender,
      eventNameAudioUrl: resolveIvrPublicAudioUrl({
        publicToken: eventNameAudio.publicToken,
        storedUrl: eventNameAudio.audioUrl,
      }),
      composedIntroAudioUrl: resolveIvrPublicAudioUrl({
        publicToken: composedIntroAudio.publicToken,
        storedUrl: composedIntroAudio.audioUrl,
      }),
      composedIsCurrent: composedIntroIsCurrentOutbound(
        composedIntroAudio,
        expectedComposeHash
      ),
      pack,
    });
    const serialized = await attachComposedMediaHealth(
      serializeIvrConfig(user.ivrConfig, pack)
    );

    return NextResponse.json({
      ok: true,
      // Hash match returns reused: true and does not call ElevenLabs again.
      reused: Boolean(reusedEventName && reusedCompose),
      reusedEventName,
      reusedCompose,
      eventNameOnly: true,
      composedWithoutElevenLabs: true,
      eventNameAudio: user.ivrConfig.eventNameAudio,
      composedIntroAudio: user.ivrConfig.composedIntroAudio,
      previewAudio,
      followUpAudio: serialized.followUpAudio,
      previewText: buildIvrRecommendedScriptForDisplay({ eventName }),
      packSegmentReuse: packReuseStats,
      /** Proof flag: this request did not synthesize fixed pack texts as event payload. */
      fixedTextsSynthesized: false,
      synthesizedText: reusedEventName ? undefined : spokenName,
    });
  } catch (error) {
    const persist = ivrPersistErrorPayload(error);
    const payload = voiceErrorToClientPayload(error);
    const raw = error instanceof Error ? error.message : "";
    const isEleven =
      payload.error.startsWith("ELEVENLABS_") ||
      payload.error === "ELEVENLABS_INSUFFICIENT_CREDITS" ||
      payload.error === "ELEVENLABS_PAYMENT_REQUIRED" ||
      payload.providerStatus != null;
    console.error("[ivr/config POST]", {
      error: payload.error,
      providerStatus: payload.providerStatus,
    });
    const voiceCatalog =
      payload.error === "VOICES_FAILED" ||
      /טעינת רשימת הקולות/.test(String(payload.message || ""));
    if (
      !isEleven ||
      voiceCatalog ||
      /Cast to Object failed|ValidationError|User validation failed/i.test(raw)
    ) {
      return NextResponse.json(
        { ok: false, error: persist.error, message: persist.message },
        { status: persist.status }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: payload.error === "VOICES_FAILED" ? "TTS_FAILED" : payload.error,
        message: payload.message,
        providerStatus: payload.providerStatus,
        providerDetail: payload.providerDetail,
        providerStatusCode: payload.providerStatusCode,
      },
      {
        status:
          payload.providerStatus === 402 ||
          payload.error === "ELEVENLABS_INSUFFICIENT_CREDITS" ||
          payload.error === "ELEVENLABS_PAYMENT_REQUIRED"
            ? 402
            : 500,
      }
    );
  }
}
