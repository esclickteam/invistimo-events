/**
 * Store IVR audio in R2 and expose via public tokenized media URLs for Telnyx playback.
 */

import { randomBytes } from "crypto";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

export function createIvrAudioPublicToken() {
  return randomBytes(24).toString("hex");
}

export function getAppBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return String(raw || "").replace(/\/$/, "");
}

export function buildIvrPublicAudioUrl(publicToken: string, baseUrl?: string) {
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, "");
  if (!base || !publicToken) return "";
  return `${base}/api/ivr/media/${encodeURIComponent(publicToken)}`;
}

export async function uploadIvrAudioToR2(input: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: input.key,
      Body: input.buffer,
      ContentType: input.contentType || "audio/mpeg",
    })
  );

  return {
    bucket: R2_BUCKET_NAME,
    key: input.key,
    contentType: input.contentType || "audio/mpeg",
    sizeBytes: input.buffer.length,
  };
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
  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType || "audio/mpeg",
  };
}

export function ivrIntroR2Key(userId: string, token: string, ext = "mp3") {
  return `ivr/intro/${userId}/${token}.${ext}`;
}

export function ivrSystemR2Key(promptKey: string, hash: string, ext = "mp3") {
  return `ivr/system/${promptKey}/${hash}.${ext}`;
}
