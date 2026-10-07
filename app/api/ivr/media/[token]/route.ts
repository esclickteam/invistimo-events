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

    const user = await User.findOne({
      "ivrConfig.introAudio.publicToken": token,
    })
      .select("ivrConfig.introAudio")
      .lean();

    let r2Key = String(user?.ivrConfig?.introAudio?.r2Key || "");
    let contentType =
      String(user?.ivrConfig?.introAudio?.contentType || "") || "audio/mpeg";

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

    return new NextResponse(new Uint8Array(object.buffer), {
      status: 200,
      headers: {
        "Content-Type": object.contentType || contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(object.buffer.length),
      },
    });
  } catch (error) {
    console.error("[ivr/media] failed", error);
    return NextResponse.json({ error: "MEDIA_FAILED" }, { status: 500 });
  }
}
