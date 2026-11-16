import sharp from "sharp";

/**
 * Invitation bytes for storage and for the WhatsApp header.
 *
 * A JPEG or PNG that is already within Meta's header limits is kept as-is
 * for storage. Nothing is placed on a 1080 plate, and no white, black, or
 * transparent margin is added. A file is re-encoded only when its type or
 * size is outside those limits, or when a JPEG is not in the baseline 4:2:0
 * profile WhatsApp mobile can place at the bubble width. Resizing uses fit
 * "inside" and never enlarges.
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

const JFIF_72DPI = Buffer.from([
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00,
]);

type JpegSegment = {
  marker: number;
  start: number;
  length: number;
};

function jpegSegments(bytes: Buffer): JpegSegment[] {
  const segments: JpegSegment[] = [];
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xd8) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(offset + 2);
    segments.push({ marker, start: offset, length });
    offset += 2 + length;
  }
  return segments;
}

/** Baseline 4:2:0 JPEG whose density cannot shrink it inside the mobile bubble. */
export function isMobileSafeWhatsAppJpeg(bytes: Buffer) {
  if (sniffImageKind(bytes) !== "jpeg") return false;
  const segments = jpegSegments(bytes);
  const sof = segments.find(
    (segment) => segment.marker === 0xc0 || segment.marker === 0xc2
  );
  if (!sof || sof.marker !== 0xc0) return false;
  const componentCount = bytes[sof.start + 9];
  if (componentCount !== 3) return false;
  let cursor = sof.start + 10;
  const sampling: number[] = [];
  for (let index = 0; index < componentCount; index += 1) {
    sampling.push(bytes[cursor + 1]);
    cursor += 3;
  }
  const chroma420 =
    sampling[0] === 0x22 && sampling[1] === 0x11 && sampling[2] === 0x11;
  if (!chroma420) return false;

  const app0 = segments.find(
    (segment) =>
      segment.marker === 0xe0 &&
      bytes.subarray(segment.start + 4, segment.start + 9).toString() === "JFIF"
  );
  if (!app0) return true;
  const unit = bytes[app0.start + 11];
  const xDensity = bytes.readUInt16BE(app0.start + 12);
  const yDensity = bytes.readUInt16BE(app0.start + 14);
  if (unit === 0) return true;
  return unit === 1 && xDensity === 72 && yDensity === 72;
}

export function withJfifDensity72(jpeg: Buffer) {
  if (sniffImageKind(jpeg) !== "jpeg") {
    throw new Error("whatsapp_header_not_jpeg");
  }
  const app0 = jpegSegments(jpeg).find(
    (segment) =>
      segment.marker === 0xe0 &&
      jpeg.subarray(segment.start + 4, segment.start + 9).toString() === "JFIF"
  );
  if (!app0) {
    return Buffer.concat([jpeg.subarray(0, 2), JFIF_72DPI, jpeg.subarray(2)]);
  }
  const after = app0.start + 2 + app0.length;
  return Buffer.concat([jpeg.subarray(0, app0.start), JFIF_72DPI, jpeg.subarray(after)]);
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
  let jpeg = withJfifDensity72(
    await image
      .jpeg({
        quality: 92,
        progressive: false,
        chromaSubsampling: "4:2:0",
        mozjpeg: false,
      })
      .toBuffer()
  );
  if (jpeg.length > WHATSAPP_HEADER_MAX_BYTES) {
    jpeg = withJfifDensity72(
      await sharp(bytes, { failOn: "none", animated: false })
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
          chromaSubsampling: "4:2:0",
          mozjpeg: false,
        })
        .toBuffer()
    );
  }
  if (
    jpeg.length > WHATSAPP_HEADER_MAX_BYTES ||
    !isMobileSafeWhatsAppJpeg(jpeg)
  ) {
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
