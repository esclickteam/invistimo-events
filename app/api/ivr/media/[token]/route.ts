import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";
import IvrSystemAudio from "@/models/IvrSystemAudio";
import {
  getIvrAudioObjectFromR2,
  looksLikePlayableAudioBuffer,
  resolvePlayableAudioContentType,
} from "@/lib/calls/ivrAudioStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { token?: string } | Promise<{ token?: string }>;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Ivr-Media-Error",
};

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
        "X-Ivr-Media-Error": error,
      },
    }
  );
}

function audioHeaders(input: {
  contentType: string;
  contentLength: number;
  status?: number;
  contentRange?: string;
}) {
  return {
    ...CORS_HEADERS,
    "Content-Type": input.contentType,
    "Content-Length": String(input.contentLength),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    ...(input.contentRange ? { "Content-Range": input.contentRange } : {}),
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function resolveR2KeyForToken(token: string): Promise<{
  r2Key: string;
  contentType: string;
  source: string;
  error?: string;
}> {
  // Seamless composed intro (before + eventName + after)
  const byComposed = await User.findOne({
    "ivrConfig.composedIntroAudio.publicToken": token,
  })
    .select("ivrConfig.composedIntroAudio")
    .lean();

  if (byComposed?.ivrConfig?.composedIntroAudio) {
    const r2Key = String(byComposed.ivrConfig.composedIntroAudio.r2Key || "");
    const contentType =
      String(byComposed.ivrConfig.composedIntroAudio.contentType || "") ||
      "audio/mpeg";
    if (!r2Key) {
      return {
        r2Key: "",
        contentType,
        source: "composedIntroAudio",
        error: "COMPOSED_R2_KEY_MISSING",
      };
    }
    return { r2Key, contentType, source: "composedIntroAudio" };
  }

  // Locked approval token (may match composed; kept for Telnyx dial URLs).
  const byApproval = await User.findOne({
    "ivrConfig.recordingApproval.audioPublicToken": token,
  })
    .select(
      "ivrConfig.recordingApproval ivrConfig.composedIntroAudio ivrConfig.introAudio"
    )
    .lean();
  if (byApproval?.ivrConfig?.recordingApproval?.audioPublicToken === token) {
    const mode = String(byApproval.ivrConfig.recordingApproval.audioMode || "");
    const composedKey = String(
      byApproval.ivrConfig.composedIntroAudio?.r2Key || ""
    );
    const introKey = String(byApproval.ivrConfig.introAudio?.r2Key || "");
    const r2Key =
      mode === "self_recorded" ? introKey || composedKey : composedKey || introKey;
    if (!r2Key) {
      return {
        r2Key: "",
        contentType: "audio/mpeg",
        source: "recordingApproval",
        error: "APPROVAL_R2_KEY_MISSING",
      };
    }
    return {
      r2Key,
      contentType:
        String(
          byApproval.ivrConfig.composedIntroAudio?.contentType ||
            byApproval.ivrConfig.introAudio?.contentType ||
            ""
        ) || "audio/mpeg",
      source: "recordingApproval",
    };
  }

  const byInbound = await User.findOne({
    "ivrConfig.composedInboundAudio.publicToken": token,
  })
    .select("ivrConfig.composedInboundAudio")
    .lean();
  if (byInbound?.ivrConfig?.composedInboundAudio?.r2Key) {
    return {
      r2Key: String(byInbound.ivrConfig.composedInboundAudio.r2Key),
      contentType:
        String(byInbound.ivrConfig.composedInboundAudio.contentType || "") ||
        "audio/mpeg",
      source: "composedInboundAudio",
    };
  }

  const byEventName = await User.findOne({
    "ivrConfig.eventNameAudio.publicToken": token,
  })
    .select("ivrConfig.eventNameAudio")
    .lean();
  if (byEventName?.ivrConfig?.eventNameAudio?.r2Key) {
    return {
      r2Key: String(byEventName.ivrConfig.eventNameAudio.r2Key),
      contentType:
        String(byEventName.ivrConfig.eventNameAudio.contentType || "") ||
        "audio/mpeg",
      source: "eventNameAudio",
    };
  }

  const byIntro = await User.findOne({
    "ivrConfig.introAudio.publicToken": token,
  })
    .select("ivrConfig.introAudio")
    .lean();
  if (byIntro?.ivrConfig?.introAudio?.r2Key) {
    return {
      r2Key: String(byIntro.ivrConfig.introAudio.r2Key),
      contentType:
        String(byIntro.ivrConfig.introAudio.contentType || "") || "audio/mpeg",
      source: "introAudio",
    };
  }

  const system = await IvrSystemAudio.findOne({ publicToken: token })
    .select("r2Key contentType")
    .lean();
  if (system?.r2Key) {
    return {
      r2Key: String(system.r2Key),
      contentType: String(system.contentType || "audio/mpeg"),
      source: "system",
    };
  }

  return { r2Key: "", contentType: "", source: "", error: "NOT_FOUND" };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const params = await Promise.resolve(context.params);
    const token = String(params?.token || "").trim();

    if (!token || token.length < 16) {
      return jsonError("NOT_FOUND", 404);
    }

    await db();

    const resolved = await resolveR2KeyForToken(token);
    if (!resolved.r2Key) {
      return jsonError(resolved.error || "NOT_FOUND", 404);
    }

    let object: Awaited<ReturnType<typeof getIvrAudioObjectFromR2>>;
    try {
      object = await getIvrAudioObjectFromR2(resolved.r2Key);
    } catch (err: any) {
      const code = String(err?.name || err?.Code || err?.$metadata?.httpStatusCode || "");
      console.error("[ivr/media] R2 get failed", {
        token: token.slice(0, 8),
        r2Key: resolved.r2Key,
        source: resolved.source,
        code,
      });
      if (
        code === "NoSuchKey" ||
        code === "NotFound" ||
        code === "404" ||
        /NoSuchKey|NotFound/i.test(String(err?.message || ""))
      ) {
        return jsonError("STORAGE_OBJECT_MISSING", 404);
      }
      return jsonError("STORAGE_READ_FAILED", 500);
    }

    if (!object.buffer?.length) {
      return jsonError("EMPTY_AUDIO", 404);
    }

    if (!looksLikePlayableAudioBuffer(object.buffer, object.contentType || resolved.contentType)) {
      console.error("[ivr/media] invalid audio payload", {
        token: token.slice(0, 8),
        r2Key: resolved.r2Key,
        source: resolved.source,
        contentType: object.contentType || resolved.contentType,
        bytes: object.buffer.length,
      });
      return jsonError("INVALID_AUDIO", 404);
    }

    const resolvedType = resolvePlayableAudioContentType(
      object.buffer,
      object.contentType || resolved.contentType
    );
    const bytes = object.buffer;
    const total = bytes.length;
    const range = _req.headers.get("range");

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : total - 1;
        if (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          start >= 0 &&
          end >= start &&
          end < total
        ) {
          const slice = bytes.subarray(start, end + 1);
          return new NextResponse(new Uint8Array(slice), {
            status: 206,
            headers: audioHeaders({
              contentType: resolvedType,
              contentLength: slice.length,
              contentRange: `bytes ${start}-${end}/${total}`,
            }),
          });
        }
      }
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: audioHeaders({
        contentType: resolvedType,
        contentLength: total,
      }),
    });
  } catch (error) {
    console.error("[ivr/media] failed", error);
    return jsonError("MEDIA_FAILED", 500);
  }
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const res = await GET(req, context);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
