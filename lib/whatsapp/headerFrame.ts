import sharp from "sharp";

/**
 * WhatsApp draws an IMAGE HEADER in a wide slot, about 1.91:1.
 * A portrait export such as the editor's 400×720 stage, or a 1080×1920 file,
 * is scaled down until its height fits that slot. Its width is then about
 * 30% of the bubble, and WhatsApp paints the rest of the slot.
 *
 * This builds a separate header file at that ratio. The stored invitation
 * is not overwritten. The frame is off unless WHATSAPP_HEADER_FRAME=1.91.
 *
 * A tall invitation cannot fill a wide header and also keep every vertical
 * pixel. The frame keeps the top of the image, where the names usually are,
 * and fills the header edge to edge. It does not add a blank plate.
 */

export const WHATSAPP_HEADER_ASPECT = 1.91;
export const WHATSAPP_HEADER_WIDTH = 1125;
export const WHATSAPP_HEADER_HEIGHT = Math.round(
  WHATSAPP_HEADER_WIDTH / WHATSAPP_HEADER_ASPECT
);

export function whatsappHeaderFrameEnabled(
  value = process.env.WHATSAPP_HEADER_FRAME
) {
  return String(value ?? "").trim() === "1.91";
}

/** How much of a 1.91:1 header a file fills when WhatsApp fits it by height. */
export function headerDisplayWidthFraction(width: number, height: number) {
  if (width <= 0 || height <= 0) return 0;
  return width / height / WHATSAPP_HEADER_ASPECT;
}

export function headerFrameAlreadyFits(width: number, height: number) {
  if (width < 800 || height < 400) return false;
  const aspect = width / height;
  return aspect > 1.85 && aspect < 1.97;
}

export async function jpegFilledToWhatsappHeader(bytes: Buffer) {
  const meta = await sharp(bytes, { failOn: "none" }).rotate().metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (headerFrameAlreadyFits(width, height)) return null;

  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize(WHATSAPP_HEADER_WIDTH, WHATSAPP_HEADER_HEIGHT, {
      fit: "cover",
      position: "north",
    })
    .jpeg({
      quality: 90,
      progressive: false,
      chromaSubsampling: "4:4:4",
      mozjpeg: false,
    })
    .toBuffer();
}
