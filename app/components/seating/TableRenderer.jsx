"use client";

import { useRef, useEffect } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { getSeatCoordinates } from "@/logic/seatingEngine";

export default function TableRenderer({ table }) {
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const highlightedSeats = useSeatingStore((s) => s.highlightedSeats);

  const deleteTable = useSeatingStore((s) => s.deleteTable);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const guests = useSeatingStore((s) => s.guests);

  const tableRef = useRef();
  const seatsCoords = getSeatCoordinates(table);

  const isHighlighted = highlightedTable === table.id;
  const assigned = table.seatedGuests || [];
  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;

  /* -------- UPDATE POS -------- */
  const updatePositionInStore = () => {
    if (!tableRef.current) return;

    const pos = tableRef.current.getPosition();
    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id ? { ...t, x: pos.x, y: pos.y } : t
      ),
    }));
  };

  useEffect(() => {
    updatePositionInStore();
  }, []);

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
      onDragMove={updatePositionInStore}
      onDragEnd={updatePositionInStore}
      onClick={() =>
        useSeatingStore.setState({
          highlightedTable: table.id,
          highlightedSeats: [],
        })
      }
    >
      {/* -------------------------------- DELETE BUTTON (ON TOP) ------------------------------- */}
      {isHighlighted && (
        <Group
          x={0}
          y={-110}
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true; 
            deleteTable(table.id);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            deleteTable(table.id);
          }}
        >
          <Rect
            width={110}
            height={36}
            offsetX={55}
            fill="#ef4444"
            cornerRadius={6}
            shadowBlur={6}
            listening={true}
            onClick={(e) => { e.cancelBubble = true; deleteTable(table.id); }}
            onTap={(e) => { e.cancelBubble = true; deleteTable(table.id); }}
          />
          <Text
            text="מחק שולחן"
            fontSize={16}
            fill="white"
            align="center"
            verticalAlign="middle"
            width={110}
            height={36}
            offsetX={55}
            listening={true}
            onClick={(e) => { e.cancelBubble = true; deleteTable(table.id); }}
            onTap={(e) => { e.cancelBubble = true; deleteTable(table.id); }}
          />
        </Group>
      )}

      {/* -------------------------------- TABLE SHAPES ------------------------------- */}

      {table.type === "round" && (
        <>
          <Circle
            radius={60}
            fill={isHighlighted ? "#60A5FA" : "#3b82f6"}
            shadowBlur={4}
          />

          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
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

      {table.type === "square" && (
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
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
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

      {table.type === "banquet" && (
        <>
          <Rect
            width={240}
            height={90}
            offsetX={120}
            offsetY={45}
            fill={isHighlighted ? "#60A5FA" : "#3b82f6"}
            shadowBlur={4}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill="white"
            align="center"
            verticalAlign="middle"
            width={240}
            height={90}
            offsetX={120}
            offsetY={45}
          />
        </>
      )}

      {/* -------------------------------- SEATS ------------------------------- */}

      {seatsCoords.map((c, i) => {
        const seatGuest = assigned.find((s) => s.seatIndex === i);
        const isFree = !seatGuest;
        const isInHighlight = highlightedSeats.includes(i);

        const guestName = !isFree
          ? guests.find((g) => g.id === seatGuest.guestId)?.name
          : null;

        return (
          <Group key={i} x={c.x} y={c.y} rotation={(c.rotation * 180) / Math.PI}>
            {isInHighlight && (
              <Circle radius={14} fill="#34d399" opacity={0.5} />
            )}

            <Circle
              radius={10}
              fill={isFree ? "#3b82f6" : "#d1d5db"}
              stroke="#2563eb"
              strokeWidth={1}
              onClick={() => !isFree && handleSeatDrag(seatGuest.guestId)}
            />

            <Rect
              width={12}
              height={6}
              y={-14}
              offsetX={6}
              cornerRadius={2}
              fill={isFree ? "#2563eb" : "#9ca3af"}
            />

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
