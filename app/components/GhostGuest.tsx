"use client";

import { Circle, Text, Group } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function GhostGuest() {
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const ghostPosition = useSeatingStore((s) => s.ghostPosition);
  const stageScale = useSeatingStore((s) => s.stageScale);
  const stagePosition = useSeatingStore((s) => s.stagePosition);

  if (!draggingGuest || !ghostPosition) return null;

  const count =
    draggingGuest.guestsCount ||
    draggingGuest.count ||
    1;

  // 🔥 תיקון קריטי – התאמה ל־zoom + pan
  const x = (ghostPosition.x - stagePosition.x) / stageScale;
  const y = (ghostPosition.y - stagePosition.y) / stageScale;

  return (
    <Group
      x={x}
      y={y}
      opacity={0.85}
      listening={false}
    >
      <Circle radius={16} fill="#2563eb" />
      <Text
        text={`${draggingGuest.name || "אורח"} (${count})`}
        fill="white"
        fontSize={12}
        offsetX={30}
        offsetY={6}
      />
    </Group>
  );
}
