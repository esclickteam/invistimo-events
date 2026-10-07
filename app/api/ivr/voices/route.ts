import { NextRequest, NextResponse } from "next/server";
import {
  listElevenLabsVoices,
  sanitizeElevenLabsErrorMessage,
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
      })),
    });
  } catch (error) {
    const safe = sanitizeElevenLabsErrorMessage(
      error instanceof Error ? error.message : "VOICES_FAILED"
    );
    console.error("[ivr/voices]", safe);
    return NextResponse.json(
      {
        ok: false,
        error:
          safe === "ELEVENLABS_API_KEY_MISSING"
            ? "ELEVENLABS_API_KEY_MISSING"
            : "VOICES_FAILED",
        message:
          safe === "ELEVENLABS_API_KEY_MISSING"
            ? "מפתח ElevenLabs חסר בשרת"
            : "טעינת רשימת הקולות נכשלה",
      },
      { status: 500 }
    );
  }
}
