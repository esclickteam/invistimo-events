import { createHash } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import {
  imageDataUri,
  isReadyWhatsAppHeader,
  jpegBytesForWhatsAppHeader,
  sniffImageKind,
} from "@/lib/whatsapp/invitationImage";
import { stripCloudinaryTransforms } from "@/lib/whatsapp/invitationImageUrl";
import {
  jpegFilledToWhatsappHeader,
  whatsappHeaderFrameEnabled,
} from "@/lib/whatsapp/headerFrame";

/**
 * Reads the invitation file WhatsApp will receive.
 *
 * A stored JPEG or PNG inside WhatsApp's limits is returned unchanged.
 * Anything else is converted without a plate. The original invitation file
 * is not overwritten. The send path uploads these bytes and references the
 * media id; it does not hand Meta the Cloudinary link.
 *
 * There is no silent fallback to a c_limit URL. If the source cannot be read
 * or a required conversion fails, this throws and the send is not marked
 * successful.
 */

export type WhatsAppHeaderDelivery = {
  status: number;
  contentType: string | null;
  contentLength: string | null;
  contentDisposition: string | null;
  cacheControl: string | null;
  etag: string | null;
  redirected: boolean;
  finalUrl: string;
};

export type VerifiedWhatsappHeader = {
  bytes: Buffer;
  mime: "image/jpeg" | "image/png";
  sourceUrl: string;
  /** True only when the file was outside WhatsApp's limits and was re-encoded. */
  normalized: boolean;
  delivery: WhatsAppHeaderDelivery;
};

const DERIVATIVE_PREFIX = "invistimo/whatsapp-delivery/v6_";
const HEADER_FRAME_PREFIX = "invistimo/whatsapp-header-frame/v1_";

type HeaderFetchResponse = {
  ok: boolean;
  status?: number;
  url?: string;
  redirected?: boolean;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
};

type FetchLike = (
  input: string,
  init?: { method?: string }
) => Promise<HeaderFetchResponse>;

export type PrepareInvitationImageDeps = {
  fetch?: FetchLike;
  upload?: (buffer: Buffer, publicId: string) => Promise<string>;
};

export class InvitationImagePrepareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationImagePrepareError";
  }
}

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

function headerFramePublicId(strippedUrl: string) {
  const hash = createHash("sha256")
    .update(`header-frame:${strippedUrl}`)
    .digest("hex")
    .slice(0, 24);
  return `${HEADER_FRAME_PREFIX}${hash}`;
}

function isCloudinaryUpload(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/");
}

async function uploadJpeg(buffer: Buffer, publicId: string, cloudName: string) {
  const cloud = cleanString(process.env.CLOUDINARY_CLOUD_NAME) || cloudName;
  const apiKey = cleanString(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanString(process.env.CLOUDINARY_API_SECRET);

  if (!cloud || !apiKey || !apiSecret) {
    throw new InvitationImagePrepareError(
      "Missing Cloudinary credentials for WhatsApp image delivery"
    );
  }

  cloudinary.config({
    cloud_name: cloud,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const upload = await cloudinary.uploader.upload(imageDataUri(buffer, "image/jpeg"), {
    public_id: publicId,
    resource_type: "image",
    overwrite: true,
    invalidate: true,
    format: "jpg",
  });

  const secureUrl = cleanString(upload?.secure_url);
  if (!secureUrl.startsWith("https://")) {
    throw new InvitationImagePrepareError("Cloudinary did not return an https delivery URL");
  }
  return secureUrl;
}

async function verifiedSize(bytes: Buffer) {
  const meta = await sharpMetadata(bytes);
  return {
    kind: sniffImageKind(bytes),
    width: meta.width || 0,
    height: meta.height || 0,
  };
}

async function sharpMetadata(bytes: Buffer) {
  const sharp = (await import("sharp")).default;
  return sharp(bytes, { failOn: "none", animated: false }).metadata();
}

function headerDelivery(
  source: HeaderFetchResponse,
  sourceUrl: string
): WhatsAppHeaderDelivery {
  return {
    status: source.status || 0,
    contentType: source.headers.get("content-type"),
    contentLength: source.headers.get("content-length"),
    contentDisposition: source.headers.get("content-disposition"),
    cacheControl: source.headers.get("cache-control"),
    etag: source.headers.get("etag"),
    redirected: Boolean(source.redirected),
    finalUrl: source.url || sourceUrl,
  };
}

export async function loadVerifiedWhatsappHeader(
  value: unknown,
  deps: PrepareInvitationImageDeps = {}
): Promise<VerifiedWhatsappHeader> {
  const stripped = stripCloudinaryTransforms(value);
  if (!stripped.startsWith("https://")) {
    throw new InvitationImagePrepareError("header image url is not https");
  }

  const fetchImpl = deps.fetch ?? (fetch as unknown as FetchLike);
  const source = await fetchImpl(stripped).catch((error) => {
    console.error("whatsapp invitation image prepare failed", error);
    throw new InvitationImagePrepareError("header image source could not be read");
  });
  if (!source.ok) {
    console.error("whatsapp invitation image prepare failed", {
      status: source.status || 0,
    });
    throw new InvitationImagePrepareError("header image source could not be read");
  }

  const finalUrl = source.url || stripped;
  if (source.redirected && !finalUrl.startsWith("https://")) {
    throw new InvitationImagePrepareError("header image redirect is not https");
  }

  const bytes = Buffer.from(await source.arrayBuffer());
  const delivery = headerDelivery(source, stripped);
  const size = await verifiedSize(bytes);
  if (isReadyWhatsAppHeader(size.kind, bytes.length, size.width, size.height)) {
    return {
      bytes,
      mime: size.kind === "png" ? "image/png" : "image/jpeg",
      sourceUrl: stripped,
      normalized: false,
      delivery,
    };
  }

  let jpeg: Buffer;
  try {
    jpeg = await jpegBytesForWhatsAppHeader(bytes);
  } catch (error) {
    console.error("whatsapp invitation image prepare failed", error);
    throw new InvitationImagePrepareError("header image could not be prepared");
  }
  const prepared = await verifiedSize(jpeg);
  if (
    !isReadyWhatsAppHeader(prepared.kind, jpeg.length, prepared.width, prepared.height)
  ) {
    throw new InvitationImagePrepareError("prepared header image failed verification");
  }

  return {
    bytes: jpeg,
    mime: "image/jpeg",
    sourceUrl: stripped,
    normalized: true,
    delivery,
  };
}

export async function prepareWhatsappInvitationImageUrl(
  value: unknown,
  deps: PrepareInvitationImageDeps = {}
) {
  const loaded = await loadVerifiedWhatsappHeader(value, deps);
  const framed = whatsappHeaderFrameEnabled()
    ? await jpegFilledToWhatsappHeader(loaded.bytes)
    : null;
  if (!framed && !loaded.normalized) return loaded.sourceUrl;

  const stripped = loaded.sourceUrl;
  if (!isCloudinaryUpload(stripped)) {
    throw new InvitationImagePrepareError(
      "header image needs a derivative but is not stored on Cloudinary"
    );
  }
  const cloudName = cloudNameFromUrl(stripped);
  if (!cloudName) {
    throw new InvitationImagePrepareError("header image cloud could not be determined");
  }

  const publicId = framed
    ? headerFramePublicId(stripped)
    : derivativePublicId(stripped);
  const upload =
    deps.upload ?? ((buffer: Buffer, id: string) => uploadJpeg(buffer, id, cloudName));
  const fetchImpl = deps.fetch ?? (fetch as unknown as FetchLike);
  let url = "";
  try {
    url = await upload(framed ?? loaded.bytes, publicId);
  } catch (error) {
    console.error("whatsapp invitation image prepare failed", error);
    if (error instanceof InvitationImagePrepareError) throw error;
    throw new InvitationImagePrepareError("header image derivative could not be stored");
  }
  if (!url.startsWith("https://")) {
    throw new InvitationImagePrepareError("prepared header image url is not https");
  }

  const head = await fetchImpl(url, { method: "HEAD" }).catch((error) => {
    console.error("whatsapp invitation image prepare failed", error);
    throw new InvitationImagePrepareError("prepared header image url did not verify");
  });
  const type = head.headers.get("content-type") || "";
  if (!head.ok || !type.startsWith("image/")) {
    console.error("whatsapp invitation image prepare failed", {
      status: head.status || 0,
      contentType: type,
    });
    throw new InvitationImagePrepareError("prepared header image url did not verify");
  }
  return url;
}
