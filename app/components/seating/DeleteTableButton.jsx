"use client";

import { Group, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function DeleteTableButton({ table }) {
  const highlightedTable = useSeatingStore(s => s.highlightedTable);
  const deleteTable = useSeatingStore(s => s.deleteTable);

  if (highlightedTable !== table.id) return null;

  let offsetY = -180;
  if (table.type === "square") offsetY = -200;
  if (table.type === "banquet") offsetY = -160;

  const handleDelete = (e) => {
    e.cancelBubble = true;
    deleteTable(table.id);
  };

  return (
    <Group
      x={table.x}
      y={table.y + offsetY}
      listening={true}
      isDeleteButton={true}      // ⭐ קריטי!
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
        listening={true}
        isDeleteButton={true}    // ⭐ חשוב מאוד
        onClick={handleDelete}
        onTap={handleDelete}
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
        listening={true}
        isDeleteButton={true}    // ⭐ גם פה
        onClick={handleDelete}
        onTap={handleDelete}
      />
    </Group>
  );
}
