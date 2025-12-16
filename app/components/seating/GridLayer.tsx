"use client";

import { Line } from "react-konva";

/**
 * UX Grid:
 * קטן, עדין, לא משתלט
 */
export const GRID_SIZE = 30;

type GridLayerProps = {
  width: number;
  height: number;
  visible?: boolean; // ✨ חדש
};

export default function GridLayer({
  width,
  height,
  visible = true,
}: GridLayerProps) {
  if (!visible) return null;

  const lines = [];

  const strokeColor = "#e9e9e9"; // עדין יותר
  const strokeWidth = 0.5;
  const opacity = 0.6; // ✨ UX רך

  /* ================================
     Vertical lines
  ================================= */
  for (let x = 0; x <= width; x += GRID_SIZE) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
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
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
