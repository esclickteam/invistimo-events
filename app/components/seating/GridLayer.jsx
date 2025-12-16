"use client";
import { Line } from "react-konva";

export const GRID_SIZE = 40; // תוכלי לשנות ל-60 או 80 לפי הגודל הרצוי

export default function GridLayer({ width, height }) {
  const lines = [];

  // קווים אנכיים
  for (let x = 0; x < width; x += GRID_SIZE) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke="#ddd"
        strokeWidth={1}
      />
    );
  }

  // קווים אופקיים
  for (let y = 0; y < height; y += GRID_SIZE) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke="#ddd"
        strokeWidth={1}
      />
    );
  }

  return <>{lines}</>;
}
