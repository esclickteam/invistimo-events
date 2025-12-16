"use client";

import { useRef, useEffect, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות צמודים לשולחן
============================================================ */
function getTightSeatCoordinates(table) {
  const seats = table.seats || 0;
  const result = [];

  /* ========= ROUND ========= */
  if (table.type === "round") {
    const tableRadius = 60;
    const seatRadius = 10;
    const radius = tableRadius + seatRadius + 6;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      result.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: angle,
      });
    }
  }

  /* ========= SQUARE ========= */
  if (table.type === "square") {
    const size = 160;
    const seatGap = 22;
    const half = size / 2 + 12;
    const perSide = Math.ceil(seats / 4);
    let i = 0;

    for (; i < perSide && i < seats; i++)
      result.push({ x: -half + i * seatGap, y: -half, rotation: -Math.PI / 2 });

    for (; i < perSide * 2 && i < seats; i++)
      result.push({ x: half, y: -half + (i - perSide) * seatGap, rotation: 0 });

    for (; i < perSide * 3 && i < seats; i++)
      result.push({
        x: half - (i - perSide * 2) * seatGap,
        y: half,
        rotation: Math.PI / 2,
      });

    for (; i < seats; i++)
      result.push({
        x: -half,
        y: half - (i - perSide * 3) * seatGap,
        rotation: Math.PI,
      });
  }

  /* ========= BANQUET ========= */
  if (table.type === "banquet") {
    const width = 240;
    const seatGap = 22;
    const sideY = 45 + 14;
    const perSide = Math.floor(seats / 2);

    for (let i = 0; i < perSide; i++)
      result.push({
        x: -width / 2 + 20 + i * seatGap,
        y: -sideY,
        rotation: -Math.PI / 2,
      });

    for (let i = 0; i < seats - perSide; i++)
      result.push({
        x: -width / 2 + 20 + i * seatGap,
        y: sideY,
        rotation: Math.PI / 2,
      });
  }

  return result;
}

/* ============================================================
   TableRenderer
============================================================ */
export default function TableRenderer({ table }) {
  const tableRef = useRef(null);

  const {
    highlightedTable,
    highlightedSeats,
    selectedGuestId,
    guests,
    startDragGuest,
  } = useSeatingStore.getState();

  const assigned = table.seatedGuests || [];
  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;

  const normalizeGuestId = (g) => String(g?.id ?? g?._id ?? "");

  const hasSelectedGuestInThisTable = useMemo(() => {
    if (!selectedGuestId) return false;
    return assigned.some(
      (s) => String(s.guestId) === String(selectedGuestId)
    );
  }, [assigned, selectedGuestId]);

  const isHighlighted =
    highlightedTable === table.id || hasSelectedGuestInThisTable;

  const tableFill = isHighlighted ? "#fde047" : "#3b82f6";
  const tableText = isHighlighted ? "#713f12" : "white";

  const seatsCoords = getTightSeatCoordinates(table);

  /* ================= SAVE POSITION ================= */
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

  /* ================= DRAG ================= */
  const handleSeatDrag = (guestId) => {
    const g = guests.find(
      (x) => normalizeGuestId(x) === String(guestId)
    );
    if (g) startDragGuest(g);
  };

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable
      onDragMove={updatePositionInStore}
      onDragEnd={updatePositionInStore}
      onClick={(e) => {
        e.cancelBubble = true;
        useSeatingStore.setState({
          highlightedTable: table.id,
          highlightedSeats: [],
        });
      }}
    >
      {/* ===== TABLE BODY ===== */}
      {table.type === "round" && (
        <>
          <Circle radius={60} fill={tableFill} shadowBlur={8} />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill={tableText}
            align="center"
            verticalAlign="middle"
            width={120}
            height={120}
            offsetX={60}
            offsetY={60}
          />
        </>
      )}

      {table.type === "square" && (
        <>
          <Rect
            width={160}
            height={160}
            offsetX={80}
            offsetY={80}
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
            width={160}
            height={160}
            offsetX={80}
            offsetY={80}
          />
        </>
      )}

      {table.type === "banquet" && (
        <>
          <Rect
            width={240}
            height={90}
            offsetX={120}
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
            width={240}
            height={90}
            offsetX={120}
            offsetY={45}
          />
        </>
      )}

      {/* ===== SEATS ===== */}
      {seatsCoords.map((c, i) => {
        const seatGuest = assigned.find((s) => s.seatIndex === i);
        const isFree = !seatGuest;

        return (
          <Group
            key={i}
            x={c.x}
            y={c.y}
            rotation={(c.rotation * 180) / Math.PI}
          >
            <Circle
              radius={10}
              fill={isFree ? "#3b82f6" : "#d1d5db"}
              stroke="#2563eb"
              onClick={() =>
                !isFree && handleSeatDrag(seatGuest.guestId)
              }
            />
            <Rect
              width={12}
              height={6}
              y={-14}
              offsetX={6}
              cornerRadius={2}
              fill={isFree ? "#2563eb" : "#9ca3af"}
            />
          </Group>
        );
      })}
    </Group>
  );
}
