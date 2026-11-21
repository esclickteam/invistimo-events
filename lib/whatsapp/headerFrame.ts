import sharp from "sharp";

/**
 * Dedicated WhatsApp copy of an invitation.
 *
 * The editor stage is portrait, 400×720. The file sent at 13:11 is that same
 * proportion at 1080×1920, and its artwork already spans the full width.
 * This copy keeps that full portrait. It does not crop, pad, or place the
 * design on a wider plate. The stored invitation is not overwritten.
 *
 * It stays off unless WHATSAPP_HEADER_FRAME=preserve. The value "1.91" is
 * ignored: a 1125×589 cover crop is not a valid export.
 */

export function whatsappHeaderFrameEnabled(
  value = process.env.WHATSAPP_HEADER_FRAME
) {
  return String(value ?? "").trim() === "preserve";
}

export async function jpegPreservingFullInvitation(bytes: Buffer) {
  const meta = await sharp(bytes, { failOn: "none" }).rotate().metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width < 1 || height < 1) {
    throw new Error("invitation image has no pixels");
  }

  return sharp(bytes, { failOn: "none" })
    .rotate()
    .jpeg({
      quality: 92,
      progressive: false,
      chromaSubsampling: "4:4:4",
      mozjpeg: false,
    })
    .toBuffer();
}
