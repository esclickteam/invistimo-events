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

  const SEAT_R = 8;
  const SEAT_GAP = 7;
  const OUTSIDE = 9;
  const STEP = SEAT_R * 2 + SEAT_GAP;
  const PAD = SEAT_R + OUTSIDE + 10;

  const coords = [];
  const dims = {
    size: 88,
    width: 128,
    height: 74,
    radius: 46,
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
    const seatRing = Math.max(39, requiredCirc / (2 * Math.PI));
    const tableRadius = Math.max(36, seatRing - (SEAT_R + OUTSIDE));
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
    const size = Math.max(84, span + PAD * 2);
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
    const width = Math.max(104, span + PAD * 2);
    const height = 66;
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
        return sum + Number(liveArrivals?.[key] ?? 0);
      }

      return sum + Number(g.arrivedCount ?? 0);
    }, 0);
  }, [table.seatedGuests, guests, seatingMode, liveArrivals]);

  const seatsTotal = Number(table.seats || 0);

  const tableTitle = table.name || "";

  const tableLabel = groupForTable
    ? `${groupForTable.name}\n${tableTitle}\n${occupiedSeatsCount}/${seatsTotal}`
    : `${tableTitle}\n${occupiedSeatsCount}/${seatsTotal}`;

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId)) ||
    (from === "personal" &&
      guestIdFromUrl &&
      assigned.some((s) => String(s.guestId) === String(guestIdFromUrl)));

  const hasArrived = occupiedSeatsCount > 0;

  const tableFill = "#FFFDF8";
  const tableInnerFill = "#FFF8EC";
  const tableStroke = isHighlighted ? "#D6A84A" : "#D8B98A";
  const tableText = "#3D3025";
  const tableShadowColor = "rgba(92, 62, 32, 0.24)";

  const accentColor = isHighlighted
    ? "#D6A84A"
    : hasArrived
    ? "#268563"
    : "#3B82F6";

  const layout = useMemo(() => getTableLayout(table), [table.type, table.seats]);

  const seatsCoords = layout.coords;

  const arrivedSeatsSet = useMemo(() => {
    const arrived = new Set();
    let remaining = occupiedSeatsCount;

    const sorted = [...(table.seatedGuests || [])].sort(
      (a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0)
    );

    for (const s of sorted) {
      if (remaining <= 0) break;
      arrived.add(s.seatIndex);
      remaining--;
    }

    return arrived;
  }, [table.seatedGuests, occupiedSeatsCount]);

  
/* ====== NO CACHE - מונע חיתוכים וקווים על הטקסט ====== */
useEffect(() => {
  if (tableRef.current) {
    tableRef.current.clearCache();
    tableRef.current.getLayer()?.batchDraw();
  }
}, [
  layout.type,
  table.seats,
  table.seatedGuests,
  occupiedSeatsCount,
  hideSeats,
  liveArrivals,
  table.name,
]);

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
        t.id === table.id ? { ...t, x: pos.x, y: pos.y, rotation } : t
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

  const renderStatusDots = (dotY, maxDots = 5) => {
    const total = Math.max(1, seatsTotal);

    const filled = Math.min(
      maxDots,
      Math.round((occupiedSeatsCount / total) * maxDots)
    );

    const startX = -((maxDots - 1) * 7) / 2;

    return Array.from({ length: maxDots }).map((_, i) => (
      <Circle
        key={`dot-${table.id}-${i}`}
        x={startX + i * 7}
        y={dotY}
        radius={2.2}
        fill={i < filled ? accentColor : "#D8D2C8"}
        opacity={i < filled ? 1 : 0.55}
        listening={false}
      />
    ));
  };

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
      {/* שולחן עגול */}
      {layout.type === "round" && (
        <>
          <Circle
            radius={radius + 7}
            fill="#000000"
            opacity={0.08}
            y={7}
            listening={false}
          />

          <Circle
            radius={radius + 3}
            fill={tableInnerFill}
            stroke="#E8D2AE"
            strokeWidth={1.4}
            shadowColor={tableShadowColor}
            shadowBlur={12}
            shadowOffset={{ x: 0, y: 6 }}
            shadowOpacity={0.7}
          />

          <Circle
            radius={radius}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
          />

          <Text
            text={tableLabel}
            width={radius * 2 - 8}
            height={radius * 2 - 10}
            offsetX={(radius * 2 - 8) / 2}
            offsetY={(radius * 2 - 10) / 2}
            align="center"
            verticalAlign="middle"
            fill={tableText}
            fontSize={10.5}
            fontStyle="700"
            lineHeight={1.08}
            listening={false}
          />

          {renderStatusDots(radius * 0.48)}
        </>
      )}

      {/* שולחן מרובע */}
      {layout.type === "square" && (
        <>
          <Rect
            width={size + 10}
            height={size + 10}
            offsetX={(size + 10) / 2}
            offsetY={(size + 10) / 2 - 6}
            fill="#000000"
            opacity={0.075}
            cornerRadius={18}
            listening={false}
          />

          <Rect
            width={size + 5}
            height={size + 5}
            offsetX={(size + 5) / 2}
            offsetY={(size + 5) / 2}
            fill={tableInnerFill}
            stroke="#E8D2AE"
            strokeWidth={1.4}
            cornerRadius={17}
            shadowColor={tableShadowColor}
            shadowBlur={12}
            shadowOffset={{ x: 0, y: 6 }}
            shadowOpacity={0.7}
          />

          <Rect
            width={size}
            height={size}
            offsetX={size / 2}
            offsetY={size / 2}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={15}
          />

          <Text
            text={tableLabel}
            width={size - 8}
            height={size - 10}
            offsetX={(size - 8) / 2}
            offsetY={(size - 10) / 2}
            align="center"
            verticalAlign="middle"
            fill={tableText}
            fontSize={10.5}
            fontStyle="700"
            lineHeight={1.08}
            listening={false}
          />

          {renderStatusDots(size * 0.32)}
        </>
      )}

      {/* שולחן מלבני / אבירים */}
      {layout.type === "banquet" && (
        <>
          <Rect
            width={width + 10}
            height={height + 10}
            offsetX={(width + 10) / 2}
            offsetY={(height + 10) / 2 - 6}
            fill="#000000"
            opacity={0.075}
            cornerRadius={18}
            listening={false}
          />

          <Rect
            width={width + 5}
            height={height + 5}
            offsetX={(width + 5) / 2}
            offsetY={(height + 5) / 2}
            fill={tableInnerFill}
            stroke="#E8D2AE"
            strokeWidth={1.4}
            cornerRadius={16}
            shadowColor={tableShadowColor}
            shadowBlur={12}
            shadowOffset={{ x: 0, y: 6 }}
            shadowOpacity={0.7}
          />

          <Rect
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={15}
          />

          <Text
            text={tableLabel}
            width={width - 10}
            height={height - 8}
            offsetX={(width - 10) / 2}
            offsetY={(height - 8) / 2}
            align="center"
            verticalAlign="middle"
            fill={tableText}
            fontSize={10.5}
            fontStyle="700"
            lineHeight={1.08}
            listening={false}
          />

          {renderStatusDots(height * 0.35)}
        </>
      )}

      {/* כפתור סיבוב */}
      {!hideSeats && (
        <Group
          y={
            layout.type === "round"
              ? -radius - 34
              : layout.type === "square"
              ? -size / 2 - 34
              : -height / 2 - 34
          }
          onMouseDown={startRotate}
        >
          <Circle
            radius={11}
            fill="#FFFDF8"
            stroke="#D8B98A"
            strokeWidth={1}
            shadowColor="rgba(92, 62, 32, 0.16)"
            shadowBlur={7}
            shadowOffset={{ x: 0, y: 3 }}
            shadowOpacity={1}
          />

          <Text
            text="↻"
            width={22}
            height={22}
            offsetX={11}
            offsetY={11}
            align="center"
            verticalAlign="middle"
            fill="#9A6A2F"
            fontSize={13}
            fontStyle="700"
          />
        </Group>
      )}

      {/* כסאות – מוסתרים במפיק */}
      {!hideSeats &&
        seatsCoords.map((c, i) => {
          const seat = table.seatedGuests.find((s) => s.seatIndex === i);

          const isOccupied =
            seatingMode === "live" ? arrivedSeatsSet.has(i) : !!seat;

          const rotation = getSeatRotation(layout, c) - (table.rotation || 0);

          const seatTopFill = isOccupied ? "#D4B072" : "#F7EFE3";
          const seatBodyFill = isOccupied ? "#B98745" : "#FFFDF8";
          const seatStroke = isOccupied ? "#926B2E" : "#D0B58D";

          return (
            <Group key={i} x={c.x} y={c.y} rotation={rotation}>
              <Rect
                x={-5.5}
                y={-15.5}
                width={11}
                height={5.5}
                cornerRadius={2.8}
                fill={seatTopFill}
                stroke={seatStroke}
                strokeWidth={0.6}
                shadowColor="rgba(92, 62, 32, 0.13)"
                shadowBlur={3.5}
                shadowOffset={{ x: 0, y: 1.8 }}
                shadowOpacity={1}
              />

              <Rect
                x={-7}
                y={-10}
                width={14}
                height={10}
                cornerRadius={3.5}
                fill={seatBodyFill}
                stroke={seatStroke}
                strokeWidth={0.8}
                shadowColor="rgba(92, 62, 32, 0.13)"
                shadowBlur={3.5}
                shadowOffset={{ x: 0, y: 1.8 }}
                shadowOpacity={1}
              />

              <Rect
                x={-4}
                y={0}
                width={2.2}
                height={5.5}
                cornerRadius={2}
                fill={seatStroke}
                opacity={0.68}
              />

              <Rect
                x={1.8}
                y={0}
                width={2.2}
                height={5.5}
                cornerRadius={2}
                fill={seatStroke}
                opacity={0.68}
              />
            </Group>
          );
        })}
    </Group>
  );
}

export default TableRenderer;