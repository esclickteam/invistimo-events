"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סימטרי ודינמי לכל סוג שולחן
============================================================ */
function getDynamicSeatCoordinates(table) {
  const seats = Math.max(0, Number(table.seats || 0));
  const result = [];
  if (!seats) {
    // ערכי ברירת מחדל כדי לא לשבור גדלים
    if (table.type === "round") table._radius = table._radius || 60;
    if (table.type === "square") table._size = table._size || 160;
    if (table.type === "banquet") {
      table._width = table._width || 240;
      table._height = table._height || 80;
    }
    return result;
  }

  const SEAT_R = 9;
  const SEAT_GAP = 16; // מרחק "נעים" בין מרכזי כיסאות
  const SEAT_OFFSET = 14; // כמה הכיסא בחוץ מהשולחן

  // חלוקה מאוזנת של כיסאות לכל צד (למרובע)
  const splitToSides = (n) => {
    const base = Math.floor(n / 4);
    let rem = n % 4;
    const sides = [base, base, base, base]; // top,right,bottom,left
    for (let i = 0; i < 4 && rem > 0; i++, rem--) sides[i] += 1;
    return sides;
  };

  // ⭕ ROUND — כיסאות במעגל סימטרי + רדיוס שולחן לפי היקף דרוש
  if (table.type === "round") {
    // היקף דרוש כדי שהכיסאות לא ידחסו
    const requiredCirc = seats * (SEAT_R * 2 + SEAT_GAP);
    const ringRadius = Math.max(46, requiredCirc / (2 * Math.PI)); // רדיוס למרכזי הכיסאות
    const tableRadius = Math.max(40, ringRadius - (SEAT_R + SEAT_OFFSET));

    const finalRing = tableRadius + SEAT_R + SEAT_OFFSET;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({
        x: Math.cos(angle) * finalRing,
        y: Math.sin(angle) * finalRing,
      });
    }

    table._radius = tableRadius;
  }

  // ⬜ SQUARE — כיסאות סביב 4 צדדים, כל צד ממורכז, גודל שולחן לפי הצד הארוך
  if (table.type === "square") {
    const [topC, rightC, bottomC, leftC] = splitToSides(seats);
    const maxSide = Math.max(topC, rightC, bottomC, leftC);

    // אורך צד לפי כמות מקסימלית על צד (כדי שזה באמת יגדל)
    const minSize = 120;
    const innerPadding = 40; // שטח "נשימה" לשם/טקסט
    const size = Math.max(minSize, innerPadding + (maxSide - 1) * (SEAT_R * 2 + SEAT_GAP) + 40);
    const half = size / 2;

    const placeLine = (count, fixed, axis) => {
      if (count <= 0) return;
      if (count === 1) {
        result.push(axis === "x" ? { x: 0, y: fixed } : { x: fixed, y: 0 });
        return;
      }
      const step = (SEAT_R * 2 + SEAT_GAP);
      const span = (count - 1) * step;
      const start = -span / 2;

      for (let i = 0; i < count; i++) {
        const v = start + i * step;
        result.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
      }
    };

    // למעלה/למטה: x משתנה, y קבוע
    placeLine(topC, -(half + SEAT_OFFSET), "x");
    placeLine(bottomC, +(half + SEAT_OFFSET), "x");

    // ימין/שמאל: y משתנה, x קבוע
    placeLine(rightC, +(half + SEAT_OFFSET), "y");
    placeLine(leftC, -(half + SEAT_OFFSET), "y");

    table._size = size;
  }

  // 🍽️ BANQUET (אבירים) — כיסאות רק בשני צדדים (עליון/תחתון), סימטריים וממורכזים
  if (table.type === "banquet") {
    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;
    const maxRow = Math.max(topCount, bottomCount);

    const minW = 180;
    const step = (SEAT_R * 2 + SEAT_GAP);
    const width = Math.max(minW, 80 + (maxRow - 1) * step + 60);

    // גובה יכול לגדול טיפה לפי כמות (אסתטי), אבל נשאר יציב
    const height = Math.max(70, 60 + Math.min(60, seats * 1.2));
    const halfW = width / 2;
    const halfH = height / 2;

    const placeRow = (count, yFixed) => {
      if (count <= 0) return;
      if (count === 1) {
        result.push({ x: 0, y: yFixed });
        return;
      }
      const span = (count - 1) * step;
      const start = -span / 2;
      for (let i = 0; i < count; i++) {
        result.push({ x: start + i * step, y: yFixed });
      }
    };

    // יושבים מעל ומתחת לשולחן (כמו אבירים)
    placeRow(topCount, -(halfH + SEAT_OFFSET));
    placeRow(bottomCount, +(halfH + SEAT_OFFSET));

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

  const tableFill = isHighlighted ? "#fde047" : "#3b82f6";
  const tableText = isHighlighted ? "#713f12" : "white";

  const seatsCoords = getDynamicSeatCoordinates(table);

  /* עדכון מיקום */
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

  /* גדלים דינמיים */
  const size = table._size || 160;
  const width = table._width || 240;
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
