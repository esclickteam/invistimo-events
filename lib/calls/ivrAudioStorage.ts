/**
 * Store IVR audio in R2 and expose via public tokenized media URLs for Telnyx playback.
 */

import { randomBytes } from "crypto";
import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

const AUDIO_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
]);

export function createIvrAudioPublicToken() {
  return randomBytes(24).toString("hex");
}

export function getAppBaseUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";

  if (String(explicit || "").trim()) {
    return String(explicit).replace(/\/$/, "");
  }

  // Prefer stable production host over ephemeral *.vercel.app deploy URLs.
  // Stored audioUrl must remain playable after redeploys.
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  if (vercelEnv === "production" || appEnv === "production") {
    return "https://www.invistimo.com";
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "";
}

export function buildIvrPublicAudioUrl(publicToken: string, baseUrl?: string) {
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, "");
  if (!base || !publicToken) return "";
  return `${base}/api/ivr/media/${encodeURIComponent(publicToken)}`;
}

/** Always rebuild from token + current base — never trust stale *.vercel.app URLs. */
export function resolveIvrPublicAudioUrl(input: {
  publicToken?: string | null;
  storedUrl?: string | null;
  baseUrl?: string;
}) {
  const token = String(input.publicToken || "").trim();
  if (token) {
    return buildIvrPublicAudioUrl(token, input.baseUrl);
  }
  return String(input.storedUrl || "").trim();
}

export function isPlayableAudioContentType(contentType: string | null | undefined) {
  const raw = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!raw) return false;
  if (AUDIO_CONTENT_TYPES.has(raw)) return true;
  return raw.startsWith("audio/");
}

export async function uploadIvrAudioToR2(input: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  if (!input.buffer?.length) {
    throw new Error("IVR_AUDIO_EMPTY_BUFFER");
  }

  const contentType = input.contentType || "audio/mpeg";
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: input.key,
      Body: input.buffer,
      ContentType: contentType,
    })
  );

  // Verify the object is actually in R2 before callers mark ready.
  const verified = await verifyIvrAudioInR2(input.key);
  if (!verified.ok) {
    throw new Error(
      `IVR_AUDIO_R2_VERIFY_FAILED:${verified.reason || "unknown"}`
    );
  }

  return {
    bucket: R2_BUCKET_NAME,
    key: input.key,
    contentType: verified.contentType || contentType,
    sizeBytes: verified.sizeBytes,
  };
}

export type IvrAudioR2Verification = {
  ok: boolean;
  reason?: string;
  sizeBytes: number;
  contentType: string;
};

/** HeadObject check — size > 0 and audio content-type. */
export async function verifyIvrAudioInR2(
  key: string
): Promise<IvrAudioR2Verification> {
  const r2Key = String(key || "").trim();
  if (!r2Key) {
    return { ok: false, reason: "MISSING_R2_KEY", sizeBytes: 0, contentType: "" };
  }

  try {
    const result = await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
      })
    );

    const sizeBytes = Number(result.ContentLength || 0);
    const contentType = String(result.ContentType || "").trim();

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return {
        ok: false,
        reason: "EMPTY_OBJECT",
        sizeBytes: 0,
        contentType,
      };
    }

    if (!isPlayableAudioContentType(contentType)) {
      // Some R2 uploads omit content-type — accept if size looks like audio (>200 bytes).
      if (sizeBytes < 200) {
        return {
          ok: false,
          reason: `BAD_CONTENT_TYPE:${contentType || "empty"}`,
          sizeBytes,
          contentType,
        };
      }
    }

    return {
      ok: true,
      sizeBytes,
      contentType: contentType || "audio/mpeg",
    };
  } catch (err: any) {
    const code = String(err?.name || err?.Code || err?.$metadata?.httpStatusCode || "");
    return {
      ok: false,
      reason: code ? `R2_${code}` : "R2_HEAD_FAILED",
      sizeBytes: 0,
      contentType: "",
    };
  }
}

/** Optional live HTTP check of the public media URL (admin verify). */
export async function verifyIvrPublicAudioHttp(
  audioUrl: string
): Promise<{
  ok: boolean;
  status: number | null;
  contentType: string;
  reason?: string;
}> {
  const url = String(audioUrl || "").trim();
  if (!url) {
    return { ok: false, status: null, contentType: "", reason: "MISSING_URL" };
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1023" },
      cache: "no-store",
      redirect: "follow",
    });

    const contentType = String(res.headers.get("content-type") || "");
    const status = res.status;

    // Drain/cancel body so we don't pull the whole file.
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }

    if (status !== 200 && status !== 206) {
      return {
        ok: false,
        status,
        contentType,
        reason: `HTTP_${status}`,
      };
    }

    if (!isPlayableAudioContentType(contentType)) {
      return {
        ok: false,
        status,
        contentType,
        reason: `BAD_CONTENT_TYPE:${contentType || "empty"}`,
      };
    }

    return { ok: true, status, contentType };
  } catch (err) {
    return {
      ok: false,
      status: null,
      contentType: "",
      reason: err instanceof Error ? err.message : "FETCH_FAILED",
    };
  }
}

export async function getIvrAudioObjectFromR2(key: string) {
  const result = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );

  const body = result.Body;
  if (!body) {
    throw new Error("Empty R2 object body");
  }

  const bytes = await body.transformToByteArray();
  if (!bytes?.length) {
    throw new Error("Empty R2 object bytes");
  }

  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType || "audio/mpeg",
    sizeBytes: bytes.length,
  };
}

export function ivrIntroR2Key(userId: string, token: string, ext = "mp3") {
  return `ivr/intro/${userId}/${token}.${ext}`;
}

/** Per-event spoken event-name clip only (not the full intro). */
export function ivrEventNameR2Key(userId: string, token: string, ext = "mp3") {
  return `ivr/event-name/${userId}/${token}.${ext}`;
}

/** Server-side seamless compose of before + eventName + after (no ElevenLabs). */
export function ivrComposedIntroR2Key(
  userId: string,
  token: string,
  ext = "mp3"
) {
  return `ivr/composed-intro/${userId}/${token}.${ext}`;
}

export function ivrSystemR2Key(promptKey: string, hash: string, ext = "mp3") {
  return `ivr/system/${promptKey}/${hash}.${ext}`;
}
