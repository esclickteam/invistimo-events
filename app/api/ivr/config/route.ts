import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  buildIvrIntroText,
  buildIvrRecommendedScriptForDisplay,
  contentHashForIvrIntro,
  IVR_SELF_RECORD_MAX_SECONDS,
  IVR_SELF_RECORD_RECOMMENDED_SECONDS,
  resolveIvrEventName,
  resolveIvrEventNamePronunciation,
} from "@/lib/calls/ivrScript";
import {
  sanitizeElevenLabsErrorMessage,
  synthesizeElevenLabsSpeech,
} from "@/lib/calls/elevenlabs";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  ivrIntroR2Key,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";
import { ensureAllIvrSystemPrompts } from "@/lib/calls/ivrSystemAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthedIvrUser(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return { error: "UNAUTHORIZED", status: 401 as const };

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return { error: "UNAUTHORIZED", status: 401 as const };

  const role = String(user.role || "");
  if (role === "admin") {
    return { user, isAdmin: true };
  }

  if (!isIvrCallsUser(user)) {
    return { error: "FORBIDDEN", status: 403 as const };
  }

  return { user, isAdmin: false };
}

function serializeIvrConfig(cfg: any) {
  const eventName = resolveIvrEventName(cfg);
  const eventNamePronunciation = resolveIvrEventNamePronunciation(cfg);
  const previewText = buildIvrRecommendedScriptForDisplay({ eventName });

  return {
    audioMode: cfg?.audioMode || null,
    eventName,
    eventNamePronunciation,
    voiceId: String(cfg?.voiceId || ""),
    introAudio: cfg?.introAudio || { status: "missing", approved: false },
    previewText,
    recommendedScript: previewText,
    selfRecordMaxSeconds: IVR_SELF_RECORD_MAX_SECONDS,
    selfRecordRecommendedSeconds: IVR_SELF_RECORD_RECOMMENDED_SECONDS,
    systemPromptTexts: {
      askGuestCount:
        "מעולה. אנא הקישו את מספר האורחים שיגיעו, כולל אתכם.",
      thanksAttending:
        "תודה רבה. אישור ההגעה שלכם התקבל. נתראה בשמחות.",
      thanksReceived: "תודה רבה. תשובתכם התקבלה.",
      invalidInput: "לא הצלחנו לזהות את הבחירה. אנא נסו שוב.",
    },
  };
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

    const targetId =
      auth.isAdmin && new URL(req.url).searchParams.get("userId")
        ? String(new URL(req.url).searchParams.get("userId"))
        : String(auth.user._id);

    const user =
      targetId === String(auth.user._id)
        ? auth.user
        : await User.findById(targetId);

    if (!user) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      callsType: user.callsType || "human",
      includeCalls: Boolean(user.includeCalls),
      ivrConfig: serializeIvrConfig(user.ivrConfig || {}),
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
    const targetId =
      auth.isAdmin && body.userId ? String(body.userId) : String(auth.user._id);

    const user =
      targetId === String(auth.user._id)
        ? auth.user
        : await User.findById(targetId);

    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const prev = user.ivrConfig || {};
    const action = String(body.action || "").trim();

    // Approve / unapprove stored audio without regenerating.
    if (action === "approve_audio") {
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
      await user.save();
      return NextResponse.json({
        ok: true,
        ivrConfig: serializeIvrConfig(user.ivrConfig),
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
    const nextVoice = String(body.voiceId ?? prev.voiceId ?? "").trim();
    const nextMode = body.audioMode ?? prev.audioMode ?? null;

    const hash = contentHashForIvrIntro({
      eventName: nextEventName,
      eventNamePronunciation: nextPronunciation,
      voiceId: nextVoice,
    });

    let introAudio = prev.introAudio || { status: "missing", approved: false };
    const prevHash = String(introAudio?.contentHash || "");
    const fieldsChanged =
      (prevHash && hash !== prevHash) ||
      String(resolveIvrEventName(prev)) !== nextEventName ||
      String(resolveIvrEventNamePronunciation(prev)) !== nextPronunciation ||
      String(prev.voiceId || "") !== nextVoice;

    if (introAudio?.status === "ready" && fieldsChanged && nextMode === "ai") {
      introAudio = {
        ...introAudio,
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
      voiceId: nextVoice,
      introAudio,
      updatedAt: new Date(),
    };

    await user.save();

    return NextResponse.json({
      ok: true,
      ivrConfig: serializeIvrConfig(user.ivrConfig),
      needsRegenerate: introAudio?.status === "stale",
      needsApproval: Boolean(
        introAudio?.status === "ready" && !introAudio?.approved
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

/** Generate AI intro once and store permanently (no per-call TTS). */
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

    const targetId =
      auth.isAdmin && body.userId ? String(body.userId) : String(auth.user._id);

    const user =
      targetId === String(auth.user._id)
        ? auth.user
        : await User.findById(targetId);

    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (action === "ensure_system_prompts") {
      const prompts = await ensureAllIvrSystemPrompts(
        body.voiceId || user.ivrConfig?.voiceId
      );
      return NextResponse.json({ ok: true, prompts });
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
    const voiceId = String(body.voiceId || cfg.voiceId || "").trim();

    if (!eventName || !voiceId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const text = buildIvrIntroText({
      eventName,
      eventNamePronunciation,
    });

    const hash = contentHashForIvrIntro({
      eventName,
      eventNamePronunciation,
      voiceId,
    });

    // Reuse existing audio if hash matches and ready — never re-TTS on Play.
    if (
      cfg.introAudio?.status === "ready" &&
      cfg.introAudio?.contentHash === hash &&
      cfg.introAudio?.audioUrl &&
      !body.force
    ) {
      return NextResponse.json({
        ok: true,
        reused: true,
        introAudio: cfg.introAudio,
        text,
        previewText: text,
      });
    }

    const synth = await synthesizeElevenLabsSpeech({ text, voiceId });
    const publicToken = createIvrAudioPublicToken();
    const r2Key = ivrIntroR2Key(String(user._id), publicToken, "mp3");

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
      voiceId,
      introAudio: {
        status: "ready",
        source: "elevenlabs",
        publicToken,
        audioUrl,
        r2Key,
        contentType: synth.contentType,
        contentHash: hash,
        durationSeconds: null,
        generatedAt: new Date(),
        textSnapshot: text,
        approved: false,
        approvedAt: null,
      },
      updatedAt: new Date(),
    };

    await user.save();

    ensureAllIvrSystemPrompts(voiceId).catch((err) => {
      console.warn(
        "[ivr/config] system prompts warm failed",
        sanitizeElevenLabsErrorMessage(
          err instanceof Error ? err.message : "warm_failed"
        )
      );
    });

    return NextResponse.json({
      ok: true,
      reused: false,
      introAudio: user.ivrConfig.introAudio,
      text,
      previewText: text,
    });
  } catch (error) {
    const safe = sanitizeElevenLabsErrorMessage(
      error instanceof Error ? error.message : "FAILED"
    );
    console.error("[ivr/config POST]", safe);
    return NextResponse.json(
      {
        ok: false,
        error:
          safe === "ELEVENLABS_API_KEY_MISSING"
            ? "ELEVENLABS_API_KEY_MISSING"
            : safe.startsWith("ElevenLabs")
              ? "TTS_FAILED"
              : "FAILED",
      },
      { status: 500 }
    );
  }
}
