export const GRID_SIZE = 30;

// כמה קרוב צריך להיות כדי "להידבק"
const SOFT_SNAP_DISTANCE = 10;

export function snapToGrid(value: number) {
  const nearest = Math.round(value / GRID_SIZE) * GRID_SIZE;

  return Math.abs(value - nearest) <= SOFT_SNAP_DISTANCE
    ? nearest
    : value;
}

export function snapPosition(pos: { x: number; y: number }) {
  return {
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y),
  };
}
