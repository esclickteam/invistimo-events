"use client";
import { Circle, Group, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function GhostPreview() {
  const draggedGuest = useSeatingStore((s) => s.draggedGuest);
  const ghost = useSeatingStore((s) => s.ghostPosition);

  if (!draggedGuest) return null;

  // ✅ נרמול בטוח (קריטי ל-Konva)
  const x = Number(ghost?.x);
  const y = Number(ghost?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return (
    <Group x={x} y={y} opacity={0.5}>
      <Circle radius={28} fill="#3b82f6" />
      <Text
        text={String(draggedGuest.name ?? "")}
        offsetY={-40}
        align="center"
        fontSize={14}
        fill="#3b82f6"
      />
      {draggedGuest.count > 1 && (
        <Text
          text={`x${draggedGuest.count}`}
          offsetY={10}
          align="center"
          fontSize={14}
          fill="white"
        />
      )}
    </Group>
  );
}
