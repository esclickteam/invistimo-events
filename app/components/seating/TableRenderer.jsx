"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב דינמי: גם מידות שולחן וגם מיקומי כיסאות (בלי לשנות את table!)
============================================================ */
function getTableLayout(rawTable) {
  const seats = Math.max(0, Number(rawTable.seats || 0));
  const result = [];

  // תמיכה בשמות type נוספים אם קיימים אצלך
  const type =
    rawTable.type === "rectangle" || rawTable.type === "rect"
      ? "banquet"
      : rawTable.type;

  // קבועים
  const SEAT_R = 9;
  const SEAT_GAP = 16; // רווח בין כיסאות
  const OUTSIDE = 14; // כמה הכיסא בחוץ מהשולחן
  const STEP = SEAT_R * 2 + SEAT_GAP;

  // ברירות מחדל
  const dims = {
    size: 160,
    width: 240,
    height: 80,
    radius: 60,
  };

  if (!seats) {
    return { coords: result, ...dims, type };
  }

  // חלוקה מאוזנת למרובע
  const splitToSides = (n) => {
    const base = Math.floor(n / 4);
    let rem = n % 4;
    const sides = [base, base, base, base]; // top,right,bottom,left
    for (let i = 0; i < 4 && rem > 0; i++, rem--) sides[i] += 1;
    return sides;
  };

  const placeLineCentered = (count, fixed, axis) => {
    if (count <= 0) return;
    if (count === 1) {
      result.push(axis === "x" ? { x: 0, y: fixed } : { x: fixed, y: 0 });
      return;
    }
    const span = (count - 1) * STEP;
    const start = -span / 2;
    for (let i = 0; i < count; i++) {
      const v = start + i * STEP;
      result.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
    }
  };

  // ⭕ ROUND
  if (type === "round") {
    // רדיוס מושבי הכיסאות לפי היקף, כדי שלא יזוזו “לא קשור”
    const requiredCirc = seats * STEP;
    const seatRing = Math.max(55, requiredCirc / (2 * Math.PI));
    const tableRadius = Math.max(40, seatRing - (SEAT_R + OUTSIDE));
    const ring = tableRadius + SEAT_R + OUTSIDE;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({ x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
    }

    dims.radius = tableRadius;
    return { coords: result, ...dims, type };
  }

  // ⬜ SQUARE
  if (type === "square") {
    const [topC, rightC, bottomC, leftC] = splitToSides(seats);
    const maxSide = Math.max(topC, rightC, bottomC, leftC);

    // גודל שולחן אמיתי לפי הצד העמוס ביותר
    const minSize = 140;
    const size = Math.max(minSize, 110 + (maxSide - 1) * STEP); // <- זה יגדל מורגש
    const half = size / 2;

    const fixed = half + SEAT_R + OUTSIDE; // כדי שהכיסא יהיה מחוץ לשולחן אבל צמוד וסימטרי

    // top/bottom
    placeLineCentered(topC, -fixed, "x");
    placeLineCentered(bottomC, +fixed, "x");
    // right/left
    placeLineCentered(rightC, +fixed, "y");
    placeLineCentered(leftC, -fixed, "y");

    dims.size = size;
    return { coords: result, ...dims, type };
  }

  // 🍽️ BANQUET
  if (type === "banquet") {
    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;
    const maxRow = Math.max(topCount, bottomCount);

    // רוחב שולחן אמיתי לפי מקסימום כיסאות בשורה
    const minW = 220;
    const width = Math.max(minW, 140 + (maxRow - 1) * STEP); // <- יגדל ברור
    const height = 75; // שומר על מראה אבירים
    const yFixed = height / 2 + SEAT_R + OUTSIDE;

    // שורות ממורכזות סביב 0
    const placeRow = (count, y) => {
      if (count <= 0) return;
      if (count === 1) {
        result.push({ x: 0, y });
        return;
      }
      const span = (count - 1) * STEP;
      const start = -span / 2;
      for (let i = 0; i < count; i++) {
        result.push({ x: start + i * STEP, y });
      }
    };

    placeRow(topCount, -yFixed);
    placeRow(bottomCount, +yFixed);

    dims.width = width;
    dims.height = height;
    return { coords: result, ...dims, type };
  }

  // אם type לא מזוהה – אל תשבור
  return { coords: result, ...dims, type };
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

  // ✅ מחשבים layout בצורה “טהורה” — ככה זה תמיד יעבוד
  const layout = useMemo(
    () => getTableLayout(table),
    [table.type, table.seats]
  );

  const seatsCoords = layout.coords;

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

  const size = layout.size;
  const width = layout.width;
  const height = layout.height;
  const radius = layout.radius;

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
      {layout.type === "round" && (
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
      {layout.type === "square" && (
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
      {layout.type === "banquet" && (
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
