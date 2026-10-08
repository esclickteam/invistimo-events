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
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
} from "@/lib/calls/ivrComposeIntro";

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

/** Plain object from mongoose subdoc / lean / undefined — never leave undefined. */
function plainIvrConfig(cfg: any): Record<string, unknown> {
  if (!cfg) return {};
  if (typeof cfg.toObject === "function") {
    try {
      return cfg.toObject({ depopulate: true }) || {};
    } catch {
      /* fall through */
    }
  }
  return { ...cfg };
}

/**
 * Mongoose CastError "Cast to Object failed for value undefined" happens when
 * nested audio subdocs are explicitly set to undefined (e.g. spreading a
 * Subdocument that never initialized those paths). Always persist objects.
 */
function normalizeIvrAudioSubdoc(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    return { status: "missing", approved: false };
  }
  const src =
    typeof (raw as any).toObject === "function"
      ? (raw as any).toObject()
      : (raw as Record<string, unknown>);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src || {})) {
    if (value !== undefined) out[key] = value;
  }
  if (!out.status) out.status = "missing";
  if (typeof out.approved !== "boolean") out.approved = false;
  return out;
}

function assignIvrConfig(
  user: { ivrConfig?: any },
  next: Record<string, unknown>
) {
  const base = plainIvrConfig(user.ivrConfig);
  const merged: Record<string, unknown> = { ...base, ...next };
  // Drop keys that are still undefined after merge — mongoose rejects them.
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key];
  }
  merged.eventNameAudio = normalizeIvrAudioSubdoc(merged.eventNameAudio);
  merged.composedIntroAudio = normalizeIvrAudioSubdoc(
    merged.composedIntroAudio
  );
  merged.introAudio = normalizeIvrAudioSubdoc(merged.introAudio);
  user.ivrConfig = merged as any;
}

function serializePreviewUrls(input: {
  gender: IvrVoiceGender | null;
  eventNameAudioUrl?: string;
  composedIntroAudioUrl?: string;
  pack?: Awaited<ReturnType<typeof ensureGlobalVoicePack>> | null;
}) {
  if (!input.gender || !input.pack) {
    return {
      introBeforeEventNameUrl: "",
      eventNameAudioUrl: String(input.eventNameAudioUrl || ""),
      introAfterEventNameUrl: "",
      composedIntroAudioUrl: String(input.composedIntroAudioUrl || ""),
      /** Prefer single seamless file for Preview; playlist is fallback only. */
      playlist: input.composedIntroAudioUrl
        ? [String(input.composedIntroAudioUrl)]
        : ([] as string[]),
      seamless: Boolean(input.composedIntroAudioUrl),
    };
  }

  const before = String(
    input.pack.segments.introBeforeEventName?.audioUrl || ""
  );
  const eventName = String(input.eventNameAudioUrl || "");
  const after = String(input.pack.segments.introAfterEventName?.audioUrl || "");
  const composed = String(input.composedIntroAudioUrl || "");
  const playlist = composed
    ? [composed]
    : [before, eventName, after].filter(Boolean);

  return {
    introBeforeEventNameUrl: before,
    eventNameAudioUrl: eventName,
    introAfterEventNameUrl: after,
    composedIntroAudioUrl: composed,
    playlist,
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

  const previewAudio = serializePreviewUrls({
    gender: voiceGender,
    eventNameAudioUrl,
    composedIntroAudioUrl,
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
      ...eventNameAudio,
      audioUrl: eventNameAudioUrl || eventNameAudio?.audioUrl || "",
    },
    composedIntroAudio: {
      ...composedIntroAudio,
      audioUrl: composedIntroAudioUrl || composedIntroAudio?.audioUrl || "",
    },
    /** Self-recorded path only */
    introAudio: cfg?.introAudio || { status: "missing", approved: false },
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
    const ivrConfig = serializeIvrConfig(user.ivrConfig || {}, pack);
    ivrConfig.systemVoices = systemVoices.voices.map((v) => ({
      gender: v.gender,
      label: v.label,
    }));

    return NextResponse.json({
      ok: true,
      callsType: user.callsType || "human",
      includeCalls: Boolean(user.includeCalls),
      ivrConfig,
      callRoundsSchedule: user.callRoundsSchedule || { enabled: false, rounds: [] },
      systemVoicesOnly: true,
      packsReady: systemVoices.packsReady,
    });
  } catch (error) {
    console.error("[ivr/config GET]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
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
        assignIvrConfig(user, {
          introAudio: {
            ...intro,
            approved: true,
            approvedAt: new Date(),
          },
          updatedAt: new Date(),
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

    let eventNameAudio =
      prev.eventNameAudio || ({ status: "missing", approved: false } as any);
    const prevHash = String(eventNameAudio?.contentHash || "");
    const fieldsChanged =
      (prevHash && hash && hash !== prevHash) ||
      String(resolveIvrEventName(prev)) !== nextEventName ||
      String(resolveIvrEventNamePronunciation(prev)) !== nextPronunciation ||
      String(prev.voiceGender || "") !== String(nextGender || "") ||
      String(prev.systemVoiceId || prev.voiceId || "") !== nextVoice;

    let composedIntroAudio =
      prev.composedIntroAudio ||
      ({ status: "missing", approved: false } as any);

    if (
      eventNameAudio?.status === "ready" &&
      fieldsChanged &&
      nextMode === "ai"
    ) {
      eventNameAudio = {
        ...eventNameAudio,
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
        ...composedIntroAudio,
        status: "stale",
        approved: false,
        approvedAt: null,
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
      // Preserve existing introAudio — never wipe with undefined from spreads.
      introAudio: prev.introAudio,
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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
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

    const voiceGender =
      normalizeIvrVoiceGender(body.voiceGender) || resolveConfigGender(cfg);

    await hydrateApprovedPackVoiceIds();

    if (!voiceGender) {
      return NextResponse.json(
        {
          ok: false,
          error: "VOICE_GENDER_REQUIRED",
          message: "בחרו קול נשי או קול גברי",
        },
        { status: 400 }
      );
    }

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

    const voiceId = getIvrVoiceIdForGender(voiceGender);
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
      eventNameAudio = {
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
      };
    }

    // Seamless compose on the server (ffmpeg) — no ElevenLabs credits.
    let composedIntroAudio = cfg.composedIntroAudio;
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
      composedIntroAudio = await buildAndStoreComposedIntro({
        userId: String(user._id),
        voiceId,
        eventNameHash: hash,
        eventNameR2Key: String(eventNameAudio.r2Key || ""),
        pack,
      });
    }

    assignIvrConfig(user, {
      audioMode: "ai",
      eventName,
      eventNamePronunciation,
      voiceGender,
      systemVoiceId: voiceId,
      voiceId,
      eventNameAudio: {
        ...(eventNameAudio || {}),
        approved: false,
        approvedAt: null,
      },
      composedIntroAudio: {
        ...(composedIntroAudio || {}),
        approved: false,
        approvedAt: null,
      },
      introAudio: cfg.introAudio,
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
      pack,
    });
    const serialized = serializeIvrConfig(user.ivrConfig, pack);

    return NextResponse.json({
      ok: true,
      reused: reusedEventName && reusedCompose,
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
    const payload = voiceErrorToClientPayload(error);
    console.error("[ivr/config POST]", {
      error: payload.error,
      providerStatus: payload.providerStatus,
    });
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
