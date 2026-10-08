import { NextRequest, NextResponse } from "next/server";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { requireIvrSession } from "@/lib/calls/ivrRequestAuth";
import {
  IVR_SELF_RECORD_MAX_SECONDS,
} from "@/lib/calls/ivrScript";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  ivrIntroR2Key,
  uploadIvrAudioToR2,
} from "@/lib/calls/ivrAudioStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireIvrSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      );
    }

    const user = session.user;
    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") || form.get("audio");
    const durationSeconds = Number(form.get("durationSeconds") || 0);

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });
    }

    if (
      Number.isFinite(durationSeconds) &&
      durationSeconds > IVR_SELF_RECORD_MAX_SECONDS
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "DURATION_TOO_LONG",
          maxSeconds: IVR_SELF_RECORD_MAX_SECONDS,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return NextResponse.json({ ok: false, error: "EMPTY_FILE" }, { status: 400 });
    }

    // Soft size guard ~3MB for 45s audio
    if (buffer.length > 3.5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    const contentType = file.type || "audio/webm";
    const ext = contentType.includes("mpeg") || contentType.includes("mp3")
      ? "mp3"
      : contentType.includes("wav")
        ? "wav"
        : contentType.includes("ogg")
          ? "ogg"
          : "webm";

    const publicToken = createIvrAudioPublicToken();
    const r2Key = ivrIntroR2Key(String(user._id), publicToken, ext);

    await uploadIvrAudioToR2({
      key: r2Key,
      buffer,
      contentType,
    });

    const audioUrl = buildIvrPublicAudioUrl(publicToken);
    const cfg = user.ivrConfig || {};

    user.ivrConfig = {
      ...(cfg as any),
      audioMode: "self_recorded",
      introAudio: {
        status: "ready",
        source: contentType.includes("webm") || form.get("source") === "recording"
          ? "recording"
          : "upload",
        publicToken,
        audioUrl,
        r2Key,
        contentType,
        contentHash: `self:${publicToken}`,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        generatedAt: new Date(),
        textSnapshot: "",
        approved: false,
        approvedAt: null,
      },
      updatedAt: new Date(),
    };

    await user.save();

    return NextResponse.json({
      ok: true,
      introAudio: user.ivrConfig.introAudio,
      maxSeconds: IVR_SELF_RECORD_MAX_SECONDS,
    });
  } catch (error) {
    console.error("[ivr/audio/upload]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}
