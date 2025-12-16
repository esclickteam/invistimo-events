"use client";

import { Circle, Text, Group } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function GhostGuest() {
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const ghostPosition = useSeatingStore((s) => s.ghostPosition);

  if (!draggingGuest) return null;

  const count =
    draggingGuest.guestsCount ||
    draggingGuest.count ||
    1;

  return (
    <Group
      x={ghostPosition.x}
      y={ghostPosition.y}
      opacity={0.85}
      listening={false} // ❗ לא חוסם events
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
