"use client";

import { Group, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function DeleteTableButton({ table }) {
  const highlightedTable = useSeatingStore(s => s.highlightedTable);
  const deleteTable = useSeatingStore(s => s.deleteTable);

  if (highlightedTable !== table.id) return null;

  let offsetY = -165; // ברירת מחדל (עגול)

  if (table.type === "square") offsetY = -170;
  if (table.type === "banquet") offsetY = -130;

  return (
    <Group
      x={table.x}
      y={table.y + offsetY}
      onClick={(e) => {
        e.cancelBubble = true;
        deleteTable(table.id);
      }}
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
