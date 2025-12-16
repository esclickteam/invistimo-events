"use client";

import { useRef, useMemo, useState } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   GRIDS + SNAP
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
   חישוב כיסאות סביב השולחן – פרופורציונלי ואסתטי
============================================================ */
function getTightSeatCoordinates(table) {
  const seats = table.seats || 0;
  const result = [];

  const seatGap = 24; // מרווח נוח בין כיסאות
  const seatRadius = 10;

  /* ========= ROUND ========= */
  if (table.type === "round") {
    const baseRadius = 40;
    const radius = baseRadius + seats * 1.6; // גדל בהדרגה
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

  /* ========= SQUARE ========= */
  if (table.type === "square") {
    const baseSize = 100;
    const growthPerSeat = 2.2; // גידול עדין
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

  /* ========= BANQUET ========= */
  if (table.type === "banquet") {
    const baseWidth = 160;
    const height = 70;
    const width = baseWidth + seats * 4;
    const perSide = Math.floor(seats / 2);
    const sideY = height / 2 + seatRadius + 4;

    for (let i = 0; i < perSide; i++) {
      const x = -width / 2 + 30 + i * seatGap;
      result.push({ x, y: -sideY });
    }
    for (let i = 0; i < seats - perSide; i++) {
      const x = -width / 2 + 30 + i * seatGap;
      result.push({ x, y: sideY });
    }

    table._dynamicWidth = width;
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

  /* ============================================================
     SNAP DRAG & ROTATE
  ============================================================ */
  const handleDragMove = (e) => {
    if (isRotating) return;
    const pos = e.target.position();
    const snapped = snapPosition(pos);
    e.target.position(snapped);
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

  /* ============================================================
     ROTATE WITH SHIFT + DRAG
  ============================================================ */
  const handleMouseDown = (e) => {
    if (e.evt.shiftKey) {
      setIsRotating(true);
    }
  };

  const handleMouseUp = (e) => {
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
    angle = Math.round(angle / 15) * 15; // Snap כל 15 מעלות
    tableRef.current.rotation(angle);
    tableRef.current.getLayer().batchDraw();
  };

  /* ============================================================
     CLICK / DROP HANDLERS
  ============================================================ */
  const handleDrop = (e) => {
    e.cancelBubble = true;
    if (!draggingGuest) return;
    assignGuestBlock({ guestId: draggingGuest.id, tableId: table.id });
  };

  const handleClick = (e) => {
    e.cancelBubble = true;
    if (draggingGuest) return;
    if (typeof table.openAddGuestModal === "function")
      table.openAddGuestModal();
  };

  const size = table._dynamicSize || 160;
  const width = table._dynamicWidth || 240;
  const radius = table._dynamicRadius || 60;

  /* ============================================================
     RENDER
  ============================================================ */
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
      onMouseLeave={() => setIsRotating(false)}
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
            height={70}
            offsetX={width / 2}
            offsetY={35}
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
            width={width}
            height={70}
            offsetX={width / 2}
            offsetY={35}
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
