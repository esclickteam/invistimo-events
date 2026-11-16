/**
 * Bounds of pixels that are actually painted.
 * Opaque white paper stays. Only transparent padding is outside the box.
 */

const ALPHA_MIN = 16;

export type OpaquePixelBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function opaquePixelBounds(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): OpaquePixelBounds | null {
  const channels = Math.floor(data.length / Math.max(1, width * height));
  if (channels < 4 || width < 1 || height < 1) {
    return { left: 0, top: 0, width, height };
  }

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  const rowHasOpaque = (y: number) => {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] >= ALPHA_MIN) return true;
    }
    return false;
  };
  const colHasOpaque = (x: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y += 1) {
      if (data[(y * width + x) * channels + 3] >= ALPHA_MIN) return true;
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
