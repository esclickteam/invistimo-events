/**
 * Visual table size is independent of seat capacity.
 * The outer bounds come from the sketch (or a fixed empty-canvas size).
 * Chairs shrink to fit inside those bounds and never grow the table.
 */

import {
  getBackgroundRect,
  type BackgroundLike,
} from "./canvasLayout";
import { legacyOuterDiameter } from "./legacyTableLayout";

/** Share of the sketch's shorter side. Matches a table drawn on a full hall plan. */
export const SKETCH_TABLE_RATIO = 0.08;
export const EMPTY_CANVAS_VISUAL = 150;
export const MIN_VISUAL_SIZE = 36;
export const MAX_VISUAL_SIZE = 2400;

export type FittedTableLayout = {
  type: string;
  coords: { x: number; y: number }[];
  compact: boolean;
  chairR: number;
  chairScale: number;
  radius: number;
  size: number;
  width: number;
  height: number;
  outerWidth: number;
  outerHeight: number;
};

/** Size implied by the sketch (or the empty canvas). Ignores a saved calibration. */
export function sketchProportionalSize(background: BackgroundLike): number {
  if (background && typeof background === "object") {
    const rect = getBackgroundRect(background);
    if (rect) {
      return Math.min(rect.width, rect.height) * SKETCH_TABLE_RATIO;
    }
  }

  return EMPTY_CANVAS_VISUAL;
}

export function resolveDefaultVisualSize(background: BackgroundLike): number {
  if (background && typeof background === "object") {
    const saved = Number(
      (background as { defaultVisualSize?: number }).defaultVisualSize
    );
    if (saved > 0) return saved;
  }

  return sketchProportionalSize(background);
}

/** Saved visual size only. Missing means the historical drawing — do not invent one. */
export function explicitVisualSize(
  table: { visualSize?: number } | null | undefined
): number | null {
  const explicit = Number(table?.visualSize);
  return explicit > 0 ? explicit : null;
}

export function clampTableVisualSize(value: number, _reference?: number): number {
  const next = Number(value);
  if (!(next > 0)) return EMPTY_CANVAS_VISUAL;
  return Math.min(MAX_VISUAL_SIZE, Math.max(MIN_VISUAL_SIZE, next));
}

/** Current outer size. Legacy tables keep their historical diameter. */
export function displayedOuter(table: {
  visualSize?: number;
  layoutScale?: number;
  seats?: number;
  capacity?: number;
  type?: string;
} | null | undefined): number {
  const explicit = explicitVisualSize(table);
  if (explicit) return explicit;
  return legacyOuterDiameter(table);
}

function layoutRound(seats: number, outer: number): FittedTableLayout {
  const outerR = outer / 2;
  const perimeter = 2 * Math.PI * outerR * 0.8;
  const slot = seats > 0 ? perimeter / seats : outerR;
  const chairR = Math.min(outerR * 0.13, slot * 0.32);
  const compact = seats > 0 && chairR < outerR * 0.05;
  const tableR = compact
    ? outerR * 0.7
    : Math.max(outerR * 0.38, outerR - chairR * 2.6);
  const coords: { x: number; y: number }[] = [];

  if (!compact && seats > 0) {
    const ring = outerR - chairR * 1.5;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      coords.push({
        x: Math.cos(angle) * ring,
        y: Math.sin(angle) * ring,
      });
    }
  }

  return {
    type: "round",
    coords,
    compact,
    chairR: compact ? 0 : chairR,
    chairScale: compact ? 1 : Math.max(0.2, chairR / 13),
    radius: tableR,
    size: outer,
    width: outer,
    height: outer,
    outerWidth: outer,
    outerHeight: outer,
  };
}

function layoutBox(
  seats: number,
  outerWidth: number,
  outerHeight: number,
  type: "square" | "banquet"
): FittedTableLayout {
  const longSide = Math.max(outerWidth, outerHeight);
  const shortSide = Math.min(outerWidth, outerHeight);
  const perSide =
    type === "banquet"
      ? Math.ceil(seats / 2)
      : Math.max(1, Math.ceil(seats / 4));
  const slot = longSide / Math.max(perSide, 1);
  const chairR = Math.min(shortSide * 0.16, slot * 0.28);
  const compact = seats > 0 && chairR < shortSide * 0.06;
  const coords: { x: number; y: number }[] = [];

  const bodyW = outerWidth * (type === "banquet" ? 0.78 : 0.62);
  const bodyH = outerHeight * (type === "banquet" ? 0.46 : 0.62);

  if (!compact && seats > 0) {
    if (type === "banquet") {
      const top = Math.ceil(seats / 2);
      const bottom = seats - top;
      const y = outerHeight / 2 - chairR * 1.35;
      placeRow(coords, top, -y, outerWidth * 0.72);
      placeRow(coords, bottom, y, outerWidth * 0.72);
    } else {
      const extra = seats % 4;
      const side = Math.floor(seats / 4);
      const top = side + (extra > 0 ? 1 : 0);
      const right = side + (extra > 1 ? 1 : 0);
      const bottom = side + (extra > 2 ? 1 : 0);
      const left = side;
      const inset = outerWidth / 2 - chairR * 1.35;
      placeRow(coords, top, -inset, outerWidth * 0.7);
      placeRow(coords, bottom, inset, outerWidth * 0.7);
      placeColumn(coords, right, inset, outerHeight * 0.7);
      placeColumn(coords, left, -inset, outerHeight * 0.7);
    }
  }

  return {
    type,
    coords,
    compact,
    chairR: compact ? 0 : chairR,
    chairScale: compact ? 1 : Math.max(0.2, chairR / 13),
    radius: Math.min(bodyW, bodyH) / 2,
    size: Math.max(bodyW, bodyH),
    width: bodyW,
    height: bodyH,
    outerWidth,
    outerHeight,
  };
}

function placeRow(
  coords: { x: number; y: number }[],
  count: number,
  y: number,
  span: number
) {
  if (count <= 0) return;
  if (count === 1) {
    coords.push({ x: 0, y });
    return;
  }
  const step = span / (count - 1);
  const start = -span / 2;
  for (let i = 0; i < count; i++) {
    coords.push({ x: start + i * step, y });
  }
}

function placeColumn(
  coords: { x: number; y: number }[],
  count: number,
  x: number,
  span: number
) {
  if (count <= 0) return;
  if (count === 1) {
    coords.push({ x, y: 0 });
    return;
  }
  const step = span / (count - 1);
  const start = -span / 2;
  for (let i = 0; i < count; i++) {
    coords.push({ x, y: start + i * step });
  }
}

export function fitTableLayout(
  table: { seats?: number; capacity?: number; type?: string } | null | undefined,
  visualSize: number
): FittedTableLayout {
  const seats = Math.max(
    0,
    Math.floor(Number(table?.seats ?? table?.capacity ?? 0))
  );
  const typeRaw = String(table?.type || "round");
  const outer = Math.max(48, Number(visualSize) || EMPTY_CANVAS_VISUAL);

  if (typeRaw === "square") {
    return layoutBox(seats, outer, outer, "square");
  }

  if (
    typeRaw === "banquet" ||
    typeRaw === "rectangle" ||
    typeRaw === "rect"
  ) {
    return layoutBox(seats, outer, outer * 0.4, "banquet");
  }

  return layoutRound(seats, outer);
}

export function chairsStayInside(layout: FittedTableLayout): boolean {
  const limitX = layout.outerWidth / 2 + 0.5;
  const limitY = layout.outerHeight / 2 + 0.5;
  const pad = layout.chairR * 1.35;
  return layout.coords.every(
    (point) =>
      Math.abs(point.x) + pad <= limitX && Math.abs(point.y) + pad <= limitY
  );
}
