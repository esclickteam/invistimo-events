import { NextRequest, NextResponse } from "next/server";
import { getElevenLabsKeyMeta } from "@/lib/calls/elevenlabs";
import { getIvrSystemVoiceChoices } from "@/lib/calls/ivrSystemVoices";
import { requireIvrSession } from "@/lib/calls/ivrRequestAuth";
import { voiceErrorToClientPayload } from "@/lib/calls/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns ONLY the two Invistimo system voices for the client UI:
 * - דנה – קול נשי
 * - {Name} – קול גברי  (or "קול גברי" before name is known)
 *
 * Never returns the full ElevenLabs catalog. Server may call ElevenLabs
 * behind the scenes once to resolve/persist Dana + best Hebrew male.
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
    const force =
      new URL(req.url).searchParams.get("resolve") === "1" ||
      new URL(req.url).searchParams.get("force") === "1";

    const result = await getIvrSystemVoiceChoices({ forceResolve: force || true });

    if (result.voices.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "SYSTEM_VOICES_NOT_CONFIGURED",
          message:
            "לא הצלחנו לזהות את קול דנה / הקול הגברי. ודאו ש-ELEVENLABS_API_KEY תקין או הגדירו IVR_FEMALE_VOICE_ID / IVR_MALE_VOICE_ID.",
          voices: [],
          diagnostics: {
            keyPresent: keyMeta.present,
            keyLength: keyMeta.length,
            keyPrefix: keyMeta.prefix,
            ...result.diagnostics,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      /** Fixed two-option list only — not an ElevenLabs catalog. */
      systemVoicesOnly: true,
      voices: result.voices.map((v) => ({
        gender: v.gender,
        label: v.label,
        name: v.name,
        voiceId: v.voiceId,
      })),
      diagnostics: {
        keyPresent: keyMeta.present,
        keyLength: keyMeta.length,
        keyPrefix: keyMeta.prefix,
        keySourceEnv: keyMeta.sourceEnv,
        resolved: result.resolved,
        ...result.diagnostics,
        authHeader: "xi-api-key",
      },
    });
  } catch (error) {
    const payload = voiceErrorToClientPayload(error);
    console.error("[ivr/voices]", {
      error: payload.error,
      providerStatus: payload.providerStatus,
      providerStatusCode: payload.providerStatusCode,
      providerDetail: payload.providerDetail,
      keyPresent: payload.keyMeta.present,
    });
    return NextResponse.json(
      {
        ok: false,
        error: payload.error,
        message: payload.message,
        providerStatus: payload.providerStatus,
        providerDetail: payload.providerDetail,
        providerStatusCode: payload.providerStatusCode,
        voices: [],
        systemVoicesOnly: true,
      },
      { status: 500 }
    );
  }
}
