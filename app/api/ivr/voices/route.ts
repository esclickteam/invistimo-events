import { NextRequest, NextResponse } from "next/server";
import {
  getElevenLabsKeyMeta,
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

    const keyMeta = getElevenLabsKeyMeta();
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
      // Safe runtime diagnostics (no secret value).
      diagnostics: {
        keyPresent: keyMeta.present,
        keyLength: keyMeta.length,
        keyPrefix: keyMeta.prefix,
        keySourceEnv: keyMeta.sourceEnv,
        authHeader: "xi-api-key",
      },
    });
  } catch (error) {
    const payload = voiceErrorToClientPayload(error);
    // Never log secrets — only codes + lengths + provider reason.
    console.error("[ivr/voices]", {
      error: payload.error,
      providerStatus: payload.providerStatus,
      providerStatusCode: payload.providerStatusCode,
      providerDetail: payload.providerDetail,
      keyPresent: payload.keyMeta.present,
      keyLength: payload.keyMeta.length,
      keyPrefix: payload.keyMeta.prefix,
      keySourceEnv: payload.keyMeta.sourceEnv,
      hasWhitespace: payload.keyMeta.hasWhitespace,
      looksQuoted: payload.keyMeta.looksQuoted,
      authHeader: payload.authHeader,
    });
    return NextResponse.json(
      {
        ok: false,
        error: payload.error,
        message: payload.message,
        providerStatus: payload.providerStatus,
        providerDetail: payload.providerDetail,
        providerStatusCode: payload.providerStatusCode,
        diagnostics: {
          keyPresent: payload.keyMeta.present,
          keyLength: payload.keyMeta.length,
          keyPrefix: payload.keyMeta.prefix,
          keySourceEnv: payload.keyMeta.sourceEnv,
          hasWhitespace: payload.keyMeta.hasWhitespace,
          looksQuoted: payload.keyMeta.looksQuoted,
          authHeader: payload.authHeader,
        },
      },
      { status: 500 }
    );
  }
}
