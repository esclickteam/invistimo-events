"use client";

import React from "react";
import { useRef, useMemo, useState, useEffect } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { useSearchParams } from "next/navigation";
import { useGroupStore } from "@/store/groupStore";

/* ============================================================
   HELPERS
============================================================ */

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getGuestId(value) {
  return String(
    value?.guestId || value?.id || value?._id || value?.guest || ""
  ).trim();
}

function getGuestPeopleCount(guest, seated) {
  return Math.max(
    1,
    toSafeNumber(
      guest?.guestsCount ??
        guest?.count ??
        guest?.guestsAmount ??
        guest?.totalGuests ??
        seated?.guestsCount ??
        seated?.count ??
        seated?.guestsAmount ??
        seated?.totalGuests,
      1
    )
  );
}

function getGuestActualArrivedCount(guest, seated, liveArrivals) {
  const guestKey = String(guest?.id ?? guest?._id ?? seated?.guestId ?? "");

  if (
    guestKey &&
    liveArrivals &&
    Object.prototype.hasOwnProperty.call(liveArrivals, guestKey)
  ) {
    return Math.max(0, toSafeNumber(liveArrivals[guestKey], 0));
  }

  return Math.max(
    0,
    toSafeNumber(
      guest?.actualArrivedCount ??
        guest?.arrivedCount ??
        seated?.actualArrivedCount ??
        seated?.arrivedCount,
      0
    )
  );
}

/* ============================================================
   חישוב דינמי של צורת השולחן + כסאות
============================================================ */

function getTableLayout(rawTable) {
  const seats = Math.max(0, Number(rawTable.seats || rawTable.capacity || 0));
  const type =
    rawTable.type === "rectangle" || rawTable.type === "rect"
      ? "banquet"
      : rawTable.type;

  const SEAT_R = 13;
  const SEAT_GAP = 12;
  const OUTSIDE = 10;
  const STEP = SEAT_R * 2 + SEAT_GAP;
  const PAD = SEAT_R + OUTSIDE + 18;

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
    const seatRing = Math.max(48, requiredCirc / (2 * Math.PI));
    const tableRadius = Math.max(42, seatRing - (SEAT_R + OUTSIDE));
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

    const size = Math.max(140, span + PAD * 2);
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
    const width = Math.max(230, span + PAD * 2);
    const height = 78;
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

  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const liveArrivals = useSeatingStore((s) => s.liveArrivals);

  const groups = useGroupStore((s) => s.groups);

  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const guestIdFromUrl = searchParams.get("guestId");

  const seatingMode = useSeatingStore((s) => s.seatingMode);

  useEffect(() => {
    console.log("🟢 seatingMode in TableRenderer:", seatingMode);
  }, [seatingMode]);

  const assigned = Array.isArray(table.seatedGuests) ? table.seatedGuests : [];

  const seatsTotal = Number(table.seats || table.capacity || 0);
  const tableTitle = table.name || "";

  const guestById = useMemo(() => {
    const map = new Map();

    guests.forEach((guest) => {
      const id = String(guest?._id || guest?.id || "").trim();

      if (id) {
        map.set(id, guest);
      }
    });

    return map;
  }, [guests]);

  const groupForTable = useMemo(() => {
    if (!assigned.length) return null;

    const guestWithGroup = guests.find(
      (g) =>
        g.groupId &&
        assigned.some((s) => String(s.guestId) === String(g._id || g.id))
    );

    if (!guestWithGroup?.groupId) return null;

    return groups.find(
      (gr) => String(gr._id) === String(guestWithGroup.groupId)
    );
  }, [assigned, guests, groups]);

  /*
    ✅ התיקון החשוב:
    הושבה = כמות אנשים לפי guestsCount.
    בפועל = actualArrivedCount / arrivedCount.
    לא סופרים seatedGuests.length.
  */
  const computedCounts = useMemo(() => {
    let planned = 0;
    let actual = 0;

    const counted = new Set();

    for (const seated of assigned) {
      const guestId = getGuestId(seated);

      if (!guestId || counted.has(guestId)) continue;

      counted.add(guestId);

      const guest = guestById.get(guestId) || seated;

      planned += getGuestPeopleCount(guest, seated);
      actual += getGuestActualArrivedCount(guest, seated, liveArrivals);
    }

    return {
      planned,
      actual,
    };
  }, [assigned, guestById, liveArrivals]);

  const plannedSeatsCount = Math.max(
  0,
  toSafeNumber(table.seatedCount, 0),
  computedCounts.planned
);

const liveArrivedCount = Math.max(
  0,
  toSafeNumber(table.actualArrivedCount, 0),
  computedCounts.actual
);

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId)) ||
    (from === "personal" &&
      guestIdFromUrl &&
      assigned.some((s) => String(s.guestId) === String(guestIdFromUrl)));

  const hasArrived = liveArrivedCount > 0;

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

  const tableLines = useMemo(() => {
    const lines = [];

    if (groupForTable?.name) {
      lines.push({
        text: groupForTable.name,
        fill: tableText,
        fontSize: seatingMode === "live" ? 13 : 14,
        fontStyle: "bold",
      });
    }

    lines.push({
      text: tableTitle,
      fill: tableText,
      fontSize: seatingMode === "live" ? 14 : 16,
      fontStyle: "bold",
    });

    if (seatingMode === "live") {
      lines.push({
        text: `הושבה: ${plannedSeatsCount}/${seatsTotal}`,
        fill: "#B98A45",
        fontSize: 15,
        fontStyle: "bold",
      });

      lines.push({
        text: `בפועל: ${liveArrivedCount}/${seatsTotal}`,
        fill: "#DC2626",
        fontSize: 15,
        fontStyle: "bold",
      });
    } else {
      lines.push({
        text: `${plannedSeatsCount}/${seatsTotal}`,
        fill: tableText,
        fontSize: 15,
        fontStyle: "bold",
      });
    }

    return lines;
  }, [
    groupForTable,
    tableTitle,
    tableText,
    seatingMode,
    plannedSeatsCount,
    liveArrivedCount,
    seatsTotal,
  ]);

  const layout = useMemo(() => getTableLayout(table), [table.type, table.seats, table.capacity]);

  const seatsCoords = layout.coords;

  /*
    ✅ צביעת כיסאות בלייב:
    ההושבה נשארת לפי planned guests.
    בפועל צובע רק מספר כיסאות לפי actualArrivedCount.
  */
  const arrivedSeatsSet = useMemo(() => {
    const arrived = new Set();

    if (!assigned.length) return arrived;

    let remainingActual = liveArrivedCount;

    const sortedSeats = [...Array(seatsTotal).keys()];

    for (const seatIndex of sortedSeats) {
      if (remainingActual <= 0) break;

      arrived.add(seatIndex);
      remainingActual -= 1;
    }

    return arrived;
  }, [assigned.length, liveArrivedCount, seatsTotal]);

  const plannedSeatsSet = useMemo(() => {
    const planned = new Set();

    let remainingPlanned = plannedSeatsCount;

    for (let i = 0; i < seatsTotal; i++) {
      if (remainingPlanned <= 0) break;

      planned.add(i);
      remainingPlanned -= 1;
    }

    return planned;
  }, [plannedSeatsCount, seatsTotal]);

  const getSeatVisual = (seatIndex) => {
    const planned = plannedSeatsSet.has(Number(seatIndex));
    const arrived = arrivedSeatsSet.has(Number(seatIndex));

    if (seatingMode !== "live") {
      return {
        chairFill: planned ? "#B98A45" : "#FFF9EF",
        chairStroke: planned ? "#8B6532" : "#D9C3A2",
        chairHighlight: planned ? "#E3BD63" : "#FFFFFF",
        chairDepth: planned ? "#8D642C" : "#E9D8BD",
        chairShadow: planned ? "#6F4A19" : "#D6C3A6",
      };
    }

    if (arrived) {
      return {
        chairFill: "#DC2626",
        chairStroke: "#991B1B",
        chairHighlight: "#FEE2E2",
        chairDepth: "#B91C1C",
        chairShadow: "#7F1D1D",
      };
    }

    if (planned) {
      return {
        chairFill: "#B98A45",
        chairStroke: "#8B6532",
        chairHighlight: "#E3BD63",
        chairDepth: "#8D642C",
        chairShadow: "#6F4A19",
      };
    }

    return {
      chairFill: "#16A34A",
      chairStroke: "#166534",
      chairHighlight: "#DCFCE7",
      chairDepth: "#15803D",
      chairShadow: "#14532D",
    };
  };

  const renderTableCenterLines = (boxWidth, compact = false) => {
    const lineHeight =
      seatingMode === "live" ? (compact ? 15 : 22) : compact ? 21 : 26;

    const totalHeight = tableLines.length * lineHeight;

    const startY =
      seatingMode === "live" && compact
        ? -totalHeight / 2 - 2
        : -totalHeight / 2 + 2;

    return tableLines.map((line, index) => {
      const safeFontSize =
        seatingMode === "live" && compact
          ? Math.min(Number(line.fontSize || 13), index <= 1 ? 11 : 12)
          : line.fontSize;

      return (
        <Text
          key={`table-line-${index}`}
          text={line.text}
          width={boxWidth}
          x={-boxWidth / 2}
          y={startY + index * lineHeight}
          align="center"
          verticalAlign="middle"
          fill={line.fill}
          fontSize={safeFontSize}
          fontStyle={line.fontStyle}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    });
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
      {seatsCoords.map((c, i) => {
        const rotation = getSeatRotation(layout, c);

        let chairX = c.x;
        let chairY = c.y;

        if (layout.type === "banquet") {
          const tableEdgeY = layout.height / 2;
          const outsideOffset = 6;

          chairY =
            c.y > 0
              ? tableEdgeY + outsideOffset
              : -tableEdgeY - outsideOffset;
        } else {
          const dist = Math.hypot(c.x, c.y) || 1;
          const inset = 4;

          chairX = c.x - (c.x / dist) * inset;
          chairY = c.y - (c.y / dist) * inset;
        }

        const {
          chairFill,
          chairStroke,
          chairHighlight,
          chairDepth,
          chairShadow,
        } = getSeatVisual(i);

        return (
          <Group key={i} x={chairX} y={chairY} rotation={rotation}>
            <Rect
              x={-17}
              y={-13}
              width={34}
              height={26}
              cornerRadius={5}
              fill={chairShadow}
              opacity={0.32}
              listening={false}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-15}
              y={-20}
              width={30}
              height={11}
              cornerRadius={5}
              fill={chairHighlight}
              stroke={chairStroke}
              strokeWidth={1.3}
              shadowColor="rgba(0,0,0,0.16)"
              shadowBlur={2}
              shadowOffset={{ x: 0, y: 1 }}
              shadowOpacity={0.4}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-17}
              y={-11}
              width={34}
              height={25}
              cornerRadius={6}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={1.5}
              shadowColor="rgba(0,0,0,0.18)"
              shadowBlur={2}
              shadowOffset={{ x: 0, y: 1 }}
              shadowOpacity={0.5}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-13}
              y={-8}
              width={26}
              height={10}
              cornerRadius={4}
              fill={chairHighlight}
              opacity={0.25}
              listening={false}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-14}
              y={9}
              width={28}
              height={5}
              cornerRadius={3}
              fill={chairDepth}
              opacity={0.55}
              listening={false}
              perfectDrawEnabled={false}
            />
          </Group>
        );
      })}

      {layout.type === "round" && (
        <>
          <Circle
            radius={radius}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            perfectDrawEnabled={false}
          />

          {renderTableCenterLines(radius * 2)}
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
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={10}
            perfectDrawEnabled={false}
          />

          {renderTableCenterLines(size)}
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
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={12}
            perfectDrawEnabled={false}
          />

          {renderTableCenterLines(width, true)}
        </>
      )}

      {!hideSeats && (
        <Group
          y={
            layout.type === "round"
              ? -radius - 42
              : layout.type === "square"
                ? -size / 2 - 42
                : -height / 2 - 42
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