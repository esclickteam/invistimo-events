import { NextRequest, NextResponse } from "next/server";
import {
  getElevenLabsKeyMeta,
  getIvrFemaleVoiceId,
  getIvrMaleVoiceId,
  listIvrSystemVoiceOptions,
} from "@/lib/calls/elevenlabs";
import { requireIvrSession } from "@/lib/calls/ivrRequestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns only the two Invistimo system voices (female / male).
 * Never exposes the full ElevenLabs catalog to clients.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireIvrSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      );
    }

    const keyMeta = getElevenLabsKeyMeta();
    const voices = listIvrSystemVoiceOptions();

    if (voices.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "SYSTEM_VOICES_NOT_CONFIGURED",
          message:
            "לא הוגדרו קולות מערכת (IVR_FEMALE_VOICE_ID / IVR_MALE_VOICE_ID)",
          voices: [],
          diagnostics: {
            keyPresent: keyMeta.present,
            femaleConfigured: Boolean(getIvrFemaleVoiceId()),
            maleConfigured: Boolean(getIvrMaleVoiceId()),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      voices: voices.map((v) => ({
        gender: v.gender,
        label: v.label,
        voiceId: v.voiceId,
        /** Keep voiceId for backward-compatible clients; UI should bind on gender. */
        name: v.label,
      })),
      diagnostics: {
        keyPresent: keyMeta.present,
        keyLength: keyMeta.length,
        keyPrefix: keyMeta.prefix,
        keySourceEnv: keyMeta.sourceEnv,
        femaleConfigured: Boolean(getIvrFemaleVoiceId()),
        maleConfigured: Boolean(getIvrMaleVoiceId()),
        authHeader: "xi-api-key",
      },
    });
  } catch (error) {
    console.error("[ivr/voices]", {
      message: error instanceof Error ? error.message : "FAILED",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "VOICES_FAILED",
        message: error instanceof Error ? error.message : "FAILED",
        voices: [],
      },
      { status: 500 }
    );
  }
}
