import { createHash } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import {
  imageDataUri,
  isReadyWhatsAppHeader,
  jpegBytesForWhatsAppHeader,
  sniffImageKind,
} from "@/lib/whatsapp/invitationImage";
import { stripCloudinaryTransforms } from "@/lib/whatsapp/invitationImageUrl";

/**
 * Chooses the https URL placed in header.image.link.
 *
 * A stored JPEG or PNG inside WhatsApp's limits is returned unchanged after
 * its bytes have been read. Anything else is converted without a plate and
 * uploaded as a new Cloudinary object. The original invitation file is not
 * overwritten.
 *
 * There is no silent fallback to a c_limit URL. If the source cannot be read
 * or the derivative cannot be verified, this throws and the send is not
 * marked successful.
 */

const DERIVATIVE_PREFIX = "invistimo/whatsapp-delivery/v6_";

type FetchLike = (
  input: string,
  init?: { method?: string }
) => Promise<{
  ok: boolean;
  status?: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

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

export async function prepareWhatsappInvitationImageUrl(
  value: unknown,
  deps: PrepareInvitationImageDeps = {}
) {
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

  const bytes = Buffer.from(await source.arrayBuffer());
  const size = await verifiedSize(bytes);
  if (isReadyWhatsAppHeader(size.kind, bytes.length, size.width, size.height)) {
    return stripped;
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

  if (!isCloudinaryUpload(stripped)) {
    throw new InvitationImagePrepareError(
      "header image needs a derivative but is not stored on Cloudinary"
    );
  }
  const cloudName = cloudNameFromUrl(stripped);
  if (!cloudName) {
    throw new InvitationImagePrepareError("header image cloud could not be determined");
  }

  const publicId = derivativePublicId(stripped);
  const upload =
    deps.upload ?? ((buffer: Buffer, id: string) => uploadJpeg(buffer, id, cloudName));
  let url = "";
  try {
    url = await upload(jpeg, publicId);
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
