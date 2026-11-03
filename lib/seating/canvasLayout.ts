/**
 * Shared seating canvas geometry: one world coordinate space for the hall
 * sketch and tables. Camera (pan/zoom) never changes world sizes.
 */

export type Rect = { x: number; y: number; width: number; height: number };

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type CanvasView = { x: number; y: number; scale: number };

export type BackgroundLike = {
  url?: string;
  opacity?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fitOnLoad?: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
} | string | null | undefined;

export const MIN_LAYOUT_SCALE = 0.25;
export const MAX_LAYOUT_SCALE = 3;
export const DEFAULT_TABLE_FOOTPRINT = 230;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampLayoutScale(value: unknown, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return clamp(n, MIN_LAYOUT_SCALE, MAX_LAYOUT_SCALE);
}

export function getBackgroundRect(bg: BackgroundLike): Rect | null {
  if (!bg || typeof bg === "string") return null;
  const x = Number(bg.x);
  const y = Number(bg.y);
  const width = Number(bg.width);
  const height = Number(bg.height);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (!(width > 0) || !(height > 0)) return null;
  return { x, y, width, height };
}

/** Normalize DB / store background into a stable object shape. */
export function normalizeBackground(raw: BackgroundLike): {
  url: string;
  opacity: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fitOnLoad?: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
} | null {
  if (typeof raw === "string" && raw.trim()) {
    return { url: raw.trim(), opacity: 0.28 };
  }

  if (!raw || typeof raw !== "object" || !raw.url) return null;

  const next: {
    url: string;
    opacity: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fitOnLoad?: boolean;
    naturalWidth?: number;
    naturalHeight?: number;
  } = {
    url: String(raw.url).trim(),
    opacity: typeof raw.opacity === "number" ? raw.opacity : 0.28,
  };

  const rect = getBackgroundRect(raw);
  if (rect) Object.assign(next, rect);

  if (raw.fitOnLoad) next.fitOnLoad = true;

  const naturalWidth = Number(raw.naturalWidth);
  const naturalHeight = Number(raw.naturalHeight);
  if (naturalWidth > 0) next.naturalWidth = naturalWidth;
  if (naturalHeight > 0) next.naturalHeight = naturalHeight;

  return next;
}

/**
 * Place the sketch in world space at 1 image-pixel = 1 world unit,
 * centered on existing table/zone content when present so legacy layouts
 * stay near the sketch without rewriting table positions.
 */
export function computeCanonicalBackgroundRect(options: {
  imageWidth: number;
  imageHeight: number;
  contentBounds?: Bounds | null;
  /** When true (new upload), prefer natural size at origin unless content exists. */
  preferNaturalOrigin?: boolean;
}): Rect {
  const imageWidth = Math.max(1, Number(options.imageWidth) || 1);
  const imageHeight = Math.max(1, Number(options.imageHeight) || 1);
  const bounds = options.contentBounds;

  if (!bounds) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  }

  const contentW = Math.max(1, bounds.maxX - bounds.minX);
  const contentH = Math.max(1, bounds.maxY - bounds.minY);
  const contentCx = bounds.minX + contentW / 2;
  const contentCy = bounds.minY + contentH / 2;

  // If content already spans a region similar to the image, pin sketch at 0,0
  // only when preferNaturalOrigin and content is empty-ish — handled above.
  // Otherwise center the natural-size image on the content so tables stay
  // visually near the hall sketch without stretching.
  if (options.preferNaturalOrigin) {
    return {
      x: contentCx - imageWidth / 2,
      y: contentCy - imageHeight / 2,
      width: imageWidth,
      height: imageHeight,
    };
  }

  // Legacy url-only backgrounds: contain image into content padding box
  // while preserving aspect ratio (never stretch).
  const pad = Math.max(contentW, contentH) * 0.15;
  const boxW = contentW + pad * 2;
  const boxH = contentH + pad * 2;
  const ratio = Math.min(boxW / imageWidth, boxH / imageHeight);
  const width = imageWidth * ratio;
  const height = imageHeight * ratio;

  return {
    x: contentCx - width / 2,
    y: contentCy - height / 2,
    width,
    height,
  };
}

export function estimateTableFootprint(
  table: {
    seats?: number;
    type?: string;
    layoutScale?: number;
    width?: number;
    height?: number;
    radius?: number;
  },
  fallback = DEFAULT_TABLE_FOOTPRINT
) {
  const scale = clampLayoutScale(table?.layoutScale, 1);
  const seats = Math.max(0, Number(table?.seats || 0));
  const typeRaw = String(table?.type || "round");
  const type =
    typeRaw === "rectangle" || typeRaw === "rect" ? "banquet" : typeRaw;

  let base = fallback;
  if (type === "round") {
    base = Math.max(120, 55 + seats * 8);
  } else if (type === "square") {
    base = Math.max(160, 140 + seats * 6);
  } else if (type === "banquet") {
    base = Math.max(180, 100 + seats * 10);
  }

  return Math.max(80, base * scale);
}

export function unionBounds(
  parts: Array<Bounds | Rect | null | undefined>
): Bounds | null {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const part of parts) {
    if (!part) continue;
    if ("minX" in part) {
      xs.push(part.minX, part.maxX);
      ys.push(part.minY, part.maxY);
    } else {
      xs.push(part.x, part.x + part.width);
      ys.push(part.y, part.y + part.height);
    }
  }

  if (!xs.length || !ys.length) return null;

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function getContentBounds(options: {
  tables?: Array<{
    x?: number;
    y?: number;
    seats?: number;
    type?: string;
    layoutScale?: number;
  }>;
  zones?: Array<{ x?: number; y?: number; width?: number; height?: number }>;
  background?: BackgroundLike;
  mobile?: boolean;
}): Bounds | null {
  const tableSafeFallback = options.mobile ? 260 : DEFAULT_TABLE_FOOTPRINT;
  const parts: Array<Bounds | Rect | null> = [];

  for (const table of options.tables || []) {
    if (!Number.isFinite(Number(table.x)) || !Number.isFinite(Number(table.y))) {
      continue;
    }
    const footprint = estimateTableFootprint(table, tableSafeFallback);
    parts.push({
      minX: Number(table.x) - footprint,
      minY: Number(table.y) - footprint,
      maxX: Number(table.x) + footprint,
      maxY: Number(table.y) + footprint,
    });
  }

  for (const zone of options.zones || []) {
    if (!Number.isFinite(Number(zone.x)) || !Number.isFinite(Number(zone.y))) {
      continue;
    }
    const width = Number.isFinite(Number(zone.width)) ? Number(zone.width) : 0;
    const height = Number.isFinite(Number(zone.height))
      ? Number(zone.height)
      : 0;
    parts.push({
      x: Number(zone.x),
      y: Number(zone.y),
      width,
      height,
    });
  }

  parts.push(getBackgroundRect(options.background));

  return unionBounds(parts);
}

export function fitViewToBounds(options: {
  bounds: Bounds;
  viewportWidth: number;
  viewportHeight: number;
  paddingX?: number;
  paddingY?: number;
  minScale?: number;
  maxScale?: number;
}): CanvasView {
  const {
    bounds,
    viewportWidth,
    viewportHeight,
    paddingX = 110,
    paddingY = 110,
    minScale = 0.14,
    maxScale = 1.25,
  } = options;

  const contentW = Math.max(1, bounds.maxX - bounds.minX);
  const contentH = Math.max(1, bounds.maxY - bounds.minY);
  const contentCenterX = bounds.minX + contentW / 2;
  const contentCenterY = bounds.minY + contentH / 2;

  const availableW = Math.max(240, viewportWidth - paddingX);
  const availableH = Math.max(240, viewportHeight - paddingY);

  const nextScale = clamp(
    Math.min(availableW / contentW, availableH / contentH),
    minScale,
    maxScale
  );

  return {
    scale: nextScale,
    x: viewportWidth / 2 - contentCenterX * nextScale,
    y: viewportHeight / 2 - contentCenterY * nextScale,
  };
}

/** Keep the same world point centered when the viewport size changes. */
export function preserveWorldCenterOnResize(options: {
  prevWidth: number;
  prevHeight: number;
  nextWidth: number;
  nextHeight: number;
  view: CanvasView;
}): CanvasView {
  const { prevWidth, prevHeight, nextWidth, nextHeight, view } = options;
  if (!(prevWidth > 0) || !(prevHeight > 0)) return view;
  if (!(nextWidth > 0) || !(nextHeight > 0)) return view;
  if (!(view.scale > 0)) return view;

  const worldCenterX = (prevWidth / 2 - view.x) / view.scale;
  const worldCenterY = (prevHeight / 2 - view.y) / view.scale;

  return {
    scale: view.scale,
    x: nextWidth / 2 - worldCenterX * view.scale,
    y: nextHeight / 2 - worldCenterY * view.scale,
  };
}

/**
 * Suggest an initial visual scale so a new table is roughly ~8% of the
 * shorter sketch side (clamped), without changing seat count.
 */
export function suggestInitialLayoutScale(background: BackgroundLike): number {
  const rect = getBackgroundRect(background);
  if (!rect) return 1;

  const shorter = Math.min(rect.width, rect.height);
  if (!(shorter > 0)) return 1;

  const targetFootprint = shorter * 0.08;
  const baseFootprint = DEFAULT_TABLE_FOOTPRINT;
  return clampLayoutScale(targetFootprint / baseFootprint, 1);
}
