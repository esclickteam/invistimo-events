"use client";

import { useRef, useMemo, useState } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סביב השולחן
============================================================ */
function getSeatCoordinates(table) {
  const seats = table.seats || 0;
  const result = [];
  const seatRadius = 10;
  const seatGap = 26;

  // ROUND
  if (table.type === "round") {
    const baseRadius = 60;
    const radius = baseRadius;
    const seatDistance = radius + seatRadius + 6;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({ x: Math.cos(angle) * seatDistance, y: Math.sin(angle) * seatDistance });
    }
  }

  // SQUARE
  if (table.type === "square") {
    const size = 160;
    const half = size / 2 + 12;
    const perSide = Math.ceil(seats / 4);
    const seatGap = 26;
    let i = 0;

    for (; i < perSide && i < seats; i++) result.push({ x: -half + i * seatGap, y: -half });
    for (; i < perSide * 2 && i < seats; i++)
      result.push({ x: half, y: -half + (i - perSide) * seatGap });
    for (; i < perSide * 3 && i < seats; i++)
      result.push({ x: half - (i - perSide * 2) * seatGap, y: half });
    for (; i < seats; i++)
      result.push({ x: -half, y: half - (i - perSide * 3) * seatGap });
  }

  // BANQUET (אבירים)
  if (table.type === "banquet") {
    const baseWidth = 180;
    const height = 80;
    const seatGap = 26;
    const perSide = Math.ceil(seats / 2);
    const width = Math.max(baseWidth, (seats / 2) * seatGap + 60);
    const sideY = height / 2 + 18;

    for (let i = 0; i < perSide; i++)
      result.push({ x: -width / 2 + 30 + i * seatGap, y: -sideY });

    for (let i = 0; i < seats - perSide; i++)
      result.push({ x: -width / 2 + 30 + i * seatGap, y: sideY });

    table._dynamicWidth = width;
    table._dynamicHeight = height;
  }

  return result;
}

/* ============================================================
   TableRenderer Component
============================================================ */
export default function TableRenderer({ table }) {
  const tableRef = useRef(null);
  const [isRotating, setIsRotating] = useState(false);

  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);

  const assigned = table.seatedGuests || [];

  const seatToGuestMap = useMemo(() => {
    const map = new Map();
    assigned.forEach((s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (g) map.set(s.seatIndex, g);
    });
    return map;
  }, [assigned, guests]);

  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;
  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId));

  const fill = isHighlighted ? "#fde047" : "#3b82f6";
  const textColor = isHighlighted ? "#713f12" : "#fff";

  const seatsCoords = getSeatCoordinates(table);

  /* שמירת מיקום */
  const updatePositionInStore = () => {
    if (!tableRef.current) return;
    const pos = tableRef.current.position();
    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id
          ? { ...t, x: pos.x, y: pos.y, rotation: tableRef.current.rotation() }
          : t
      ),
    }));
  };

  /* סיבוב חלק (Shift + גרירה) */
  const handleMouseDown = (e) => {
    if (e.evt.shiftKey) setIsRotating(true);
  };
  const handleMouseMove = (e) => {
    if (!isRotating) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const dx = pointer.x - table.x;
    const dy = pointer.y - table.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    tableRef.current.rotation(angle);
    tableRef.current.getLayer().batchDraw();
  };
  const handleMouseUp = () => {
    if (isRotating) {
      setIsRotating(false);
      updatePositionInStore();
    }
  };

  const handleDrop = (e) => {
    e.cancelBubble = true;
    if (draggingGuest)
      assignGuestBlock({ guestId: draggingGuest.id, tableId: table.id });
  };

  const handleClick = (e) => {
    e.cancelBubble = true;
    if (!draggingGuest && typeof table.openAddGuestModal === "function")
      table.openAddGuestModal();
  };

  const width = table._dynamicWidth || 240;
  const height = table._dynamicHeight || 90;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable
      onDragEnd={updatePositionInStore}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onMouseUpCapture={handleDrop}
    >
      {/* ROUND */}
      {table.type === "round" && (
        <>
          <Circle radius={60} fill={fill} shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
            fill={textColor}
            align="center"
            verticalAlign="middle"
            width={120}
            height={120}
            offsetX={60}
            offsetY={60}
          />
        </>
      )}

      {/* SQUARE */}
      {table.type === "square" && (
        <>
          <Rect
            width={160}
            height={160}
            offsetX={80}
            offsetY={80}
            fill={fill}
            shadowBlur={8}
            cornerRadius={10}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
            fill={textColor}
            align="center"
            verticalAlign="middle"
            width={160}
            height={160}
            offsetX={80}
            offsetY={80}
          />
        </>
      )}

      {/* BANQUET */}
      {table.type === "banquet" && (
        <>
          <Rect
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            fill={fill}
            shadowBlur={8}
            cornerRadius={12}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
            fill={textColor}
            align="center"
            verticalAlign="middle"
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
          />
        </>
      )}

      {/* SEATS */}
      {seatsCoords.map((c, i) => {
        const guest = seatToGuestMap.get(i);
        return (
          <Group key={i} x={c.x} y={c.y}>
            <Circle
              radius={9}
              fill={guest ? "#d1d5db" : "#3b82f6"}
              stroke="#2563eb"
            />
            {guest && (
              <Text
                text={guest.name}
                fontSize={10}
                y={14}
                width={90}
                offsetX={45}
                align="center"
                fill="#111827"
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}
