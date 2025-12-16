"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב דינמי: מידות שולחן + מיקומי כיסאות (פרופורציונלי וסימטרי)
============================================================ */
function getTableLayout(rawTable) {
  const seats = Math.max(0, Number(rawTable.seats || 0));

  const type =
    rawTable.type === "rectangle" || rawTable.type === "rect"
      ? "banquet"
      : rawTable.type;

  // ✅ כיוונון פרופורציות (הכי משפיע על "לא פרופורציונלי")
  const SEAT_R = 9;
  const SEAT_GAP = 8;      // היה גדול מדי
  const OUTSIDE = 10;      // מרחק הכיסא מהשולחן
  const STEP = SEAT_R * 2 + SEAT_GAP;

  // padding קטן כדי שהשולחן לא יתנפח
  const PAD = SEAT_R + OUTSIDE + 10;

  const coords = [];
  const dims = {
    size: 150,
    width: 240,
    height: 75,
    radius: 55,
  };

  if (!seats) return { coords, ...dims, type };

  // ✅ מרובע: צדדים נגדיים זהים (top=bottom, left=right)
  // לדוגמה 10 => 3+2+3+2
  const splitSquareOpposite = (n) => {
    // אם n אי-זוגי אי אפשר סימטריה מלאה במרובע.
    // נשמור הכי קרוב: זוגות סימטריים + "עודף" אחד למעלה באמצע.
    const hasExtra = n % 2 === 1;
    const even = hasExtra ? n - 1 : n;

    const pairs = even / 2; // כל pair = כיסא למעלה + כיסא למטה (או שמאל+ימין)
    const horizontalPairs = Math.ceil(pairs / 2); // ייתן 10=>5pairs =>3
    const verticalPairs = Math.floor(pairs / 2);  // ו-2

    const top = horizontalPairs + (hasExtra ? 1 : 0);
    const bottom = horizontalPairs;
    const left = verticalPairs;
    const right = verticalPairs;

    return { top, right, bottom, left, hasExtra };
  };

  const placeLineCentered = (count, fixed, axis) => {
    if (count <= 0) return;
    if (count === 1) {
      coords.push(axis === "x" ? { x: 0, y: fixed } : { x: fixed, y: 0 });
      return;
    }
    const span = (count - 1) * STEP;
    const start = -span / 2;
    for (let i = 0; i < count; i++) {
      const v = start + i * STEP;
      coords.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
    }
  };

  // ⭕ ROUND — פרופורציונלי: הטבלה לא מתנפחת, רק מספיק כדי להכיל את הכיסאות
  if (type === "round") {
    const requiredCirc = seats * STEP;
    const seatRing = Math.max(42, requiredCirc / (2 * Math.PI)); // רדיוס למרכזי הכיסאות
    const tableRadius = Math.max(38, seatRing - (SEAT_R + OUTSIDE));
    const ring = tableRadius + SEAT_R + OUTSIDE;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      coords.push({ x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
    }

    dims.radius = tableRadius;
    return { coords, ...dims, type };
  }

  // ⬜ SQUARE — פרופורציונלי + צדדים נגדיים זהים
  if (type === "square") {
    const { top, right, bottom, left, hasExtra } = splitSquareOpposite(seats);
    const maxSide = Math.max(top, right, bottom, left);

    // גודל שולחן: מתאים לספאן של הצד העמוס ביותר + padding קטן
    const span = maxSide <= 1 ? 0 : (maxSide - 1) * STEP;
    const minSize = 120;
    const size = Math.max(minSize, span + PAD * 2);

    const half = size / 2;
    const fixed = half + SEAT_R + OUTSIDE;

    // למעלה/למטה
    placeLineCentered(top, -fixed, "x");
    placeLineCentered(bottom, +fixed, "x");

    // ימין/שמאל
    placeLineCentered(right, +fixed, "y");
    placeLineCentered(left, -fixed, "y");

    // אם היה אי-זוגי: שמנו את העודף למעלה באמצע (כבר נכלל ב-top),
    // וזה הכי "הגיוני" ויזואלית.
    dims.size = size;
    return { coords, ...dims, type };
  }

  // 🍽️ BANQUET — פרופורציונלי: רוחב נקבע לפי שורה עמוסה, בלי "בסיס ענק"
  if (type === "banquet") {
    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;
    const maxRow = Math.max(topCount, bottomCount);

    const span = maxRow <= 1 ? 0 : (maxRow - 1) * STEP;

    const minW = 200;
    const width = Math.max(minW, span + PAD * 2);
    const height = 70;

    const yFixed = height / 2 + SEAT_R + OUTSIDE;

    const placeRow = (count, y) => {
      if (count <= 0) return;
      if (count === 1) {
        coords.push({ x: 0, y });
        return;
      }
      const rowSpan = (count - 1) * STEP;
      const start = -rowSpan / 2;
      for (let i = 0; i < count; i++) {
        coords.push({ x: start + i * STEP, y });
      }
    };

    placeRow(topCount, -yFixed);
    placeRow(bottomCount, +yFixed);

    dims.width = width;
    dims.height = height;
    return { coords, ...dims, type };
  }

  return { coords, ...dims, type };
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
