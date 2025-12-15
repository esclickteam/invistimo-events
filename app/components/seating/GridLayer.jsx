"use client";
import { Line } from "react-konva";
import { GRID_SIZE } from "@/logic/grid";

export default function GridLayer({ width, height }) {
  const lines = [];

  for (let i = 0; i < width / GRID_SIZE; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
        stroke="#e5e7eb"
        strokeWidth={1}
        listening={false}
      />
    );
  }

  for (let i = 0; i < height / GRID_SIZE; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * GRID_SIZE, width, i * GRID_SIZE]}
        stroke="#e5e7eb"
        strokeWidth={1}
         listening={false}
      />
    );
  }

  return <>{lines}</>;
}
