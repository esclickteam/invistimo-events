import sharp from "sharp";

/**
 * Normalize an invitation image to the bytes we store and send.
 *
 * - Drops transparent canvas. Those pixels are not paper.
 * - Does not crop white, cream, or black by color. A 1080×1920 file with a
 *   white margin is indistinguishable from an invitation whose paper is white,
 *   so that file is sent unchanged.
 * - Does not add a canvas, a colored pad, or an MCU pad.
 * - Scales down with fit "inside" only when a side exceeds 4096px, or the
 *   JPEG exceeds WhatsApp's 5MB header limit. Never upscales.
 * - Flattens leftover alpha onto the card's own edge color, never onto black.
 * - Writes a baseline JPEG so phones do not transcode a palette PNG.
 */

const ALPHA_MIN = 16;
const MAX_LONG_EDGE = 4096;
const WHATSAPP_HEADER_MAX_BYTES = 5 * 1024 * 1024;

export const UNCERTAIN_CANVAS_WARNING =
  "הקובץ בגודל לוח המערכת, אבל אי אפשר לוודא שהשטח הבהיר הוא ריפוד ולא חלק מההזמנה. הוא נשלח בלי חיתוך.";

export type NormalizedInvitationImage = {
  buffer: Buffer;
  width: number;
  height: number;
  mime: "image/jpeg";
  trimmedTransparent: boolean;
  trimmedBlack: boolean;
  trimmedLight: boolean;
  uncertainCanvas: boolean;
  warning: string | null;
};

type Rgba = { data: Buffer; width: number; height: number };

function isOpaque(data: Buffer, offset: number) {
  return data[offset + 3] >= ALPHA_MIN;
}

async function toRgba(input: Buffer): Promise<Rgba> {
  const { data, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
  };
}

function cropRgba(
  image: Rgba,
  box: { left: number; top: number; width: number; height: number }
): Rgba {
  const next = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y += 1) {
    const src = ((box.top + y) * image.width + box.left) * 4;
    const dst = y * box.width * 4;
    image.data.copy(next, dst, src, src + box.width * 4);
  }
  return { data: next, width: box.width, height: box.height };
}

function transparentBounds(image: Rgba) {
  let top = 0;
  let bottom = image.height - 1;
  let left = 0;
  let right = image.width - 1;

  const rowHasOpaque = (y: number) => {
    for (let x = 0; x < image.width; x += 1) {
      if (isOpaque(image.data, (y * image.width + x) * 4)) return true;
    }
    return false;
  };
  const colHasOpaque = (x: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y += 1) {
      if (isOpaque(image.data, (y * image.width + x) * 4)) return true;
    }
    return false;
  };

  while (top < bottom && !rowHasOpaque(top)) top += 1;
  while (bottom > top && !rowHasOpaque(bottom)) bottom -= 1;
  while (left < right && !colHasOpaque(left, top, bottom)) left += 1;
  while (right > left && !colHasOpaque(right, top, bottom)) right -= 1;

  if (!rowHasOpaque(top)) return null;

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function edgeBackground(image: Rgba) {
  const points = [
    [0, 0],
    [image.width - 1, 0],
    [0, image.height - 1],
    [image.width - 1, image.height - 1],
  ];
  const colors: Array<[number, number, number]> = [];

  for (const [x, y] of points) {
    const offset = (y * image.width + x) * 4;
    if (!isOpaque(image.data, offset)) continue;
    colors.push([image.data[offset], image.data[offset + 1], image.data[offset + 2]]);
  }

  if (colors.length === 0) return { r: 255, g: 255, b: 255 };

  const channel = (index: 0 | 1 | 2) => {
    const values = colors.map((color) => color[index]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };

  return { r: channel(0), g: channel(1), b: channel(2) };
}

export function bufferFromImageDataUrl(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Buffer.from(payload, "base64");
}

export async function normalizeInvitationImage(
  input: Buffer
): Promise<NormalizedInvitationImage> {
  let image = await toRgba(input);
  let trimmedTransparent = false;
  const uncertainCanvas = false;

  const opaqueBox = transparentBounds(image);
  if (
    opaqueBox &&
    (opaqueBox.left > 0 ||
      opaqueBox.top > 0 ||
      opaqueBox.width < image.width ||
      opaqueBox.height < image.height)
  ) {
    image = cropRgba(image, opaqueBox);
    trimmedTransparent = true;
  }

  if (image.width < 1 || image.height < 1) {
    image = {
      data: Buffer.from([255, 255, 255, 255]),
      width: 1,
      height: 1,
    };
  }

  const background = edgeBackground(image);
  let pipeline = sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  }).flatten({ background });

  const longEdge = Math.max(image.width, image.height);
  if (longEdge > MAX_LONG_EDGE) {
    pipeline = pipeline.resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let buffer = await pipeline
    .toColorspace("srgb")
    .jpeg({
      quality: 92,
      progressive: false,
      chromaSubsampling: "4:4:4",
      mozjpeg: false,
    })
    .toBuffer();

  if (buffer.length > WHATSAPP_HEADER_MAX_BYTES) {
    buffer = await sharp(buffer)
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

  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width || image.width,
    height: meta.height || image.height,
    mime: "image/jpeg",
    trimmedTransparent,
    trimmedBlack: false,
    trimmedLight: false,
    uncertainCanvas,
    warning: uncertainCanvas ? UNCERTAIN_CANVAS_WARNING : null,
  };
}

export function jpegDataUri(buffer: Buffer) {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
