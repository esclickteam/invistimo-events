"use client";

import { Group, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function DeleteTableButton({ table }) {
  const deleteTable = useSeatingStore((s) => s.deleteTable);

  if (!table) return null;

  const x = Number(table.x);
  const y = Number(table.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  let offsetY = -180;
  if (table.type === "square") offsetY = -200;
  if (table.type === "banquet") offsetY = -160;

  const handleDelete = (e) => {
    e.cancelBubble = true;
    deleteTable(table.id);
  };

  return (
    <Group
      x={x}
      y={y + offsetY}
      listening
      onClick={handleDelete}
      onTap={handleDelete}
    >
      <Rect
        width={120}
        height={40}
        offsetX={60}
        fill="#ef4444"
        cornerRadius={8}
        shadowBlur={8}
      />

      <Text
        text="מחק שולחן"
        fontSize={18}
        fill="white"
        align="center"
        verticalAlign="middle"
        width={120}
        height={40}
        offsetX={60}
      />
    </Group>
  );
}
