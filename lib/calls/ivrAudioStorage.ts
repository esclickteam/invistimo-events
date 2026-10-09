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

/** True when the first bytes are a known playable audio container. */
export function bufferHasPlayableAudioMagic(
  buffer: Buffer | Uint8Array | null | undefined
) {
  if (!buffer || buffer.length < 64) return false;
  const b0 = buffer[0];
  const b1 = buffer[1];
  const b2 = buffer[2];
  const b3 = buffer[3];
  // ID3 tag or MPEG frame sync
  if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) return true;
  if (b0 === 0xff && (b1 & 0xe0) === 0xe0) return true;
  // RIFF....WAVE
  if (
    b0 === 0x52 &&
    b1 === 0x49 &&
    b2 === 0x46 &&
    b3 === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return true;
  }
  // Ogg
  if (b0 === 0x4f && b1 === 0x67 && b2 === 0x67 && b3 === 0x53) return true;
  // ftyp (mp4/m4a)
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return true;
  }
  return false;
}

/**
 * Reject empty / tiny / non-audio payloads so Telnyx is not given a silent "200".
 * Magic bytes win over R2 Content-Type: some objects are stored as
 * application/octet-stream even when the body is a valid mp3.
 */
export function looksLikePlayableAudioBuffer(
  buffer: Buffer | Uint8Array | null | undefined,
  contentType?: string | null
) {
  if (!bufferHasPlayableAudioMagic(buffer)) return false;

  const raw = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!raw || isPlayableAudioContentType(raw)) return true;
  // Neutral / missing types are OK when magic is clearly audio.
  if (
    raw === "application/octet-stream" ||
    raw === "binary/octet-stream" ||
    raw === "application/mp3" ||
    raw === "application/x-mp3"
  ) {
    return true;
  }
  // HTML/JSON error bodies must never be served as "audio".
  if (
    raw.startsWith("text/") ||
    raw.includes("json") ||
    raw.includes("xml") ||
    raw.includes("javascript")
  ) {
    return false;
  }
  return true;
}

/** Prefer a browser/Telnyx-friendly audio Content-Type for responses. */
export function resolvePlayableAudioContentType(
  buffer: Buffer | Uint8Array,
  storedType?: string | null
) {
  const stored = String(storedType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (isPlayableAudioContentType(stored)) return stored;

  if (!buffer || buffer.length < 12) return "audio/mpeg";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return "audio/wav";
  }
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67) {
    return "audio/ogg";
  }
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return "audio/mp4";
  }
  return "audio/mpeg";
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

/** Inbound stitch: inboundBefore + event name + inboundAfter. Not the outbound file. */
export function ivrComposedInboundR2Key(
  userId: string,
  token: string,
  ext = "mp3"
) {
  return `ivr/composed-inbound/${userId}/${token}.${ext}`;
}

export function ivrSystemR2Key(promptKey: string, hash: string, ext = "mp3") {
  return `ivr/system/${promptKey}/${hash}.${ext}`;
}
