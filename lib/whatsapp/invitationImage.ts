import sharp from "sharp";

/**
 * Invitation bytes for storage and for the WhatsApp header.
 *
 * A JPEG or PNG that is already within Meta's header limits is kept as-is.
 * Nothing is placed on a 1080 plate, and no white, black, or transparent
 * margin is added. A file is re-encoded only when its type or size is outside
 * those limits, using fit "inside" and without enlargement.
 *
 * An opaque white or cream area is not cropped. Invistimo's old `lpad` plate
 * used the same white as invitation paper, so cutting it would also cut a
 * real design. When that padding cannot be identified with confidence, the
 * stored pixels are left unchanged.
 */

export const WHATSAPP_HEADER_MAX_BYTES = 5 * 1024 * 1024;
export const WHATSAPP_HEADER_MAX_SIDE = 4096;

export const UNCERTAIN_CANVAS_WARNING =
  "לא ניתן לזהות בוודאות ריפוד שנוצר במערכת בלי לחתוך רקע שעשוי להיות חלק מההזמנה. הקובץ נשמר בלי חיתוך.";

export type ImageBinaryKind = "jpeg" | "png" | "other";

export function sniffImageKind(bytes: Buffer): ImageBinaryKind {
  if (!bytes?.length) return "other";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(png)) return "png";
  return "other";
}

export function isReadyWhatsAppHeader(
  kind: ImageBinaryKind,
  byteLength: number,
  width: number,
  height: number
) {
  return (
    (kind === "jpeg" || kind === "png") &&
    byteLength > 0 &&
    byteLength <= WHATSAPP_HEADER_MAX_BYTES &&
    width > 0 &&
    height > 0 &&
    width <= WHATSAPP_HEADER_MAX_SIDE &&
    height <= WHATSAPP_HEADER_MAX_SIDE
  );
}

export function bufferFromImageDataUrl(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Buffer.from(payload, "base64");
}

export function imageDataUri(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function jpegDataUri(buffer: Buffer) {
  return imageDataUri(buffer, "image/jpeg");
}

/** Re-encode only. Does not pad, extend, or crop opaque paper. */
export async function jpegBytesForWhatsAppHeader(bytes: Buffer) {
  const image = sharp(bytes, { failOn: "none", animated: false }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width > WHATSAPP_HEADER_MAX_SIDE || height > WHATSAPP_HEADER_MAX_SIDE) {
    image.resize({
      width: WHATSAPP_HEADER_MAX_SIDE,
      height: WHATSAPP_HEADER_MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  let jpeg = await image
    .jpeg({
      quality: 92,
      progressive: false,
      chromaSubsampling: "4:4:4",
      mozjpeg: false,
    })
    .toBuffer();
  if (jpeg.length > WHATSAPP_HEADER_MAX_BYTES) {
    jpeg = await sharp(bytes, { failOn: "none", animated: false })
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: false,
        chromaSubsampling: "4:4:4",
        mozjpeg: false,
      })
      .toBuffer();
  }
  if (jpeg.length > WHATSAPP_HEADER_MAX_BYTES || sniffImageKind(jpeg) !== "jpeg") {
    throw new Error("whatsapp_header_too_large");
  }
  return jpeg;
}

export async function bytesForInvitationStorage(bytes: Buffer) {
  const kind = sniffImageKind(bytes);
  const meta = await sharp(bytes, { failOn: "none", animated: false }).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (isReadyWhatsAppHeader(kind, bytes.length, width, height)) {
    return {
      buffer: bytes,
      mime: kind === "png" ? "image/png" : "image/jpeg",
      width,
      height,
      converted: false,
    };
  }
  const jpeg = await jpegBytesForWhatsAppHeader(bytes);
  const stored = await sharp(jpeg).metadata();
  return {
    buffer: jpeg,
    mime: "image/jpeg" as const,
    width: stored.width || width,
    height: stored.height || height,
    converted: true,
  };
}
