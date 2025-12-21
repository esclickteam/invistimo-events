"use client";

import { Group, Circle, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

export default function DeleteTableButton({ table }) {
  const deleteTable = useSeatingStore((s) => s.deleteTable);
  const selectedTableId = useSeatingStore((s) => s.selectedTableId);

  // מציגים רק אם זה השולחן שנבחר
  if (!table || selectedTableId !== table.id) return null;

  const x = Number(table.x);
  const y = Number(table.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // מיקום הכפתור ביחס לשולחן
  let offsetY = -90;
  let offsetX = 70;

  if (table.type === "square") {
    offsetY = -90;
    offsetX = 70;
  }

  if (table.type === "banquet") {
    offsetY = -60;
    offsetX = 120;
  }

  const handleDelete = (e) => {
    e.cancelBubble = true;

    // אופציונלי – הגנה ממחיקה בטעות
    if (!confirm("למחוק את השולחן?")) return;

    deleteTable(table.id);
  };

  return (
    <Group
      x={x + offsetX}
      y={y + offsetY}
      listening
      onClick={handleDelete}
      onTap={handleDelete}
    >
      <Circle
        radius={12}
        fill="#ef4444"
        shadowBlur={6}
      />
      <Text
        text="✕"
        width={24}
        height={24}
        offsetX={12}
        offsetY={12}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontSize={16}
        fontStyle="bold"
      />
    </Group>
  );
}
