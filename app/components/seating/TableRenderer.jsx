"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סביב השולחן
============================================================ */
function getTightSeatCoordinates(table) {
  const seats = table.seats || 0;
  const result = [];

  /* ========= ROUND ========= */
  if (table.type === "round") {
    const baseRadius = 60;
    const seatRadius = 10;
    const radius = baseRadius + seatRadius + 6 + (seats > 10 ? (seats - 10) * 2 : 0);

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
  }

  /* ========= SQUARE ========= */
  if (table.type === "square") {
    // שינוי גודל בהתאם לכמות אורחים
    const baseSize = 160;
    const size = baseSize + Math.max(0, seats - 8) * 8; // כל כיסא מעבר ל-8 מגדיל
    const seatGap = 22;
    const half = size / 2 + 12;

    const base = Math.floor(seats / 4);
    const remainder = seats % 4;
    const sides = [base, base, base, base];

    if (remainder === 1) sides[0]++;
    else if (remainder === 2) {
      sides[0]++;
      sides[2]++;
    } else if (remainder === 3) {
      sides[0]++;
      sides[1]++;
      sides[2]++;
    }

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

    table._dynamicSize = size; // נשמור לשימוש בציור
  }

  /* ========= BANQUET ========= */
  if (table.type === "banquet") {
    const baseWidth = 240;
    const width = baseWidth + Math.max(0, seats - 12) * 10;
    const seatGap = 22;
    const sideY = 59;
    const perSide = Math.floor(seats / 2);

    for (let i = 0; i < perSide; i++)
      result.push({
        x: -width / 2 + 20 + i * seatGap,
        y: -sideY,
      });

    for (let i = 0; i < seats - perSide; i++)
      result.push({
        x: -width / 2 + 20 + i * seatGap,
        y: sideY,
      });

    table._dynamicWidth = width;
  }

  return result;
}

/* ============================================================
   TableRenderer
============================================================ */
export default function TableRenderer({ table }) {
  const tableRef = useRef(null);
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

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable
      onDragMove={updatePositionInStore}
      onDragEnd={updatePositionInStore}
      onMouseUp={handleDrop}
      onClick={handleClick}
    >
      {/* ROUND */}
      {table.type === "round" && (
        <>
          <Circle radius={60 + Math.max(0, table.seats - 10) * 2} fill={tableFill} shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill={tableText}
            align="center"
            verticalAlign="middle"
            width={140}
            height={140}
            offsetX={70}
            offsetY={70}
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
            height={90}
            offsetX={width / 2}
            offsetY={45}
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
            height={90}
            offsetX={width / 2}
            offsetY={45}
          />
        </>
      )}

      {/* SEATS */}
      {seatsCoords.map((c, i) => {
        const guest = seatToGuestMap.get(i);
        return (
          <Group key={i} x={c.x} y={c.y}>
            <Circle
              radius={10}
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
