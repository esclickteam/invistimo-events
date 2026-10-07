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
} from "@/lib/calls/ivrScript";
import { synthesizeElevenLabsSpeech } from "@/lib/calls/elevenlabs";
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

    const cfg = user.ivrConfig || {};
    const vars = {
      eventTypeLabel: String(cfg.eventTypeLabel || ""),
      hostsNames: String(cfg.hostsNames || ""),
    };

    return NextResponse.json({
      ok: true,
      callsType: user.callsType || "human",
      includeCalls: Boolean(user.includeCalls),
      ivrConfig: {
        audioMode: cfg.audioMode || null,
        eventTypeLabel: vars.eventTypeLabel,
        hostsNames: vars.hostsNames,
        hostsNamesPronunciation: String(cfg.hostsNamesPronunciation || ""),
        voiceId: String(cfg.voiceId || ""),
        introAudio: cfg.introAudio || { status: "missing" },
        recommendedScript: buildIvrRecommendedScriptForDisplay(vars),
        selfRecordMaxSeconds: IVR_SELF_RECORD_MAX_SECONDS,
        selfRecordRecommendedSeconds: IVR_SELF_RECORD_RECOMMENDED_SECONDS,
      },
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
    const nextEventType = body.eventTypeLabel ?? prev.eventTypeLabel ?? "";
    const nextHosts = body.hostsNames ?? prev.hostsNames ?? "";
    const nextPronunciation =
      body.hostsNamesPronunciation ?? prev.hostsNamesPronunciation ?? "";
    const nextVoice = body.voiceId ?? prev.voiceId ?? "";
    const nextMode = body.audioMode ?? prev.audioMode ?? null;

    const hash = contentHashForIvrIntro({
      eventTypeLabel: String(nextEventType),
      hostsNames: String(nextHosts),
      hostsNamesPronunciation: String(nextPronunciation),
      voiceId: String(nextVoice),
    });

    let introAudio = prev.introAudio || { status: "missing" };
    const prevHash = String(introAudio?.contentHash || "");

    if (
      introAudio?.status === "ready" &&
      prevHash &&
      hash !== prevHash &&
      nextMode === "ai"
    ) {
      introAudio = {
        ...introAudio,
        status: "stale",
      };
    }

    user.ivrConfig = {
      ...(prev as any),
      audioMode: nextMode,
      eventTypeLabel: String(nextEventType || "").trim(),
      hostsNames: String(nextHosts || "").trim(),
      hostsNamesPronunciation: String(nextPronunciation || "").trim(),
      voiceId: String(nextVoice || "").trim(),
      introAudio,
      updatedAt: new Date(),
    };

    await user.save();

    return NextResponse.json({
      ok: true,
      ivrConfig: user.ivrConfig,
      recommendedScript: buildIvrRecommendedScriptForDisplay({
        eventTypeLabel: String(nextEventType),
        hostsNames: String(nextHosts),
      }),
      needsRegenerate: introAudio?.status === "stale",
    });
  } catch (error) {
    console.error("[ivr/config PATCH]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
    );
  }
}

/** Generate AI intro once and store permanently. */
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
    const eventTypeLabel = String(body.eventTypeLabel || cfg.eventTypeLabel || "").trim();
    const hostsNames = String(body.hostsNames || cfg.hostsNames || "").trim();
    const hostsNamesPronunciation = String(
      body.hostsNamesPronunciation || cfg.hostsNamesPronunciation || ""
    ).trim();
    const voiceId = String(body.voiceId || cfg.voiceId || "").trim();

    if (!eventTypeLabel || !hostsNames || !voiceId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const text = buildIvrIntroText({
      eventTypeLabel,
      hostsNames,
      hostsNamesPronunciation,
    });

    const hash = contentHashForIvrIntro({
      eventTypeLabel,
      hostsNames,
      hostsNamesPronunciation,
      voiceId,
    });

    // Reuse existing audio if hash matches and ready.
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
      eventTypeLabel,
      hostsNames,
      hostsNamesPronunciation,
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
      },
      updatedAt: new Date(),
    };

    await user.save();

    // Best-effort: warm system prompts with same voice.
    ensureAllIvrSystemPrompts(voiceId).catch((err) => {
      console.warn("[ivr/config] system prompts warm failed", err);
    });

    return NextResponse.json({
      ok: true,
      reused: false,
      introAudio: user.ivrConfig.introAudio,
      text,
    });
  } catch (error) {
    console.error("[ivr/config POST]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
    );
  }
}
