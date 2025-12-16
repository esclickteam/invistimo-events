export const GRID_SIZE = 30;

export function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function snapPosition(pos: { x: number; y: number }) {
  return {
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y),
  };
}
