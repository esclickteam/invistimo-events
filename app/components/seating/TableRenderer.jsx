"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { getSeatCoordinates } from "@/logic/seatingEngine";

const CELL_SIZE = 320;

export default function TableRenderer({ table }) {
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const highlightedSeats = useSeatingStore((s) => s.highlightedSeats);
  const guests = useSeatingStore((s) => s.guests);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateTablePosition = useSeatingStore((s) => s.updateTablePosition);

  const tableRef = useRef(null);

  /* ================= SAFE TABLE ================= */
  const safeTable = useMemo(() => ({
    ...table,
    seatedGuests: Array.isArray(table.seatedGuests)
      ? table.seatedGuests
      : [],
    seats: Number(table.seats) || 0,
  }), [table]);

  const isHighlighted = highlightedTable === safeTable.id;
  const assigned = safeTable.seatedGuests;

  const occupiedCount = new Set(
    assigned.map((s) => s.seatIndex)
  ).size;

  /* ================= SNAP TO CELL ================= */
  const getCellSizeForTable = () =>
    safeTable.seats > 19 ? CELL_SIZE * 2 : CELL_SIZE;

  const snapToCell = (x, y) => {
    const size = getCellSizeForTable();
    return {
      x: Math.round((x - size / 2) / size) * size + size / 2,
      y: Math.round((y - size / 2) / size) * size + size / 2,
    };
  };

  /* ================= SEAT COORDINATES ================= */
  const seatsCoords = useMemo(() => {
    if (safeTable.type === "square") {
      return getSquareSeatCoordinates(safeTable.seats);
    }

    return getSeatCoordinates(safeTable) || [];
  }, [safeTable]);

  function getSquareSeatCoordinates(seatsCount) {
    const size = 160;
    const gap = 36;
    const seats = [];

    [-1, 0, 1].forEach((i) =>
      seats.push({ x: i * gap, y: -size / 2 - 20, rotation: 0 })
    );

    [-1, 1].forEach((i) =>
      seats.push({
        x: size / 2 + 20,
        y: i * gap,
        rotation: Math.PI / 2,
      })
    );

    [-1, 0, 1].forEach((i) =>
      seats.push({
        x: i * gap,
        y: size / 2 + 20,
        rotation: Math.PI,
      })
    );

    [-1, 1].forEach((i) =>
      seats.push({
        x: -size / 2 - 20,
        y: i * gap,
        rotation: -Math.PI / 2,
      })
    );

    return seats.slice(0, seatsCount);
  }

  /* ================= DRAG FROM SEAT ================= */
  const handleSeatDrag = (guestId) => {
    const guest = guests.find(
      (g) => g._id?.toString() === guestId?.toString()
    );
    if (guest) {
      startDragGuest(guest);
    }
  };

  return (
    <Group
      ref={tableRef}
      x={safeTable.x}
      y={safeTable.y}
      draggable
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const snapped = snapToCell(e.target.x(), e.target.y());
        updateTablePosition(safeTable.id, snapped.x, snapped.y);
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        useSeatingStore.setState({
          highlightedTable: safeTable.id,
          highlightedSeats: [],
        });
      }}
    >
      {/* ================= TABLE BODY ================= */}
      {safeTable.type === "round" && (
        <>
          <Circle
            radius={60}
            fill={isHighlighted ? "#60A5FA" : "#3b82f6"}
            shadowBlur={4}
          />
          <Text
            text={`${safeTable.name}\n${occupiedCount}/${safeTable.seats}`}
            fontSize={18}
            fill="white"
            align="center"
            verticalAlign="middle"
            width={120}
            height={120}
            offsetX={60}
            offsetY={60}
          />
        </>
      )}

      {safeTable.type === "square" && (
        <>
          <Rect
            width={160}
            height={160}
            offsetX={80}
            offsetY={80}
            fill={isHighlighted ? "#60A5FA" : "#3b82f6"}
            shadowBlur={4}
          />
          <Text
            text={`${safeTable.name}\n${occupiedCount}/${safeTable.seats}`}
            fontSize={18}
            fill="white"
            align="center"
            verticalAlign="middle"
            width={160}
            height={160}
            offsetX={80}
            offsetY={80}
          />
        </>
      )}

      {/* ================= SEATS ================= */}
      {seatsCoords.map((c, i) => {
        const seatGuest = assigned.find((s) => s.seatIndex === i);
        const isFree = !seatGuest;
        const isInHighlight = highlightedSeats.includes(i);

        const guestName = seatGuest
          ? guests.find(
              (g) =>
                g._id?.toString() ===
                seatGuest.guestId?.toString()
            )?.name ?? ""
          : "";

        return (
          <Group key={i} x={c.x} y={c.y}>
            {isInHighlight && (
              <Circle radius={14} fill="#34d399" opacity={0.5} />
            )}

            <Circle
              radius={10}
              fill={isFree ? "#3b82f6" : "#d1d5db"}
              stroke="#2563eb"
              strokeWidth={1}
              onClick={() =>
                !isFree &&
                handleSeatDrag(seatGuest?.guestId)
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

            {!isFree && guestName && (
              <Text
                text={guestName}
                offsetY={18}
                align="center"
                fontSize={12}
                fill="#374151"
                width={80}
                offsetX={40}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}
