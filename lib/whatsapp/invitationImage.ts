import sharp from "sharp";

/**
 * Normalize an invitation image to the bytes we store and send.
 *
 * - Drops transparent canvas (WhatsApp paints PNG alpha as black on phones).
 * - Drops a large near-black empty band around a colorful card. A full-bleed
 *   black invitation, whose artwork itself is near-black, is left intact.
 * - Drops a large flat white/near-white empty band. A paper margin under
 *   about a fifth of that side is kept, so a white invitation is not shaved
 *   down to its text. Cream and photo pixels are not treated as empty.
 * - Flattens leftover alpha onto the card's own edge color, never onto black.
 * - Writes a baseline JPEG (SOF0), sRGB, 4:4:4, dimensions multiple of 8,
 *   so the mobile transcoder does not pad a partial MCU with black.
 * - Does not stretch, upscale, or crop into non-empty artwork.
 */

const BLACK_MAX = 14;
const ALPHA_MIN = 16;
const EMPTY_ROW_DESIGN_RATIO = 0.004;
const MIN_BLACK_BAND_RATIO = 0.18;
const MIN_KEPT_DESIGN_RATIO = 0.22;
const LIGHT_MIN = 236;
const LIGHT_CHROMA = 12;
const MIN_LIGHT_BAND_RATIO = 0.22;
const MAX_LONG_EDGE = 1600;

export type NormalizedInvitationImage = {
  buffer: Buffer;
  width: number;
  height: number;
  mime: "image/jpeg";
  trimmedTransparent: boolean;
  trimmedBlack: boolean;
  trimmedLight: boolean;
};

type Rgba = { data: Buffer; width: number; height: number };

function isDesignPixel(data: Buffer, offset: number) {
  const alpha = data[offset + 3];
  if (alpha < ALPHA_MIN) return false;
  return (
    data[offset] > BLACK_MAX ||
    data[offset + 1] > BLACK_MAX ||
    data[offset + 2] > BLACK_MAX
  );
}

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

function designRatio(
  image: Rgba,
  box: { left: number; top: number; width: number; height: number }
) {
  let design = 0;
  const total = box.width * box.height;
  if (!total) return 0;

  for (let y = 0; y < box.height; y += 1) {
    for (let x = 0; x < box.width; x += 1) {
      const offset = ((box.top + y) * image.width + (box.left + x)) * 4;
      if (isDesignPixel(image.data, offset)) design += 1;
    }
  }

  return design / total;
}

function emptyBlackBands(image: Rgba) {
  const rowEmpty = (y: number) => {
    let design = 0;
    for (let x = 0; x < image.width; x += 1) {
      if (isDesignPixel(image.data, (y * image.width + x) * 4)) design += 1;
    }
    return design / image.width < EMPTY_ROW_DESIGN_RATIO;
  };
  const colEmpty = (x: number) => {
    let design = 0;
    for (let y = 0; y < image.height; y += 1) {
      if (isDesignPixel(image.data, (y * image.width + x) * 4)) design += 1;
    }
    return design / image.height < EMPTY_ROW_DESIGN_RATIO;
  };

  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;

  while (top < image.height && rowEmpty(top)) top += 1;
  while (bottom < image.height - top && rowEmpty(image.height - 1 - bottom)) {
    bottom += 1;
  }
  while (left < image.width && colEmpty(left)) left += 1;
  while (right < image.width - left && colEmpty(image.width - 1 - right)) {
    right += 1;
  }

  return { top, bottom, left, right };
}

function blackCropBox(image: Rgba) {
  const bands = emptyBlackBands(image);
  const cropTop = bands.top / image.height >= MIN_BLACK_BAND_RATIO ? bands.top : 0;
  const cropBottom =
    bands.bottom / image.height >= MIN_BLACK_BAND_RATIO ? bands.bottom : 0;
  const cropLeft = bands.left / image.width >= MIN_BLACK_BAND_RATIO ? bands.left : 0;
  const cropRight =
    bands.right / image.width >= MIN_BLACK_BAND_RATIO ? bands.right : 0;

  if (!cropTop && !cropBottom && !cropLeft && !cropRight) return null;

  const box = {
    left: cropLeft,
    top: cropTop,
    width: image.width - cropLeft - cropRight,
    height: image.height - cropTop - cropBottom,
  };

  if (box.width < 8 || box.height < 8) return null;
  if (designRatio(image, box) < MIN_KEPT_DESIGN_RATIO) return null;

  return box;
}

function isFlatLightPixel(data: Buffer, offset: number) {
  if (data[offset + 3] < ALPHA_MIN) return false;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max >= LIGHT_MIN && max - min <= LIGHT_CHROMA;
}

function emptyLightBands(image: Rgba) {
  const rowEmpty = (y: number) => {
    let ink = 0;
    for (let x = 0; x < image.width; x += 1) {
      if (!isFlatLightPixel(image.data, (y * image.width + x) * 4)) ink += 1;
    }
    return ink / image.width < EMPTY_ROW_DESIGN_RATIO;
  };
  const colEmpty = (x: number) => {
    let ink = 0;
    for (let y = 0; y < image.height; y += 1) {
      if (!isFlatLightPixel(image.data, (y * image.width + x) * 4)) ink += 1;
    }
    return ink / image.height < EMPTY_ROW_DESIGN_RATIO;
  };

  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;

  while (top < image.height && rowEmpty(top)) top += 1;
  while (bottom < image.height - top && rowEmpty(image.height - 1 - bottom)) {
    bottom += 1;
  }
  while (left < image.width && colEmpty(left)) left += 1;
  while (right < image.width - left && colEmpty(image.width - 1 - right)) {
    right += 1;
  }

  return { top, bottom, left, right };
}

function lightCropBox(image: Rgba) {
  const bands = emptyLightBands(image);
  const cropTop = bands.top / image.height >= MIN_LIGHT_BAND_RATIO ? bands.top : 0;
  const cropBottom =
    bands.bottom / image.height >= MIN_LIGHT_BAND_RATIO ? bands.bottom : 0;
  const cropLeft = bands.left / image.width >= MIN_LIGHT_BAND_RATIO ? bands.left : 0;
  const cropRight =
    bands.right / image.width >= MIN_LIGHT_BAND_RATIO ? bands.right : 0;

  if (!cropTop && !cropBottom && !cropLeft && !cropRight) return null;

  const box = {
    left: cropLeft,
    top: cropTop,
    width: image.width - cropLeft - cropRight,
    height: image.height - cropTop - cropBottom,
  };

  if (box.width < 32 || box.height < 32) return null;

  return box;
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
  let trimmedBlack = false;
  let trimmedLight = false;

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

  const blackBox = image.width > 0 ? blackCropBox(image) : null;
  if (blackBox) {
    image = cropRgba(image, blackBox);
    trimmedBlack = true;
  }

  const lightBox = image.width > 0 ? lightCropBox(image) : null;
  if (lightBox) {
    image = cropRgba(image, lightBox);
    trimmedLight = true;
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
      width: image.width >= image.height ? MAX_LONG_EDGE : undefined,
      height: image.height > image.width ? MAX_LONG_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const resized = await pipeline
    .toColorspace("srgb")
    .png()
    .toBuffer({ resolveWithObject: true });

  const padRight = (8 - (resized.info.width % 8)) % 8;
  const padBottom = (8 - (resized.info.height % 8)) % 8;

  const buffer = await sharp(resized.data)
    .extend({
      right: padRight,
      bottom: padBottom,
      background,
    })
    .jpeg({
      quality: 92,
      progressive: false,
      chromaSubsampling: "4:4:4",
      mozjpeg: false,
    })
    .toBuffer();

  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width || resized.info.width + padRight,
    height: meta.height || resized.info.height + padBottom,
    mime: "image/jpeg",
    trimmedTransparent,
    trimmedBlack,
    trimmedLight,
  };
}

export function jpegDataUri(buffer: Buffer) {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
