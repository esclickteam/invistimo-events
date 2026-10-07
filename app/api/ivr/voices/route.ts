import { NextRequest, NextResponse } from "next/server";
import { listElevenLabsVoices } from "@/lib/calls/elevenlabs";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId).select("role includeCalls callsType").lean();
    const role = String(user?.role || "");
    const isAdmin = role === "admin";
    const isIvrClient =
      Boolean(user?.includeCalls) &&
      String(user?.callsType || "") === "ivr";

    if (!isAdmin && !isIvrClient) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const voices = await listElevenLabsVoices();

    return NextResponse.json({
      ok: true,
      voices: voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        previewUrl: v.preview_url || null,
        labels: v.labels || {},
      })),
    });
  } catch (error) {
    console.error("[ivr/voices]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "VOICES_FAILED",
      },
      { status: 500 }
    );
  }
}
