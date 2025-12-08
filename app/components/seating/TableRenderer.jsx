"use client";

import { useRef, useEffect } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { getSeatCoordinates } from "@/logic/seatingEngine";

export default function TableRenderer({ table }) {
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const highlightedSeats = useSeatingStore((s) => s.highlightedSeats);

  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const guests = useSeatingStore((s) => s.guests);

  const seatsCoords = getSeatCoordinates(table);
  const isHighlighted = highlightedTable === table.id;
  const assigned = table.seatedGuests || [];
  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;

  /* ---------------- REFS ---------------- */
  const tableRef = useRef();

  /* ------- UPDATE ABSOLUTE POSITION IN STORE ------- */
  const updateAbsolute = () => {
    if (!tableRef.current) return;
    const abs = tableRef.current.getAbsolutePosition();

    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id ? { ...t, absoluteX: abs.x, absoluteY: abs.y } : t
      ),
    }));
  };

  // update on first render (initial load)
  useEffect(() => {
    updateAbsolute();
  }, []);

  /* ---------------- CLICK ON OCCUPIED SEAT ---------------- */
  const handleSeatDrag = (guestId) => {
    const g = guests.find((x) => x.id === guestId);
    if (g) startDragGuest(g);
  };

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      draggable
      onDragMove={updateAbsolute}
      onDragEnd={updateAbsolute}
    >
      {/* TABLE SHAPE */}
      {table.type === "round" && (
        <Circle radius={60} fill={isHighlighted ? "#60A5FA" : "#3b82f6"} />
      )}

      {table.type === "square" && (
        <Rect
          width={160}
          height={160}
          offsetX={80}
          offsetY={80}
          fill={isHighlighted ? "#60A5FA" : "#3b82f6"}
        />
      )}

      {table.type === "banquet" && (
        <Rect
          width={240}
          height={90}
          offsetX={120}
          offsetY={45}
          fill={isHighlighted ? "#60A5FA" : "#3b82f6"}
        />
      )}

      {/* TABLE LABEL */}
      <Text
        text={`${table.name}\n${occupiedCount}/${table.seats}`}
        fontSize={16}
        fill="white"
        align="center"
        offsetY={10}
        width={160}
      />

      {/* SEATS */}
      {seatsCoords.map((c, i) => {
        const seatGuest = assigned.find((s) => s.seatIndex === i);
        const isFree = !seatGuest;
        const isInHighlight = highlightedSeats.includes(i);

        const guestName = !isFree
          ? guests.find((g) => g.id === seatGuest.guestId)?.name
          : null;

        return (
          <Group
            key={i}
            x={c.x}
            y={c.y}
            rotation={(c.rotation * 180) / Math.PI}
          >
            {/* Highlight seat */}
            {isInHighlight && (
              <Circle radius={14} fill="#34d399" opacity={0.5} />
            )}

            {/* Seat */}
            <Circle
              radius={10}
              fill={isFree ? "#3b82f6" : "#d1d5db"}
              stroke="#2563eb"
              strokeWidth={1}
              onClick={() => {
                if (!isFree) handleSeatDrag(seatGuest.guestId);
              }}
            />

            {/* Seat back */}
            <Rect
              width={12}
              height={6}
              y={-14}
              offsetX={6}
              cornerRadius={2}
              fill={isFree ? "#2563eb" : "#9ca3af"}
            />

            {/* Guest Name */}
            {!isFree && (
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
