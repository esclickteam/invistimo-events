"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סימטרי ודינמי לכל סוג שולחן
============================================================ */
function getDynamicSeatCoordinates(table) {
  const seats = table.seats || 0;
  const result = [];

  // ⭕ ROUND
  if (table.type === "round") {
    // רדיוס משתנה לפי מספר האורחים
    const tableRadius = Math.max(40, 35 + seats * 2.2);
    const seatRadius = 10;
    const radius = tableRadius + seatRadius + 10;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    table._radius = tableRadius;
  }

  // ⬜ SQUARE
  if (table.type === "square") {
    // הגודל משתנה לפי כמות האורחים
    const perSide = Math.max(1, Math.ceil(seats / 4));
    const seatGap = 26;
    const size = Math.max(80, perSide * seatGap + 60);
    const half = size / 2 + 16;
    let i = 0;

    // למעלה
    for (; i < perSide && i < seats; i++)
      result.push({ x: -half + i * seatGap, y: -half });

    // ימין
    for (; i < perSide * 2 && i < seats; i++)
      result.push({ x: half, y: -half + (i - perSide) * seatGap });

    // למטה
    for (; i < perSide * 3 && i < seats; i++)
      result.push({
        x: half - (i - perSide * 2) * seatGap,
        y: half,
      });

    // שמאל
    for (; i < seats; i++)
      result.push({
        x: -half,
        y: half - (i - perSide * 3) * seatGap,
      });

    table._size = size;
  }

  // 🍽️ BANQUET (אבירים)
  if (table.type === "banquet") {
    const perSide = Math.ceil(seats / 2);
    const seatGap = 26;
    const width = Math.max(140, perSide * seatGap + 80);
    const height = 70;
    const offsetX = -width / 2 + seatGap / 2;
    const sideY = height / 2 + 16;

    // עליון
    for (let i = 0; i < perSide; i++) {
      result.push({ x: offsetX + i * seatGap, y: -sideY });
    }

    // תחתון
    for (let i = 0; i < seats - perSide; i++) {
      result.push({ x: offsetX + i * seatGap, y: sideY });
    }

    table._width = width;
    table._height = height;
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
        (guest) =>
          String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (g) map.set(s.seatIndex, g);
    });
    return map;
  }, [assigned, guests]);

  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;
  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId));

  const tableFill = isHighlighted ? "#fde047" : "#3b82f6";
  const tableText = isHighlighted ? "#713f12" : "white";

  const seatsCoords = getDynamicSeatCoordinates(table);

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

  const handleDrop = (e) => {
    e.cancelBubble = true;
    if (draggingGuest)
      assignGuestBlock({
        guestId: draggingGuest.id,
        tableId: table.id,
      });
  };

  const handleClick = (e) => {
    e.cancelBubble = true;
    if (!draggingGuest && typeof table.openAddGuestModal === "function") {
      table.openAddGuestModal();
    }
  };

  // גדלים דינמיים לפי סוג שולחן
  const size = table._size || 140;
  const width = table._width || 200;
  const height = table._height || 80;
  const radius = table._radius || 60;

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
      {/* שולחן עגול */}
      {table.type === "round" && (
        <>
          <Circle radius={radius} fill={tableFill} shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={16}
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

      {/* שולחן מרובע */}
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
            fontSize={16}
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

      {/* שולחן אבירים */}
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
            fontSize={16}
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

      {/* כסאות */}
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
