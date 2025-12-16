"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ===================== GRID SNAP ===================== */
export const GRID_SIZE = 30;
export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}
export function snapPosition(pos) {
  return { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
}

/* ===================== SEATS ===================== */
function getSeatCoordinates(table) {
  const seats = table.seats || 0;
  const seatGap = 26;
  const seatRadius = 10;
  const result = [];

  if (table.type === "round") {
    const radius = 50 + Math.sqrt(seats) * 7;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({
        x: Math.cos(angle) * (radius + seatRadius + 6),
        y: Math.sin(angle) * (radius + seatRadius + 6),
      });
    }
    table._dynamicRadius = radius;
  }

  if (table.type === "square") {
    const base = 80 + seats * 1.5;
    const half = base / 2 + seatRadius + 6;
    const perSide = Math.floor(seats / 4);
    const remainder = seats % 4;
    const sides = [perSide, perSide, perSide, perSide];
    for (let i = 0; i < remainder; i++) sides[i]++;

    for (let i = 0; i < sides[0]; i++)
      result.push({ x: -((sides[0] - 1) * seatGap) / 2 + i * seatGap, y: -half });
    for (let i = 0; i < sides[1]; i++)
      result.push({ x: half, y: -((sides[1] - 1) * seatGap) / 2 + i * seatGap });
    for (let i = 0; i < sides[2]; i++)
      result.push({ x: -((sides[2] - 1) * seatGap) / 2 + i * seatGap, y: half });
    for (let i = 0; i < sides[3]; i++)
      result.push({ x: -half, y: -((sides[3] - 1) * seatGap) / 2 + i * seatGap });

    table._dynamicSize = base;
  }

  if (table.type === "banquet") {
    const baseWidth = 160;
    const height = 60;
    const extra = Math.max(0, seats - 8) * 10;
    const width = baseWidth + extra;
    const perSide = Math.ceil(seats / 2);
    const sideY = height / 2 + seatRadius + 6;

    for (let i = 0; i < perSide; i++) {
      const x = -width / 2 + (i + 0.5) * seatGap;
      result.push({ x, y: -sideY });
    }
    for (let i = 0; i < seats - perSide; i++) {
      const x = -width / 2 + (i + 0.5) * seatGap;
      result.push({ x, y: sideY });
    }

    table._dynamicWidth = width;
    table._dynamicHeight = height;
  }

  return result;
}

/* ===================== TABLE ===================== */
export default function TableRenderer({ table }) {
  const tableRef = useRef(null);
  const guests = useSeatingStore((s) => s.guests);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeTable = useSeatingStore((s) => s.removeTable);

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

  const seatsCoords = getSeatCoordinates(table);

  const handleDragMove = (e) => {
    const pos = snapPosition(e.target.position());
    e.target.position(pos);
  };

  const updateInStore = () => {
    const pos = tableRef.current.position();
    const rotation = tableRef.current.rotation();
    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id ? { ...t, x: pos.x, y: pos.y, rotation } : t
      ),
    }));
  };

  const handleDrop = (e) => {
    e.cancelBubble = true;
    if (draggingGuest)
      assignGuestBlock({ guestId: draggingGuest.id, tableId: table.id });
  };

  const handleDelete = (e) => {
    e.cancelBubble = true;
    removeTable(table.id);
  };

  const handleRotate = (e) => {
    e.cancelBubble = true;
    if (tableRef.current) {
      const newRotation = (tableRef.current.rotation() + 15) % 360;
      tableRef.current.rotation(newRotation);
      updateInStore();
    }
  };

  const handleClick = (e) => {
    e.cancelBubble = true;
    if (!draggingGuest && typeof table.openAddGuestModal === "function")
      table.openAddGuestModal();
  };

  const size = table._dynamicSize || 150;
  const width = table._dynamicWidth || 200;
  const height = table._dynamicHeight || 60;
  const radius = table._dynamicRadius || 60;
  const occupiedCount = assigned.length;

  const deleteX = (table.type === "round" ? radius : width / 2) - 10;
  const deleteY = (table.type === "round" ? -radius : -height / 2) - 10;
  const rotateX = deleteX - 30;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable
      onDragMove={handleDragMove}
      onDragEnd={updateInStore}
      onClick={handleClick}
      onMouseUpCapture={handleDrop}
    >
      {/* ROUND */}
      {table.type === "round" && (
        <>
          <Circle radius={radius} fill="#3b82f6" shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
            fill="#fff"
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
            fill="#3b82f6"
            cornerRadius={10}
            shadowBlur={8}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
            fill="#fff"
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
            fill="#3b82f6"
            cornerRadius={12}
            shadowBlur={8}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
            fill="#fff"
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
            <Circle radius={9} fill={guest ? "#d1d5db" : "#3b82f6"} />
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

      {/* 🔘 כפתורי מחיקה וסיבוב */}
      <Group>
        <Group x={deleteX} y={deleteY} onClick={handleDelete}>
          <Rect width={22} height={22} fill="#ef4444" cornerRadius={5} />
          <Text
            text="🗑️"
            fontSize={12}
            width={22}
            height={22}
            align="center"
            verticalAlign="middle"
          />
        </Group>

        <Group x={rotateX} y={deleteY} onClick={handleRotate}>
          <Rect width={22} height={22} fill="#eab308" cornerRadius={5} />
          <Text
            text="⟳"
            fontSize={12}
            width={22}
            height={22}
            align="center"
            verticalAlign="middle"
          />
        </Group>
      </Group>
    </Group>
  );
}
