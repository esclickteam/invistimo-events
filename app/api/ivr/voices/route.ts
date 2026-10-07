import { NextRequest, NextResponse } from "next/server";
import { getElevenLabsKeyMeta } from "@/lib/calls/elevenlabs";
import { getIvrSystemVoiceChoices } from "@/lib/calls/ivrSystemVoices";
import { requireIvrSession } from "@/lib/calls/ivrRequestAuth";
import { voiceErrorToClientPayload } from "@/lib/calls/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns ONLY the two Invistimo system gender choices for the client UI:
 * - קול נשי
 * - קול גברי
 *
 * Never returns ElevenLabs catalog names or voiceIds to clients.
 * Clients should prefer gender radios from /api/ivr/config (packsReady).
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
    const result = await getIvrSystemVoiceChoices();

    return NextResponse.json({
      ok: true,
      /** Fixed two-option list only — not an ElevenLabs catalog. */
      systemVoicesOnly: true,
      packsReady: result.packsReady,
      voices: result.voices.map((v) => ({
        gender: v.gender,
        label: v.label,
      })),
      diagnostics: {
        keyPresent: keyMeta.present,
        keyLength: keyMeta.length,
        keyPrefix: keyMeta.prefix,
        keySourceEnv: keyMeta.sourceEnv,
        resolved: result.resolved,
        ...result.diagnostics,
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
        voices: [
          { gender: "female", label: "קול נשי" },
          { gender: "male", label: "קול גברי" },
        ],
        systemVoicesOnly: true,
        packsReady: false,
      },
      { status: 500 }
    );
  }
}
