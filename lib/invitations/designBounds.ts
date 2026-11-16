/**
 * The rectangle the invitation editor exports.
 *
 * A background image is the paper of the invitation, including its margins,
 * so the whole stage is the design. Without one, the empty stage around the
 * objects is not part of the design and is not exported.
 */

export type DesignBoundsObject = {
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  isBackground?: boolean;
  fontSize?: number;
  lineHeight?: number;
  text?: string;
};

export type DesignBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  fullCanvas: boolean;
};

function rotatedRectBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
) {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [px, py] of corners) {
    const rx = x + px * cos - py * sin;
    const ry = y + px * sin + py * cos;
    minX = Math.min(minX, rx);
    minY = Math.min(minY, ry);
    maxX = Math.max(maxX, rx);
    maxY = Math.max(maxY, ry);
  }

  return { minX, minY, maxX, maxY };
}

function objectBounds(object: DesignBoundsObject) {
  if (object.type === "circle") {
    const radius = Math.max(0, object.radius || 0);
    const x = object.x || 0;
    const y = object.y || 0;
    return { minX: x - radius, minY: y - radius, maxX: x + radius, maxY: y + radius };
  }

  const x = object.x || 0;
  const y = object.y || 0;
  const width =
    object.width ||
    Math.max(1, (object.fontSize || 40) * Math.max(1, (object.text || "").length) * 0.5);
  const height =
    object.height || (object.fontSize || 40) * (object.lineHeight || 1.2);

  return rotatedRectBounds(x, y, width, height, object.rotation || 0);
}

export function invitationDesignBounds(
  objects: DesignBoundsObject[],
  canvas: { width: number; height: number }
): DesignBounds {
  const full = {
    x: 0,
    y: 0,
    width: Math.max(1, canvas.width),
    height: Math.max(1, canvas.height),
    fullCanvas: true,
  };

  if (objects.some((object) => object.isBackground)) return full;

  const boxes = objects
    .filter((object) => object.type !== "lottie" || object.width || object.height)
    .map(objectBounds);

  if (boxes.length === 0) return full;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const box of boxes) {
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }

  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const right = Math.min(canvas.width, Math.ceil(maxX));
  const bottom = Math.min(canvas.height, Math.ceil(maxY));
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);

  return {
    x,
    y,
    width,
    height,
    fullCanvas: width >= canvas.width - 1 && height >= canvas.height - 1,
  };
}
