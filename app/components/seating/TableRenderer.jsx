"use client";

import { useRef, useMemo, useState } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   GRID SNAP
============================================================ */
export const GRID_SIZE = 30;
export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}
export function snapPosition(pos) {
  return {
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y),
  };
}

/* ============================================================
   כיסאות סביב השולחן
============================================================ */
function getTightSeatCoordinates(table) {
  const seats = table.seats || 0;
  const result = [];
  const seatRadius = 10;
  const seatGap = 26;

  /* ===== ROUND ===== */
  if (table.type === "round") {
    const baseRadius = 40;
    const radius = baseRadius + Math.sqrt(seats) * 7;
    const seatDistance = radius + seatRadius + 10;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({
        x: Math.cos(angle) * seatDistance,
        y: Math.sin(angle) * seatDistance,
      });
    }

    table._dynamicRadius = radius;
  }

  /* ===== SQUARE ===== */
  if (table.type === "square") {
    const baseSize = 80;
    const growthPerSeat = 1.5;
    const size = baseSize + seats * growthPerSeat;
    const half = size / 2 + seatRadius + 6;

    const perSide = Math.floor(seats / 4);
    const remainder = seats % 4;
    const sides = [perSide, perSide, perSide, perSide];
    for (let i = 0; i < remainder; i++) sides[i]++;

    // עליון
    for (let i = 0; i < sides[0]; i++) {
      const offset = -((sides[0] - 1) * seatGap) / 2 + i * seatGap;
      result.push({ x: offset, y: -half });
    }
    // ימין
    for (let i = 0; i < sides[1]; i++) {
      const offset = -((sides[1] - 1) * seatGap) / 2 + i * seatGap;
      result.push({ x: half, y: offset });
    }
    // תחתון
    for (let i = 0; i < sides[2]; i++) {
      const offset = -((sides[2] - 1) * seatGap) / 2 + i * seatGap;
      result.push({ x: offset, y: half });
    }
    // שמאל
    for (let i = 0; i < sides[3]; i++) {
      const offset = -((sides[3] - 1) * seatGap) / 2 + i * seatGap;
      result.push({ x: -half, y: offset });
    }

    table._dynamicSize = size;
  }

  /* ===== BANQUET (אבירים) ===== */
  if (table.type === "banquet") {
    const baseWidth = 140;
    const height = 90;

    const topCount = Math.ceil(seats / 2);
    const bottomCount = Math.floor(seats / 2);
    const maxSide = Math.max(topCount, bottomCount);
    const totalWidth = baseWidth + (maxSide - 2) * seatGap;

    const sideY = height / 2 + seatRadius + 6;

    // עליון
    for (let i = 0; i < topCount; i++) {
      const x = -totalWidth / 2 + (i + 0.5) * seatGap;
      result.push({ x, y: -sideY });
    }

    // תחתון
    for (let i = 0; i < bottomCount; i++) {
      const x = -totalWidth / 2 + (i + 0.5) * seatGap;
      result.push({ x, y: sideY });
    }

    table._dynamicWidth = totalWidth;
    table._dynamicHeight = height;
  }

  return result;
}

/* ============================================================
   TABLE RENDERER
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
  const hasSelectedGuestInThisTable = assigned.some(
    (s) => String(s.guestId) === String(selectedGuestId)
  );

  const isHighlighted =
    highlightedTable === table.id || hasSelectedGuestInThisTable;

  const tableFill = isHighlighted ? "#fde047" : "#3b82f6";
  const tableText = isHighlighted ? "#713f12" : "white";

  const seatsCoords = getTightSeatCoordinates(table);

  /* SNAP & ROTATE */
  const handleDragMove = (e) => {
    if (isRotating) return;
    const pos = e.target.position();
    e.target.position(snapPosition(pos));
  };

  const updatePositionInStore = () => {
    if (!tableRef.current) return;
    const pos = tableRef.current.position();
    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id
          ? {
              ...t,
              x: pos.x,
              y: pos.y,
              rotation: tableRef.current.rotation(),
            }
          : t
      ),
    }));
  };

  const handleMouseDown = (e) => {
    if (e.evt.shiftKey) setIsRotating(true);
  };
  const handleMouseUp = () => {
    if (isRotating) {
      setIsRotating(false);
      updatePositionInStore();
    }
  };
  const handleMouseMove = (e) => {
    if (!isRotating) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer || !tableRef.current) return;
    const dx = pointer.x - table.x;
    const dy = pointer.y - table.y;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    angle = Math.round(angle / 15) * 15;
    tableRef.current.rotation(angle);
    tableRef.current.getLayer().batchDraw();
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

  const size = table._dynamicSize || 160;
  const width = table._dynamicWidth || 240;
  const height = table._dynamicHeight || 90;
  const radius = table._dynamicRadius || 60;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable
      onDragMove={handleDragMove}
      onDragEnd={updatePositionInStore}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseUpCapture={handleDrop}
    >
      {/* ROUND */}
      {table.type === "round" && (
        <>
          <Circle radius={radius} fill={tableFill} shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill={tableText}
            align="center"
            verticalAlign="middle"
            width={radius * 2}
            height={radius * 2}
            offsetX={radius}
            offsetY={radius}
          />
        </>
      )}

      {/* SQUARE */}
      {table.type === "square" && (
        <>
          <Rect
            width={size}
            height={size}
            offsetX={size / 2}
            offsetY={size / 2}
            fill={tableFill}
            shadowBlur={8}
            cornerRadius={10}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill={tableText}
            align="center"
            verticalAlign="middle"
            width={size}
            height={size}
            offsetX={size / 2}
            offsetY={size / 2}
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
            fill={tableFill}
            shadowBlur={8}
            cornerRadius={12}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill={tableText}
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
                fontSize={11}
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
