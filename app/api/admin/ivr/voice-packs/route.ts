import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { resolveAuthUserId } from "@/lib/calls/ivrRequestAuth";
import User from "@/models/User";
import {
  approveAdminVoicePack,
  buildMaleVoiceAuditions,
  generateAdminVoicePack,
  invalidateWrongVoicePacks,
  IVR_PACK_SEGMENT_LABELS,
  lockFemaleVoiceToDana,
  lockMaleVoiceFromAudition,
  regenerateAdminPackSegment,
  serializeAdminVoicePacks,
  updateAdminPackVoiceId,
} from "@/lib/calls/ivrAdminVoicePacks";
import {
  IVR_GLOBAL_PACK_TEXTS,
  type IvrGlobalPackSegmentKey,
} from "@/lib/calls/ivrScript";
import {
  IVR_MALE_AUDITION_TEXT,
  IVR_REQUIRED_FEMALE_VOICE_NAME,
  listElevenLabsVoices,
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

function emptySegmentList() {
  return (
    Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
  ).map((key) => ({
    key,
    label: IVR_PACK_SEGMENT_LABELS[key],
    text: IVR_GLOBAL_PACK_TEXTS[key],
    audioUrl: "",
    ready: false,
    reused: false,
    contentHash: "",
  }));
}

function emptyBootstrap() {
  const segments = emptySegmentList();
  return {
    packs: [
      {
        gender: "female" as const,
        label: "קול נשי",
        voiceId: "",
        adminNote: "",
        segmentsReady: false,
        approved: false,
        approvedAt: null,
        lastGeneratedAt: null,
        readyCount: 0,
        totalCount: segments.length,
        segments,
      },
      {
        gender: "male" as const,
        label: "קול גברי",
        voiceId: "",
        adminNote: "",
        segmentsReady: false,
        approved: false,
        approvedAt: null,
        lastGeneratedAt: null,
        readyCount: 0,
        totalCount: segments.length,
        segments,
      },
    ],
    bothApproved: false,
  };
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

    try {
      const data = await serializeAdminVoicePacks();
      return NextResponse.json({
        ok: true,
        ...data,
        requiredFemaleName: IVR_REQUIRED_FEMALE_VOICE_NAME,
        maleAuditionText: IVR_MALE_AUDITION_TEXT,
      });
    } catch (inner) {
      console.error(
        "[admin/ivr/voice-packs GET] serialize failed — returning bootstrap",
        inner instanceof Error ? inner.message : inner
      );
      return NextResponse.json({
        ok: true,
        ...emptyBootstrap(),
        warning: "BOOTSTRAP_DEFAULTS",
        detail: inner instanceof Error ? inner.message : "serialize_failed",
        requiredFemaleName: IVR_REQUIRED_FEMALE_VOICE_NAME,
        maleAuditionText: IVR_MALE_AUDITION_TEXT,
      });
    }
  } catch (error) {
    console.error("[admin/ivr/voice-packs GET]", error);
    return NextResponse.json({
      ok: true,
      ...emptyBootstrap(),
      warning: "BOOTSTRAP_DEFAULTS",
      detail: error instanceof Error ? error.message : "FAILED",
      requiredFemaleName: IVR_REQUIRED_FEMALE_VOICE_NAME,
      maleAuditionText: IVR_MALE_AUDITION_TEXT,
    });
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

    if (action === "invalidate_wrong_packs") {
      const data = await invalidateWrongVoicePacks();
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === "lock_female_dana") {
      const data = await lockFemaleVoiceToDana();
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === "lock_male_from_audition") {
      const data = await lockMaleVoiceFromAudition(body.voiceId);
      return NextResponse.json({ ok: true, ...data });
    }

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
    console.error(
      "[admin/ivr/voice-packs PATCH]",
      sanitizeElevenLabsErrorMessage(message)
    );
    return NextResponse.json(
      {
        ok: false,
        error: message,
        message: sanitizeElevenLabsErrorMessage(message),
      },
      { status: 400 }
    );
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

    if (action === "male_audition") {
      const data = await buildMaleVoiceAuditions({
        modelId: body.modelId ? String(body.modelId) : undefined,
      });
      return NextResponse.json({ ok: true, ...data });
    }

    // Admin diagnostic: list account voices (name + id) to locate Dana / Hebrew candidates.
    if (action === "list_account_voices") {
      const voices = await listElevenLabsVoices();
      const q = String(body.query || "").trim().toLowerCase();
      const mapped = voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        category: v.category || null,
        labels: v.labels || {},
      }));
      const filtered = q
        ? mapped.filter(
            (v) =>
              v.name.toLowerCase().includes(q) ||
              v.voiceId.toLowerCase().includes(q) ||
              Object.values(v.labels || {}).some((x) =>
                String(x).toLowerCase().includes(q)
              )
          )
        : mapped;
      const danaExact = mapped.filter(
        (v) => v.name.trim().toLowerCase() === "dana"
      );
      const danaLike = mapped.filter((v) =>
        /dana|דנה/i.test(v.name)
      );
      return NextResponse.json({
        ok: true,
        total: mapped.length,
        returned: filtered.length,
        danaExact,
        danaLike,
        voices: filtered.slice(0, 200),
      });
    }

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
      raw: error instanceof Error ? error.message : String(error),
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
