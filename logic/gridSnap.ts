// logic/gridSnap.ts

export const GRID_SIZE = 40;

/**
 * מצמיד מיקום לגריד
 * @param value number (x או y)
 */
export function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * מצמיד מיקום של אובייקט לגריד
 */
export function snapPosition(pos: { x: number; y: number }) {
  return {
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y),
  };
}
