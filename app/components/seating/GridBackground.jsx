"use client";

import { Line } from "react-konva";

export default function GridBackground({
  width,
  height,
  gridSize = 50,
  color = "#d9dee3",
  opacity = 0.35,
}) {
  const lines = [];

  // קווים אנכיים
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke={color}
        strokeWidth={1}
        opacity={opacity}
      />
    );
  }

  // קווים אופקיים
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke={color}
        strokeWidth={1}
        opacity={opacity}
      />
    );
  }

  return <>{lines}</>;
}
