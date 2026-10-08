import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";
import IvrSystemAudio from "@/models/IvrSystemAudio";
import { getIvrAudioObjectFromR2 } from "@/lib/calls/ivrAudioStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { token?: string } | Promise<{ token?: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const params = await Promise.resolve(context.params);
    const token = String(params?.token || "").trim();

    if (!token || token.length < 16) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await db();

    // Seamless composed intro (before + eventName + after)
    const byComposed = await User.findOne({
      "ivrConfig.composedIntroAudio.publicToken": token,
    })
      .select("ivrConfig.composedIntroAudio")
      .lean();

    let r2Key = String(byComposed?.ivrConfig?.composedIntroAudio?.r2Key || "");
    let contentType =
      String(byComposed?.ivrConfig?.composedIntroAudio?.contentType || "") ||
      "audio/mpeg";

    // Per-event spoken name clip
    if (!r2Key) {
      const byEventName = await User.findOne({
        "ivrConfig.eventNameAudio.publicToken": token,
      })
        .select("ivrConfig.eventNameAudio")
        .lean();

      r2Key = String(byEventName?.ivrConfig?.eventNameAudio?.r2Key || "");
      contentType =
        String(byEventName?.ivrConfig?.eventNameAudio?.contentType || "") ||
        contentType;
    }

    // Self-recorded / legacy full intro
    if (!r2Key) {
      const byIntro = await User.findOne({
        "ivrConfig.introAudio.publicToken": token,
      })
        .select("ivrConfig.introAudio")
        .lean();

      r2Key = String(byIntro?.ivrConfig?.introAudio?.r2Key || "");
      contentType =
        String(byIntro?.ivrConfig?.introAudio?.contentType || "") ||
        contentType;
    }

    // Global voice-pack / system prompts / admin audition clips
    if (!r2Key) {
      const system = await IvrSystemAudio.findOne({ publicToken: token })
        .select("r2Key contentType")
        .lean();

      if (!system?.r2Key) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }

      r2Key = String(system.r2Key);
      contentType = String(system.contentType || contentType);
    }

    const object = await getIvrAudioObjectFromR2(r2Key);
    if (!object.buffer?.length) {
      return NextResponse.json({ error: "EMPTY_AUDIO" }, { status: 404 });
    }

    const resolvedType = object.contentType || contentType || "audio/mpeg";
    const bytes = object.buffer;
    const total = bytes.length;
    const range = _req.headers.get("range");

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : total - 1;
        if (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          start >= 0 &&
          end >= start &&
          end < total
        ) {
          const slice = bytes.subarray(start, end + 1);
          return new NextResponse(new Uint8Array(slice), {
            status: 206,
            headers: {
              "Content-Type": resolvedType,
              "Content-Length": String(slice.length),
              "Content-Range": `bytes ${start}-${end}/${total}`,
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": resolvedType,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("[ivr/media] failed", error);
    return NextResponse.json({ error: "MEDIA_FAILED" }, { status: 500 });
  }
}
