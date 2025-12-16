"use client";

import { Line } from "react-konva";

/**
 * גודל גריד מומלץ:
 * 20 – תזוזה עדינה
 * 30 – מאוזן (מומלץ)
 * 40 – גריד גס
 */
export const GRID_SIZE = 30;

type GridLayerProps = {
  width: number;
  height: number;
};

export default function GridLayer({ width, height }: GridLayerProps) {
  const lines = [];

  /* ================================
     Vertical lines
  ================================= */
  for (let x = 0; x <= width; x += GRID_SIZE) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke="#e5e5e5"
        strokeWidth={0.5}
        listening={false}
      />
    );
  }

  /* ================================
     Horizontal lines
  ================================= */
  for (let y = 0; y <= height; y += GRID_SIZE) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke="#e5e5e5"
        strokeWidth={0.5}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
