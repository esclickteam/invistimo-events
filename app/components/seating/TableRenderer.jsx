"use client";

import React from "react";
import { useRef, useMemo, useState, useEffect } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { useSearchParams } from "next/navigation";
import { useGroupStore } from "@/store/groupStore";

/* ============================================================
   חישוב דינמי של צורת השולחן + כסאות
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

    return {
      top: horizontalPairs + (hasExtra ? 1 : 0),
      bottom: horizontalPairs,
      left: verticalPairs,
      right: verticalPairs,
    };
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

      coords.push({
        x: Math.cos(angle) * ring,
        y: Math.sin(angle) * ring,
      });
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
    placeLineCentered(bottom, fixed, "x");
    placeLineCentered(right, fixed, "y");
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
    placeRow(bottomCount, yFixed);

    dims.width = width;
    dims.height = height;

    return { coords, ...dims, type };
  }

  return { coords, ...dims, type };
}

/* ============================================================
   סיבוב כיסאות
============================================================ */
function getSeatRotation(table, c) {
  if (table.type === "round") {
    return (Math.atan2(-c.y, -c.x) * 180) / Math.PI + 90;
  }

  if (table.type === "banquet") {
    return c.y > 0 ? 0 : 180;
  }

  if (table.type === "square" || table.type === "rectangle") {
    if (Math.abs(c.x) > Math.abs(c.y)) {
      return c.x > 0 ? -90 : 90;
    }

    return c.y > 0 ? 0 : 180;
  }

  return 0;
}

/* ============================================================
   TableRenderer
============================================================ */
function TableRenderer({ table, hideSeats = false }) {
  const tableRef = useRef(null);

  const [rotating, setRotating] = useState(false);

  const rotateActiveRef = useRef(false);
  const startAngleRef = useRef(0);
  const startRotationRadRef = useRef(0);

  const demoMode = useSeatingStore((s) => s.demoMode);
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const selectedTableId = useSeatingStore((s) => s.selectedTableId);

  const liveArrivals = useSeatingStore((s) => s.liveArrivals);

  const groups = useGroupStore((s) => s.groups);

  const groupForTable = useMemo(() => {
    if (!table.seatedGuests?.length) return null;

    const guestWithGroup = guests.find(
      (g) =>
        g.groupId &&
        table.seatedGuests.some(
          (s) => String(s.guestId) === String(g._id || g.id)
        )
    );

    if (!guestWithGroup?.groupId) return null;

    return groups.find(
      (gr) => String(gr._id) === String(guestWithGroup.groupId)
    );
  }, [table.seatedGuests, guests, groups]);

  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const guestIdFromUrl = searchParams.get("guestId");

  const seatingMode = useSeatingStore((s) => s.seatingMode);

  useEffect(() => {
    console.log("🟢 seatingMode in TableRenderer:", seatingMode);
  }, [seatingMode]);

  const deleteTable =
    useSeatingStore((s) => s.deleteTable) ||
    useSeatingStore((s) => s.removeTable) ||
    (() => {});

  const assigned = table.seatedGuests || [];

  const occupiedSeatsCount = useMemo(() => {
    if (!table.seatedGuests?.length) return 0;

    const counted = new Set();

    return table.seatedGuests.reduce((sum, s) => {
      const guestId = String(s.guestId);
      if (counted.has(guestId)) return sum;

      counted.add(guestId);

      const g = guests.find((g) => String(g._id || g.id) === guestId);
      if (!g) return sum;

      if (seatingMode === "live") {
        const key = String(g.id ?? g._id);

        const liveValue =
          liveArrivals && Object.prototype.hasOwnProperty.call(liveArrivals, key)
            ? Number(liveArrivals[key] || 0)
            : Number(g.actualArrivedCount || 0);

        return sum + liveValue;
      }

      return sum + Number(g.arrivedCount ?? 0);
    }, 0);
  }, [table.seatedGuests, guests, seatingMode, liveArrivals]);

  const seatsTotal = Number(table.seats || 0);

  const tableTitle = table.name || "";

  const plannedSeatsCount = useMemo(() => {
    return Number(table.seatedGuests?.length || 0);
  }, [table.seatedGuests]);

  const liveArrivedCount = occupiedSeatsCount;

  const tableLabel =
    seatingMode === "live"
      ? groupForTable
        ? `${groupForTable.name}\n${tableTitle}\nהושבה: ${plannedSeatsCount}/${seatsTotal}\nבפועל: ${liveArrivedCount}/${seatsTotal}`
        : `${tableTitle}\nהושבה: ${plannedSeatsCount}/${seatsTotal}\nבפועל: ${liveArrivedCount}/${seatsTotal}`
      : groupForTable
        ? `${groupForTable.name}\n${tableTitle}\n${plannedSeatsCount}/${seatsTotal}`
        : `${tableTitle}\n${plannedSeatsCount}/${seatsTotal}`;

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId)) ||
    (from === "personal" &&
      guestIdFromUrl &&
      assigned.some((s) => String(s.guestId) === String(guestIdFromUrl)));

  const hasArrived = occupiedSeatsCount > 0;

  /* ============================================================
     עיצוב בלבד
  ============================================================ */
  const tableFill = "#FFF9ED";

  const tableStroke = isHighlighted
    ? "#D7A63F"
    : hasArrived
      ? "#CBA56C"
      : "#D9C4A4";

  const tableText = isHighlighted ? "#6A4300" : "#3D3025";

  const layout = useMemo(() => getTableLayout(table), [table.type, table.seats]);

  const seatsCoords = layout.coords;

  /* ============================================================
     חישוב כיסאות שהגיעו בפועל
     חשוב:
     ההושבה הרגילה נשארת בסיס בלייב.
     רק כמות actualArrivedCount / liveArrivals צובעת אדום.
  ============================================================ */
  const arrivedSeatsSet = useMemo(() => {
    const arrived = new Set();

    if (!table.seatedGuests?.length) return arrived;

    const guestActualMap = new Map();

    for (const seated of table.seatedGuests || []) {
      const guestId = String(seated.guestId);
      if (guestActualMap.has(guestId)) continue;

      const guest = guests.find((g) => String(g._id || g.id) === guestId);

      if (!guest) {
        guestActualMap.set(guestId, 0);
        continue;
      }

      if (seatingMode === "live") {
        const key = String(guest.id ?? guest._id);

        const liveValue =
          liveArrivals && Object.prototype.hasOwnProperty.call(liveArrivals, key)
            ? Number(liveArrivals[key] || 0)
            : Number(guest.actualArrivedCount || 0);

        guestActualMap.set(guestId, Math.max(0, liveValue));
      } else {
        guestActualMap.set(
          guestId,
          Math.max(0, Number(guest.arrivedCount || 0))
        );
      }
    }

    const sorted = [...(table.seatedGuests || [])].sort(
      (a, b) => Number(a.seatIndex ?? 0) - Number(b.seatIndex ?? 0)
    );

    for (const seated of sorted) {
      const guestId = String(seated.guestId);
      const remaining = Number(guestActualMap.get(guestId) || 0);

      if (remaining <= 0) continue;

      arrived.add(Number(seated.seatIndex));
      guestActualMap.set(guestId, remaining - 1);
    }

    return arrived;
  }, [table.seatedGuests, guests, seatingMode, liveArrivals]);

  const getSeatVisual = (seat, seatIndex) => {
    /*
      מצב רגיל:
      משובץ = זהב
      פנוי = שמנת
    */
    if (seatingMode !== "live") {
      const isOccupied = !!seat;

      return {
        chairFill: isOccupied ? "#B98A45" : "#FFF9EF",
        chairStroke: isOccupied ? "#8B6532" : "#D9C3A2",
        chairHighlight: isOccupied ? "#CBA56C" : "#FFFFFF",
        chairDepth: isOccupied ? "#9E7135" : "#E9D8BD",
      };
    }

    /*
      מצב לייב:
      אין שיבוץ רגיל בכיסא = ירוק פנוי.
    */
    if (!seat) {
      return {
        chairFill: "#16A34A",
        chairStroke: "#166534",
        chairHighlight: "#DCFCE7",
        chairDepth: "#15803D",
      };
    }

    /*
      יש שיבוץ רגיל והכיסא נספר כמי שהגיע בפועל = אדום.
    */
    if (arrivedSeatsSet.has(Number(seatIndex))) {
      return {
        chairFill: "#DC2626",
        chairStroke: "#991B1B",
        chairHighlight: "#FEE2E2",
        chairDepth: "#B91C1C",
      };
    }

    /*
      יש שיבוץ רגיל אבל עדיין לא הגיע בפועל =
      זהב, בדיוק כמו ההושבה הרגילה.
      לא הופכים לירוק רק בגלל actualArrivedCount או liveArrivals.
    */
    return {
      chairFill: "#B98A45",
      chairStroke: "#8B6532",
      chairHighlight: "#CBA56C",
      chairDepth: "#9E7135",
    };
  };

  const handleDrop = (e) => {
    e.cancelBubble = true;

    if (draggingGuest) {
      assignGuestBlock({
        guestId: draggingGuest._id || draggingGuest.id,
        tableId: table.id,
      });
    }
  };

  const handleClick = (e) => {
    e.cancelBubble = true;

    useSeatingStore.setState({ selectedTableId: table.id });

    if (draggingGuest) return;

    if (typeof table.openAddGuestModal !== "function") return;

    table.openAddGuestModal();
  };

  const updatePositionInStore = () => {
    if (!tableRef.current) return;

    const pos = tableRef.current.position();
    const rotation = tableRef.current.rotation();

    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id
          ? {
              ...t,
              x: pos.x,
              y: pos.y,
              rotation,
            }
          : t
      ),
    }));
  };

  /* ====== סיבוב ====== */
  const startRotate = (e) => {
    e.cancelBubble = true;
    if (!tableRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const center = tableRef.current.getAbsolutePosition();

    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;

    startAngleRef.current = Math.atan2(dy, dx);
    startRotationRadRef.current =
      (tableRef.current.rotation() * Math.PI) / 180;

    rotateActiveRef.current = true;
    setRotating(true);

    const move = () => {
      if (!rotateActiveRef.current || !tableRef.current) return;

      const p = stage.getPointerPosition();
      const c = tableRef.current.getAbsolutePosition();

      const ang = Math.atan2(p.y - c.y, p.x - c.x);
      const newRot = ang - startAngleRef.current + startRotationRadRef.current;

      tableRef.current.rotation((newRot * 180) / Math.PI);
      tableRef.current.getLayer()?.batchDraw();
    };

    const end = () => {
      rotateActiveRef.current = false;
      setRotating(false);
      updatePositionInStore();

      stage.off("mousemove.tableRotate", move);
      stage.off("mouseup.tableRotate", end);
    };

    stage.on("mousemove.tableRotate", move);
    stage.on("mouseup.tableRotate", end);
  };

  const { size, width, height, radius } = layout;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable={!rotating}
      onDragEnd={updatePositionInStore}
      onMouseUp={handleDrop}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* ============================================================
          כסאות - תמיד מוצגים גם במפיק
          מצוירים לפני השולחן כדי שחלק מהם ייכנס מתחת לשולחן
      ============================================================ */}
      {seatsCoords.map((c, i) => {
        const seat = table.seatedGuests?.find(
          (s) => Number(s.seatIndex) === i
        );

        const rotation = getSeatRotation(layout, c);

        let chairX = c.x;
        let chairY = c.y;

        if (layout.type === "banquet") {
          const tableEdgeY = layout.height / 2;
          const outsideOffset = 2;

          chairY =
            c.y > 0
              ? tableEdgeY + outsideOffset
              : -tableEdgeY - outsideOffset;
        } else {
          const dist = Math.hypot(c.x, c.y) || 1;
          const inset = 7;

          chairX = c.x - (c.x / dist) * inset;
          chairY = c.y - (c.y / dist) * inset;
        }

        const { chairFill, chairStroke, chairHighlight, chairDepth } =
          getSeatVisual(seat, i);

        return (
          <Group key={i} x={chairX} y={chairY} rotation={rotation}>
            {/* גב הכיסא */}
            <Rect
              x={-7}
              y={-14}
              width={14}
              height={6}
              cornerRadius={2.5}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={0.8}
              perfectDrawEnabled={false}
            />

            {/* רווח קטן בין הגב למושב */}
            <Rect
              x={-5}
              y={-8}
              width={10}
              height={2}
              cornerRadius={1}
              fill={chairDepth}
              opacity={0.55}
              listening={false}
              perfectDrawEnabled={false}
            />

            {/* מושב הכיסא */}
            <Rect
              x={-7}
              y={-6}
              width={14}
              height={11}
              cornerRadius={3}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={0.9}
              perfectDrawEnabled={false}
            />

            {/* הברקה פנימית עדינה */}
            <Rect
              x={-5}
              y={-4}
              width={10}
              height={3}
              cornerRadius={1.5}
              fill={chairHighlight}
              opacity={0.28}
              listening={false}
              perfectDrawEnabled={false}
            />
          </Group>
        );
      })}

      {/* שולחן עגול */}
      {layout.type === "round" && (
        <>
          <Circle
            radius={radius}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            perfectDrawEnabled={false}
          />

          <Text
            text={tableLabel}
            width={radius * 2}
            height={radius * 2 + 42}
            offsetX={radius}
            offsetY={(radius * 2 + 42) / 2}
            align="center"
            verticalAlign="middle"
            fill={tableText}
            fontSize={seatingMode === "live" ? 12 : 14}
            lineHeight={1.25}
            listening={false}
            perfectDrawEnabled={false}
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
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={10}
            perfectDrawEnabled={false}
          />

          <Text
            text={tableLabel}
            width={size}
            height={size + 42}
            offsetX={size / 2}
            offsetY={(size + 42) / 2}
            align="center"
            verticalAlign="middle"
            fill={tableText}
            fontSize={seatingMode === "live" ? 12 : 14}
            lineHeight={1.25}
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      )}

      {/* שולחן אבירים / מלבני */}
      {layout.type === "banquet" && (
        <>
          <Rect
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={12}
            perfectDrawEnabled={false}
          />

          <Text
            text={tableLabel}
            width={width}
            height={height + 42}
            offsetX={width / 2}
            offsetY={(height + 42) / 2}
            align="center"
            verticalAlign="middle"
            fill={tableText}
            fontSize={seatingMode === "live" ? 12 : 14}
            lineHeight={1.25}
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      )}

      {/* כפתור סיבוב */}
      {!hideSeats && (
        <Group
          y={
            layout.type === "round"
              ? -radius - 35
              : layout.type === "square"
                ? -size / 2 - 35
                : -height / 2 - 35
          }
          onMouseDown={startRotate}
        >
          <Circle
            radius={12}
            fill="#FFF9ED"
            stroke="#CBA56C"
            strokeWidth={1}
            perfectDrawEnabled={false}
          />

          <Text
            text="↻"
            width={24}
            height={24}
            offsetX={12}
            offsetY={12}
            align="center"
            verticalAlign="middle"
            fill="#9A6A2F"
            fontSize={14}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      )}
    </Group>
  );
}

export default TableRenderer;