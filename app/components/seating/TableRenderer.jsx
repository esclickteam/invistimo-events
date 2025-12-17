"use client";

import { useRef, useMemo, useState } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב דינמי של צורת השולחן + כסאות (כמו קודם)
============================================================ */
function getTableLayout(rawTable) {
  const seats = Math.max(0, Number(rawTable.seats || 0));
  const type =
    rawTable.type === "rectangle" || rawTable.type === "rect"
      ? "banquet"
      : rawTable.type;

  const SEAT_R = 9;
  const SEAT_GAP = 8;
  const OUTSIDE = 10;
  const STEP = SEAT_R * 2 + SEAT_GAP;
  const PAD = SEAT_R + OUTSIDE + 10;
  const coords = [];
  const dims = {
    size: 150,
    width: 240,
    height: 75,
    radius: 55,
  };

  if (!seats) return { coords, ...dims, type };

  const splitSquareOpposite = (n) => {
    const hasExtra = n % 2 === 1;
    const even = hasExtra ? n - 1 : n;
    const pairs = even / 2;
    const horizontalPairs = Math.ceil(pairs / 2);
    const verticalPairs = Math.floor(pairs / 2);
    const top = horizontalPairs + (hasExtra ? 1 : 0);
    const bottom = horizontalPairs;
    const left = verticalPairs;
    const right = verticalPairs;
    return { top, right, bottom, left };
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

  if (type === "round") {
    const requiredCirc = seats * STEP;
    const seatRing = Math.max(42, requiredCirc / (2 * Math.PI));
    const tableRadius = Math.max(38, seatRing - (SEAT_R + OUTSIDE));
    const ring = tableRadius + SEAT_R + OUTSIDE;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      coords.push({ x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
    }
    dims.radius = tableRadius;
    return { coords, ...dims, type };
  }

  if (type === "square") {
    const { top, right, bottom, left } = splitSquareOpposite(seats);
    const maxSide = Math.max(top, right, bottom, left);
    const span = maxSide <= 1 ? 0 : (maxSide - 1) * STEP;
    const size = Math.max(120, span + PAD * 2);
    const half = size / 2;
    const fixed = half + SEAT_R + OUTSIDE;
    placeLineCentered(top, -fixed, "x");
    placeLineCentered(bottom, +fixed, "x");
    placeLineCentered(right, +fixed, "y");
    placeLineCentered(left, -fixed, "y");
    dims.size = size;
    return { coords, ...dims, type };
  }

  if (type === "banquet") {
    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;
    const maxRow = Math.max(topCount, bottomCount);
    const span = maxRow <= 1 ? 0 : (maxRow - 1) * STEP;
    const width = Math.max(200, span + PAD * 2);
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

  // ✅ רק זה נשאר state כדי לנעול drag בזמן סיבוב
  const [rotating, setRotating] = useState(false);

  // ✅ refs כדי שלא יהיה סטאטר/תקיעות (לא מרנדר כל פיקסל)
  const rotateActiveRef = useRef(false);
  const startAngleRef = useRef(0);
  const startRotationRadRef = useRef(0);

  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const selectedTableId = useSeatingStore((s) => s.selectedTableId);
  const deleteTable =
    useSeatingStore((s) => s.deleteTable) ||
    useSeatingStore((s) => s.removeTable) ||
    (() => {});

  const assigned = table.seatedGuests || [];

  // ✅ סופרים רק כיסאות שתפוסים בפועל (לא מכפילים לפי אישורי הגעה)
  const occupiedSeatsCount = useMemo(() => {
    const indices = new Set(assigned.map((s) => s.seatIndex));
    return indices.size;
  }, [assigned]);

  // guest info per seat
  const seatInfoMap = useMemo(() => {
    const map = new Map();
    assigned.forEach((s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (g) map.set(s.seatIndex, { guest: g });
    });
    return map;
  }, [assigned, guests]);

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId));

  const tableFill = isHighlighted ? "#fde047" : "#3b82f6";
  const tableText = isHighlighted ? "#713f12" : "white";

  const layout = useMemo(() => getTableLayout(table), [table.type, table.seats]);
  const seatsCoords = layout.coords;

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
    useSeatingStore.setState({ selectedTableId: table.id });
    if (!draggingGuest && typeof table.openAddGuestModal === "function") {
      table.openAddGuestModal();
    }
  };

  /* 🌀 סיבוב חלק כמו בקאנבה (לא עושה setState תוך כדי תנועה) */
  const startRotate = (e) => {
    e.cancelBubble = true;
    if (!tableRef.current) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const center = tableRef.current.getAbsolutePosition();
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;

    startAngleRef.current = Math.atan2(dy, dx);
    startRotationRadRef.current = (tableRef.current.rotation() * Math.PI) / 180;

    rotateActiveRef.current = true;
    setRotating(true);

    const move = () => {
      if (!rotateActiveRef.current || !tableRef.current) return;
      const p = stage.getPointerPosition();
      if (!p) return;

      const c = tableRef.current.getAbsolutePosition();
      const ddx = p.x - c.x;
      const ddy = p.y - c.y;

      const ang = Math.atan2(ddy, ddx);
      const newRotRad = ang - startAngleRef.current + startRotationRadRef.current;
      const newRotDeg = (newRotRad * 180) / Math.PI;

      // ✅ סיבוב ישיר של Konva (סופר חלק)
      tableRef.current.rotation(newRotDeg);
      tableRef.current.getLayer()?.batchDraw();
    };

    const end = () => {
      if (!rotateActiveRef.current) return;
      rotateActiveRef.current = false;
      setRotating(false);

      // ✅ שמירה פעם אחת בסוף (לא נתקע + כן נשמר)
      updatePositionInStore();

      stage.off("mousemove.tableRotate", move);
      stage.off("mouseup.tableRotate", end);
      stage.off("mouseleave.tableRotate", end);
      stage.off("touchmove.tableRotate", move);
      stage.off("touchend.tableRotate", end);
      stage.off("touchcancel.tableRotate", end);
    };

    // ✅ מאזינים לסטייג' כדי שלא "יתנתק" אם יצאת מהכפתור בזמן גרירה
    stage.on("mousemove.tableRotate", move);
    stage.on("mouseup.tableRotate", end);
    stage.on("mouseleave.tableRotate", end);
    stage.on("touchmove.tableRotate", move);
    stage.on("touchend.tableRotate", end);
    stage.on("touchcancel.tableRotate", end);
  };

  const { size, width, height, radius } = layout;
  const rotationHandleY =
    layout.type === "round"
      ? -layout.radius - 35
      : layout.type === "square"
      ? -layout.size / 2 - 35
      : -layout.height / 2 - 35;

  const deleteBtnPos =
    layout.type === "round"
      ? { x: radius - 12, y: -radius - 12 }
      : layout.type === "square"
      ? { x: size / 2 - 12, y: -size / 2 - 12 }
      : { x: width / 2 - 12, y: -height / 2 - 12 };

  const showDeleteButton = selectedTableId === table.id;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable={!rotating}
      onDragMove={updatePositionInStore}
      onDragEnd={updatePositionInStore}
      onMouseUp={handleDrop}
      onClick={handleClick}
    >
      {/* שולחנות */}
      {layout.type === "round" && (
        <>
          <Circle radius={radius} fill={tableFill} shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedSeatsCount}/${table.seats}`}
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
      {layout.type === "square" && (
        <>
          <Rect
            width={size}
            height={size}
            offsetX={size / 2}
            offsetY={size / 2}
            fill={tableFill}
            cornerRadius={10}
            shadowBlur={8}
          />
          <Text
            text={`${table.name}\n${occupiedSeatsCount}/${table.seats}`}
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
      {layout.type === "banquet" && (
        <>
          <Rect
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            fill={tableFill}
            cornerRadius={12}
            shadowBlur={8}
          />
          <Text
            text={`${table.name}\n${occupiedSeatsCount}/${table.seats}`}
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

      {/* 🔄 כפתור סיבוב קבוע (חלק + נשמר תמיד בשחרור) */}
      <Group x={0} y={rotationHandleY} onMouseDown={startRotate} listening={true}>
        <Circle radius={12} fill="#64748b" shadowBlur={4} />
        <Text
          text="↻"
          fontSize={14}
          align="center"
          verticalAlign="middle"
          width={24}
          height={24}
          offsetX={12}
          offsetY={12}
          fill="white"
        />
      </Group>

      {/* כפתור מחיקה */}
      {showDeleteButton && !draggingGuest && (
        <Group
          x={deleteBtnPos.x}
          y={deleteBtnPos.y}
          onClick={(e) => {
            e.cancelBubble = true;
            deleteTable(table.id);
            useSeatingStore.setState({ selectedTableId: null });
          }}
        >
          <Circle radius={12} fill="#ef4444" shadowBlur={6} />
          <Text
            text="🗑"
            fontSize={14}
            align="center"
            verticalAlign="middle"
            width={24}
            height={24}
            offsetX={12}
            offsetY={12}
            fill="white"
          />
        </Group>
      )}

      

      {/* כסאות */}
      {seatsCoords.map((c, i) => {
  const guest = seatInfoMap.get(i)?.guest;

  // כיוון מהכיסא אל מרכז השולחן (0,0) + תיקון כיוון לציור
  const rotation =
    (Math.atan2(-c.y, -c.x) * 180) / Math.PI + 90;

  return (
    <Group
      key={i}
      x={c.x}
      y={c.y}
      rotation={rotation}
    >
      {/* גב הכיסא */}
      <Rect
        x={-5}
        y={-16}
        width={10}
        height={6}
        cornerRadius={3}
        fill={guest ? "#cbd5e1" : "#bfdbfe"}
      />

      {/* מושב */}
      <Rect
        x={-7}
        y={-10}
        width={14}
        height={10}
        cornerRadius={4}
        fill={guest ? "#94a3b8" : "#3b82f6"}
        stroke="#2563eb"
        strokeWidth={1}
        shadowBlur={2}
      />
    </Group>
  );
})}


    </Group>
  );
}
