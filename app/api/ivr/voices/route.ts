import { NextRequest, NextResponse } from "next/server";
import {
  listElevenLabsVoices,
  voiceErrorToClientPayload,
} from "@/lib/calls/elevenlabs";
import { requireIvrSession } from "@/lib/calls/ivrRequestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // getUserIdFromRequest returns AuthPayload — use auth.userId only.
    const session = await requireIvrSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      );
    }

    const voices = await listElevenLabsVoices();

    return NextResponse.json({
      ok: true,
      voices: voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        previewUrl: v.preview_url || null,
        labels: v.labels || {},
        category: v.category || null,
      })),
    });
  } catch (error) {
    const payload = voiceErrorToClientPayload(error);
    // Never log secrets — only code + provider HTTP status.
    console.error("[ivr/voices]", {
      error: payload.error,
      providerStatus: payload.providerStatus,
    });
    return NextResponse.json(
      {
        ok: false,
        error: payload.error,
        message: payload.message,
        providerStatus: payload.providerStatus,
      },
      { status: 500 }
    );
  }
}
