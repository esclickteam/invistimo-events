import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  getUserIdFromRequest,
} from "@/lib/getUserIdFromRequest";
import { resolveAuthUserId } from "@/lib/calls/ivrRequestAuth";
import User from "@/models/User";
import {
  approveAdminVoicePack,
  generateAdminVoicePack,
  regenerateAdminPackSegment,
  serializeAdminVoicePacks,
  updateAdminPackVoiceId,
} from "@/lib/calls/ivrAdminVoicePacks";
import {
  sanitizeElevenLabsErrorMessage,
  voiceErrorToClientPayload,
} from "@/lib/calls/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  const userId = resolveAuthUserId(auth);
  if (!userId) {
    return { error: "UNAUTHORIZED" as const, status: 401 as const };
  }
  await connectDB();
  const user = await User.findById(userId).select("_id role name email").lean();
  if (!user || String((user as any).role) !== "admin") {
    return { error: "FORBIDDEN" as const, status: 403 as const };
  }
  return { user, userId };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const data = await serializeAdminVoicePacks();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("[admin/ivr/voice-packs GET]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "set_voice_id").trim();

    if (action === "set_voice_id") {
      const data = await updateAdminPackVoiceId({
        gender: body.gender,
        voiceId: body.voiceId,
        adminNote: body.adminNote,
      });
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === "approve") {
      const data = await approveAdminVoicePack({ gender: body.gender });
      return NextResponse.json({ ok: true, ...data });
    }

    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ACTION" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED";
    console.error("[admin/ivr/voice-packs PATCH]", sanitizeElevenLabsErrorMessage(message));
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "generate_pack").trim();

    if (action === "generate_pack") {
      const data = await generateAdminVoicePack({
        gender: body.gender,
        force: Boolean(body.force),
      });
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === "regenerate_segment") {
      const data = await regenerateAdminPackSegment({
        gender: body.gender,
        segment: body.segment,
      });
      return NextResponse.json({ ok: true, ...data });
    }

    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ACTION" },
      { status: 400 }
    );
  } catch (error) {
    const payload = voiceErrorToClientPayload(error);
    console.error("[admin/ivr/voice-packs POST]", {
      error: payload.error,
      providerStatus: payload.providerStatus,
      providerDetail: payload.providerDetail,
    });
    return NextResponse.json(
      {
        ok: false,
        error: payload.error,
        message: payload.message,
        providerStatus: payload.providerStatus,
        providerDetail: payload.providerDetail,
        providerStatusCode: payload.providerStatusCode,
      },
      {
        status:
          payload.providerStatus === 402 ||
          payload.error === "ELEVENLABS_LIBRARY_VOICE_REQUIRES_PAID" ||
          payload.error === "ELEVENLABS_INSUFFICIENT_CREDITS"
            ? 402
            : 500,
      }
    );
  }
}
