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
  listIvrSystemVoiceOptions,
  sanitizeElevenLabsErrorMessage,
  synthesizeElevenLabsSpeech,
  voiceErrorToClientPayload,
} from "@/lib/calls/elevenlabs";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  ivrEventNameR2Key,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";
import {
  ensureBothGlobalVoicePacks,
  ensureGlobalVoicePack,
} from "@/lib/calls/ivrSystemAudio";

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

  const voiceId = String(cfg?.systemVoiceId || cfg?.voiceId || "").trim();
  if (!voiceId) return null;
  for (const option of listIvrSystemVoiceOptions()) {
    if (option.voiceId === voiceId) return option.gender;
  }
  return null;
}

function serializePreviewUrls(input: {
  gender: IvrVoiceGender | null;
  eventNameAudioUrl?: string;
  pack?: Awaited<ReturnType<typeof ensureGlobalVoicePack>> | null;
}) {
  if (!input.gender || !input.pack) {
    return {
      introBeforeEventNameUrl: "",
      eventNameAudioUrl: String(input.eventNameAudioUrl || ""),
      introAfterEventNameUrl: "",
      playlist: [] as string[],
    };
  }

  const before = String(
    input.pack.segments.introBeforeEventName?.audioUrl || ""
  );
  const eventName = String(input.eventNameAudioUrl || "");
  const after = String(input.pack.segments.introAfterEventName?.audioUrl || "");
  const playlist = [before, eventName, after].filter(Boolean);

  return {
    introBeforeEventNameUrl: before,
    eventNameAudioUrl: eventName,
    introAfterEventNameUrl: after,
    playlist,
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

  const previewAudio = serializePreviewUrls({
    gender: voiceGender,
    eventNameAudioUrl: eventNameAudio?.audioUrl,
    pack: pack || null,
  });

  return {
    audioMode: cfg?.audioMode || null,
    eventName,
    eventNamePronunciation,
    voiceGender,
    systemVoiceId,
    /** @deprecated use voiceGender */
    voiceId: systemVoiceId,
    eventNameAudio,
    /** Self-recorded path only */
    introAudio: cfg?.introAudio || { status: "missing", approved: false },
    previewText,
    recommendedScript: previewText,
    previewAudio,
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
      // Legacy keys for older UI / simulator
      askGuestCount: IVR_GLOBAL_PACK_TEXTS.afterPress1,
      thanksAttending: IVR_GLOBAL_PACK_TEXTS.afterValidQuantity,
      thanksReceived: IVR_GLOBAL_PACK_TEXTS.afterPress2Or3,
    },
    systemVoices: listIvrSystemVoiceOptions().map((v) => ({
      gender: v.gender,
      label: v.label,
      voiceId: v.voiceId,
    })),
  };
}

async function loadPackSafe(gender: IvrVoiceGender | null) {
  if (!gender) return null;
  try {
    return await ensureGlobalVoicePack(gender);
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

    const gender = resolveConfigGender(user.ivrConfig || {});
    const pack = await loadPackSafe(gender);

    return NextResponse.json({
      ok: true,
      callsType: user.callsType || "human",
      includeCalls: Boolean(user.includeCalls),
      ivrConfig: serializeIvrConfig(user.ivrConfig || {}, pack),
      callRoundsSchedule: user.callRoundsSchedule || { enabled: false, rounds: [] },
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
        user.ivrConfig = {
          ...(prev as any),
          introAudio: {
            ...intro,
            approved: true,
            approvedAt: new Date(),
          },
          updatedAt: new Date(),
        };
      } else {
        const eventNameAudio = prev.eventNameAudio || {};
        if (eventNameAudio.status !== "ready" || !eventNameAudio.audioUrl) {
          return NextResponse.json(
            { ok: false, error: "AUDIO_NOT_READY" },
            { status: 400 }
          );
        }
        user.ivrConfig = {
          ...(prev as any),
          eventNameAudio: {
            ...eventNameAudio,
            approved: true,
            approvedAt: new Date(),
          },
          updatedAt: new Date(),
        };
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

    // Allow picking by system voiceId if gender omitted.
    if (!nextGender && body.voiceId) {
      for (const option of listIvrSystemVoiceOptions()) {
        if (option.voiceId === String(body.voiceId).trim()) {
          nextGender = option.gender;
          break;
        }
      }
    }

    const nextVoice = nextGender
      ? getIvrVoiceIdForGender(nextGender)
      : String(body.voiceId ?? prev.systemVoiceId ?? prev.voiceId ?? "").trim();
    const nextMode = body.audioMode ?? prev.audioMode ?? null;

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

    user.ivrConfig = {
      ...(prev as any),
      audioMode: nextMode,
      eventName: nextEventName,
      eventNamePronunciation: nextPronunciation,
      voiceGender: nextGender,
      systemVoiceId: nextVoice,
      voiceId: nextVoice,
      eventNameAudio,
      updatedAt: new Date(),
    };

    await user.save();

    const pack = await loadPackSafe(nextGender);

    return NextResponse.json({
      ok: true,
      ivrConfig: serializeIvrConfig(user.ivrConfig, pack),
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
      const packs = await ensureBothGlobalVoicePacks();
      return NextResponse.json({
        ok: true,
        packs: packs.map((p) => ({
          gender: p.gender,
          voiceId: p.voiceId,
          segments: Object.fromEntries(
            Object.entries(p.segments).map(([k, v]) => [
              k,
              { audioUrl: v.audioUrl, reused: v.reused, contentHash: v.contentHash },
            ])
          ),
        })),
      });
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

    let voiceGender =
      normalizeIvrVoiceGender(body.voiceGender) || resolveConfigGender(cfg);

    if (!voiceGender && body.voiceId) {
      for (const option of listIvrSystemVoiceOptions()) {
        if (option.voiceId === String(body.voiceId).trim()) {
          voiceGender = option.gender;
          break;
        }
      }
    }

    if (!voiceGender) {
      return NextResponse.json(
        { ok: false, error: "VOICE_GENDER_REQUIRED", message: "בחרו קול נשי או גברי" },
        { status: 400 }
      );
    }

    const voiceId = getIvrVoiceIdForGender(voiceGender);
    if (!eventName || !voiceId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Ensure global pack exists (reuses cached fixed segments — no per-event TTS).
    const pack = await ensureGlobalVoicePack(voiceGender);
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

    // Reuse existing event-name audio if hash matches — never re-TTS on Play.
    if (
      cfg.eventNameAudio?.status === "ready" &&
      cfg.eventNameAudio?.contentHash === hash &&
      cfg.eventNameAudio?.audioUrl &&
      !body.force
    ) {
      const previewAudio = serializePreviewUrls({
        gender: voiceGender,
        eventNameAudioUrl: cfg.eventNameAudio.audioUrl,
        pack,
      });
      return NextResponse.json({
        ok: true,
        reused: true,
        eventNameOnly: true,
        eventNameAudio: cfg.eventNameAudio,
        previewAudio,
        previewText: buildIvrRecommendedScriptForDisplay({ eventName }),
        packSegmentReuse: packReuseStats,
        fixedTextsSynthesized: false,
      });
    }

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

    user.ivrConfig = {
      ...(cfg as any),
      audioMode: "ai",
      eventName,
      eventNamePronunciation,
      voiceGender,
      systemVoiceId: voiceId,
      voiceId,
      eventNameAudio: {
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
      },
      updatedAt: new Date(),
    };

    await user.save();

    const previewAudio = serializePreviewUrls({
      gender: voiceGender,
      eventNameAudioUrl: audioUrl,
      pack,
    });

    return NextResponse.json({
      ok: true,
      reused: false,
      eventNameOnly: true,
      eventNameAudio: user.ivrConfig.eventNameAudio,
      previewAudio,
      previewText: buildIvrRecommendedScriptForDisplay({ eventName }),
      packSegmentReuse: packReuseStats,
      /** Proof flag: this request did not synthesize fixed pack texts as event payload. */
      fixedTextsSynthesized: false,
      synthesizedText: spokenName,
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
      },
      { status: 500 }
    );
  }
}
