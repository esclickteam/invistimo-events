import { createHash } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import { jpegDataUri, normalizeInvitationImage } from "@/lib/whatsapp/invitationImage";
import {
  stripCloudinaryTransforms,
  toWhatsappInvitationImageUrl,
} from "@/lib/whatsapp/invitationImageUrl";

/**
 * The delivery transform (`c_limit` + white flatten) does not crop.
 * `c_limit` only scales a file that is already larger than the cap, and
 * `b_rgb` paints transparent pixels white. An invitation that sits in the
 * top of a tall canvas stays in the top of that canvas.
 *
 * Existing files are repaired here, at send time: the original is fetched,
 * cropped to the artwork, and stored as a baseline JPEG. Later sends of the
 * same original reuse that file. Callers do not re-upload the design.
 */

const DERIVATIVE_PREFIX = "invistimo/whatsapp-delivery/v3_";

type FetchLike = (
  input: string,
  init?: { method?: string }
) => Promise<{
  ok: boolean;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type PrepareInvitationImageDeps = {
  fetch?: FetchLike;
  upload?: (buffer: Buffer, publicId: string) => Promise<string>;
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function cloudNameFromUrl(url: string) {
  const match = url.match(/res\.cloudinary\.com\/([^/]+)\//);
  return match?.[1] || cleanString(process.env.CLOUDINARY_CLOUD_NAME);
}

function derivativePublicId(strippedUrl: string) {
  const hash = createHash("sha256").update(strippedUrl).digest("hex").slice(0, 24);
  return `${DERIVATIVE_PREFIX}${hash}`;
}

function derivativeUrl(cloudName: string, publicId: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.jpg`;
}

function isCloudinaryUpload(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/");
}

async function uploadNormalizedJpeg(buffer: Buffer, publicId: string, cloudName: string) {
  const cloud = cleanString(process.env.CLOUDINARY_CLOUD_NAME) || cloudName;
  const apiKey = cleanString(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanString(process.env.CLOUDINARY_API_SECRET);

  if (!cloud || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials for WhatsApp image delivery");
  }

  cloudinary.config({
    cloud_name: cloud,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const upload = await cloudinary.uploader.upload(jpegDataUri(buffer), {
    public_id: publicId,
    resource_type: "image",
    overwrite: true,
    invalidate: true,
    format: "jpg",
  });

  const secureUrl = cleanString(upload?.secure_url);
  if (!secureUrl.startsWith("https://")) {
    throw new Error("Cloudinary did not return an https delivery URL");
  }

  return secureUrl;
}

export async function prepareWhatsappInvitationImageUrl(
  value: unknown,
  deps: PrepareInvitationImageDeps = {}
) {
  const fallback = toWhatsappInvitationImageUrl(value);
  const stripped = stripCloudinaryTransforms(value);

  if (!stripped || !isCloudinaryUpload(stripped)) {
    return stripped || fallback;
  }

  const cloudName = cloudNameFromUrl(stripped);
  if (!cloudName) return fallback;

  const publicId = derivativePublicId(stripped);
  const cachedUrl = derivativeUrl(cloudName, publicId);
  const fetchImpl = deps.fetch ?? (fetch as unknown as FetchLike);

  try {
    const head = await fetchImpl(cachedUrl, { method: "HEAD" });
    const type = head.headers.get("content-type") || "";
    if (head.ok && type.startsWith("image/")) return cachedUrl;
  } catch {
    // A cache miss or a network error both fall through to a fresh render.
  }

  try {
    const source = await fetchImpl(stripped);
    if (!source.ok) return fallback;

    const normalized = await normalizeInvitationImage(
      Buffer.from(await source.arrayBuffer())
    );
    const upload =
      deps.upload ??
      ((buffer: Buffer, id: string) => uploadNormalizedJpeg(buffer, id, cloudName));

    return await upload(normalized.buffer, publicId);
  } catch (error) {
    console.error("whatsapp invitation image prepare failed", error);
    return fallback;
  }
}
