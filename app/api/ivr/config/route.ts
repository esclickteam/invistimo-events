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
} from "@/lib/calls/ivrAudioStorage";
import { ensureGlobalVoicePack } from "@/lib/calls/ivrSystemAudio";
import {
  assertApprovedPackForGender,
  getIvrSystemVoiceChoices,
} from "@/lib/calls/ivrSystemVoices";
import { hydrateApprovedPackVoiceIds } from "@/lib/calls/ivrAdminVoicePacks";
import {
  composeIvrIntroAudio,
  contentHashForComposedInbound,
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
  IVR_INBOUND_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";
import { buildComposedInboundAudio } from "@/lib/calls/ivrComposedInbound";
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


function composedIntroIsCurrentOutbound(composed: any) {
  return (
    composed?.status === "ready" &&
    Boolean(composed?.audioUrl) &&
    String(composed?.composeVersion || "") === IVR_COMPOSE_VERSION
  );
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
  const playlist = composed
    ? [composed]
    : [before, eventName, after].filter(Boolean);
  const inboundPlaylist = [inboundBefore, eventName, inboundAfter].filter(
    Boolean
  );

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

  const composedIsCurrent = composedIntroIsCurrentOutbound(composedIntroAudio);
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
    if (staleAiComposition) {
      if (cfg.eventNameAudio) {
        cfg.eventNameAudio.approved = false;
        cfg.eventNameAudio.approvedAt = null;
      }
      if (cfg.composedIntroAudio) {
        cfg.composedIntroAudio.approved = false;
        cfg.composedIntroAudio.approvedAt = null;
      }
      if (cfg.recordingApproval) {
        cfg.recordingApproval.approved = false;
        cfg.recordingApproval.approvedAt = null;
      }
      await user.updateOne({
        $set: {
          "ivrConfig.eventNameAudio.approved": false,
          "ivrConfig.eventNameAudio.approvedAt": null,
          "ivrConfig.composedIntroAudio.approved": false,
          "ivrConfig.composedIntroAudio.approvedAt": null,
          "ivrConfig.recordingApproval.approved": false,
          "ivrConfig.recordingApproval.approvedAt": null,
        },
      });
      approvalReset = true;
    }
    const ivrConfig = serializeIvrConfig(user.ivrConfig || {}, pack);
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
        // Approve only after listening to the seamless composed intro.
        if (
          eventNameAudio.status !== "ready" ||
          !eventNameAudio.audioUrl ||
          composedIntroAudio.status !== "ready" ||
          !composedIntroAudio.audioUrl
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
        const approvedAt = new Date();
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
          },
          recordingApproval: {
            approved: true,
            approvedAt,
            audioMode: "ai",
            voiceGender: resolveConfigGender(prev),
            audioPublicToken: String(composedIntroAudio.publicToken || ""),
            audioContentHash: String(composedIntroAudio.contentHash || ""),
            audioUrl: String(composedIntroAudio.audioUrl || ""),
          },
          updatedAt: approvedAt,
        });
      }
      await user.save();
      const gender = resolveConfigGender(user.ivrConfig);
      const pack = await loadPackSafe(gender);
      return NextResponse.json({
        ok: true,
        ivrConfig: serializeIvrConfig(user.ivrConfig, pack),
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

    const expectedInboundHash = contentHashForComposedInbound({
      beforeHash: String(
        pack.segments.inboundBeforeEventName?.contentHash || ""
      ),
      eventNameHash: hash,
      afterHash: String(pack.segments.inboundAfterEventName?.contentHash || ""),
      voiceId,
    });
    let composedInboundAudio = normalizeIvrAudioSubdoc(
      user.ivrConfig?.composedInboundAudio || cfg.composedInboundAudio
    );
    const inboundBeforeKey = String(
      pack.segments.inboundBeforeEventName?.r2Key || ""
    );
    const inboundAfterKey = String(
      pack.segments.inboundAfterEventName?.r2Key || ""
    );
    if (
      composedInboundAudio?.status === "ready" &&
      composedInboundAudio?.contentHash === expectedInboundHash &&
      composedInboundAudio?.composeVersion === IVR_INBOUND_COMPOSE_VERSION &&
      composedInboundAudio?.audioUrl &&
      composedInboundAudio?.r2Key &&
      !body.force
    ) {
      // Current inbound stitch already stored.
    } else if (inboundBeforeKey && inboundAfterKey && eventNameAudio?.r2Key) {
      try {
        composedInboundAudio = await buildComposedInboundAudio({
          userId: String(user._id),
          voiceId,
          eventNameHash: hash,
          eventNameR2Key: String(eventNameAudio.r2Key),
          beforeR2Key: inboundBeforeKey,
          beforeHash: String(
            pack.segments.inboundBeforeEventName?.contentHash || ""
          ),
          afterR2Key: inboundAfterKey,
          afterHash: String(
            pack.segments.inboundAfterEventName?.contentHash || ""
          ),
        });
      } catch (inboundComposeError) {
        console.error("[ivr/config POST inbound compose]", inboundComposeError);
      }
    }

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
      composedIsCurrent: composedIntroIsCurrentOutbound(composedIntroAudio),
      pack,
    });
    const serialized = serializeIvrConfig(user.ivrConfig, pack);

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
