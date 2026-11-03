/**
 * Historical seat-based drawing. Used only for tables that were never given
 * an explicit visualSize, so existing events keep their previous look.
 */

export type LegacyLayout = {
  type: string;
  coords: { x: number; y: number }[];
  size: number;
  width: number;
  height: number;
  radius: number;
  chairScale: number;
  outerWidth: number;
  outerHeight: number;
  compact: boolean;
};

export function legacyTableLayout(rawTable: {
  seats?: number;
  capacity?: number;
  type?: string;
} | null | undefined): LegacyLayout {
  const seats = Math.max(0, Number(rawTable?.seats ?? rawTable?.capacity ?? 0));
  const typeRaw = String(rawTable?.type || "round");
  const type =
    typeRaw === "rectangle" || typeRaw === "rect" ? "banquet" : typeRaw;

  const SEAT_R = 13;
  const SEAT_GAP = 12;
  const OUTSIDE = 10;
  const STEP = SEAT_R * 2 + SEAT_GAP;
  const PAD = SEAT_R + OUTSIDE + 18;
  const coords: { x: number; y: number }[] = [];
  const dims = { size: 150, width: 240, height: 75, radius: 55 };

  const finish = (next: Partial<LegacyLayout>): LegacyLayout => {
    const radius = next.radius ?? dims.radius;
    const size = next.size ?? dims.size;
    const width = next.width ?? dims.width;
    const height = next.height ?? dims.height;
    const outerWidth =
      type === "round"
        ? (radius + SEAT_R + OUTSIDE) * 2
        : type === "square"
          ? size + (SEAT_R + OUTSIDE) * 2
          : width + 36;
    const outerHeight =
      type === "round"
        ? outerWidth
        : type === "square"
          ? outerWidth
          : height + (SEAT_R + OUTSIDE) * 2;
    return {
      type,
      coords,
      size,
      width,
      height,
      radius,
      chairScale: 1,
      compact: false,
      outerWidth,
      outerHeight,
    };
  };

  if (!seats) return finish({});

  const placeLine = (count: number, fixed: number, axis: "x" | "y") => {
    if (count <= 0) return;
    if (count === 1) {
      coords.push(axis === "x" ? { x: 0, y: fixed } : { x: fixed, y: 0 });
      return;
    }
    const span = (count - 1) * STEP;
    const start = -span / 2;
    for (let i = 0; i < count; i++) {
      const v = start + i * STEP;
      coords.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
    }
  };

  if (type === "round") {
    const seatRing = Math.max(48, (seats * STEP) / (2 * Math.PI));
    const tableRadius = Math.max(42, seatRing - (SEAT_R + OUTSIDE));
    const ring = tableRadius + SEAT_R + OUTSIDE;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      coords.push({ x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
    }
    return finish({ radius: tableRadius });
  }

  if (type === "square") {
    const hasExtra = seats % 2 === 1;
    const even = hasExtra ? seats - 1 : seats;
    const pairs = even / 2;
    const horizontal = Math.ceil(pairs / 2);
    const vertical = Math.floor(pairs / 2);
    const top = horizontal + (hasExtra ? 1 : 0);
    const maxSide = Math.max(top, horizontal, vertical);
    const span = maxSide <= 1 ? 0 : (maxSide - 1) * STEP;
    const size = Math.max(140, span + PAD * 2);
    const fixed = size / 2 + SEAT_R + OUTSIDE;
    placeLine(top, -fixed, "x");
    placeLine(horizontal, fixed, "x");
    placeLine(vertical, fixed, "y");
    placeLine(vertical, -fixed, "y");
    return finish({ size });
  }

  const topCount = Math.ceil(seats / 2);
  const bottomCount = seats - topCount;
  const maxRow = Math.max(topCount, bottomCount);
  const span = maxRow <= 1 ? 0 : (maxRow - 1) * STEP;
  const width = Math.max(230, span + PAD * 2);
  const height = 78;
  const yFixed = height / 2 + SEAT_R + OUTSIDE;
  placeLine(topCount, -yFixed, "x");
  placeLine(bottomCount, yFixed, "x");
  return finish({ width, height });
}

export function legacyOuterDiameter(table: {
  seats?: number;
  capacity?: number;
  type?: string;
  layoutScale?: number;
} | null | undefined): number {
  const layout = legacyTableLayout(table);
  const scale = Number(table?.layoutScale);
  const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return Math.max(layout.outerWidth, layout.outerHeight) * safe;
}
