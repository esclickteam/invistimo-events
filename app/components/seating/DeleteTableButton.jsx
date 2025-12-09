"use client";

import { Group, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function DeleteTableButton({ table }) {
  const highlightedTable = useSeatingStore(s => s.highlightedTable);
  const deleteTable = useSeatingStore(s => s.deleteTable);

  // מציגים את הכפתור רק אם השולחן מסומן
  if (highlightedTable !== table.id) return null;

  return (
    <Group
      x={table.x}
      y={table.y - 110} // מעל הכיסאות
      onClick={(e) => {
        e.cancelBubble = true;
        deleteTable(table.id);
      }}
    >
      <Rect
        width={110}
        height={36}
        offsetX={55}
        fill="#ef4444"
        cornerRadius={6}
        shadowBlur={6}
      />
      <Text
        text="מחק שולחן"
        fontSize={16}
        fill="white"
        align="center"
        verticalAlign="middle"
        width={110}
        height={36}
        offsetX={55}
      />
    </Group>
  );
}
