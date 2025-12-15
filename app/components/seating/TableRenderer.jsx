"use client";

import { useRef, useEffect, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { getSeatCoordinates } from "@/logic/seatingEngine";

export default function TableRenderer({ table }) {
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const highlightedSeats = useSeatingStore((s) => s.highlightedSeats);

  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const guests = useSeatingStore((s) => s.guests);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);

  const tableRef = useRef(null);

  const seatsCoords = getSeatCoordinates(table);
  const assigned = table.seatedGuests || [];
  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;

  /* ================= ID NORMALIZATION ================= */
  const normalizeGuestId = (g) => String(g?.id ?? g?._id ?? "");

  /* ================= SELECTED GUEST ================= */
  const hasSelectedGuestInThisTable = useMemo(() => {
    if (!selectedGuestId) return false;
    return assigned.some(
      (s) => String(s?.guestId) === String(selectedGuestId)
    );
  }, [assigned, selectedGuestId]);

  const isHighlighted =
    highlightedTable === table.id || hasSelectedGuestInThisTable;

  /* ================= UPDATE POSITION ================= */
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
    const g = (guests || []).find(
      (x) => normalizeGuestId(x) === String(guestId)
    );
    if (g) startDragGuest(g);
  };

  /* ================= COLORS ================= */
  const tableFill = isHighlighted ? "#fde047" : "#3b82f6";
  const tableText = isHighlighted ? "#713f12" : "white";

  /* ================= BANQUET SIZE ================= */
  const isBanquet = table.type === "banquet" || table.type === "knights";
  const orientation = table.orientation || "horizontal";

  const banquetWidth = orientation === "horizontal" ? 260 : 100;
  const banquetHeight = orientation === "horizontal" ? 100 : 260;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      draggable
      onDragStart={(e) => (e.cancelBubble = true)}
      onDragMove={(e) => {
        e.cancelBubble = true;
        updatePositionInStore();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        updatePositionInStore();
      }}
      onMouseDown={(e) => (e.cancelBubble = true)}
      onTouchStart={(e) => (e.cancelBubble = true)}
      onClick={(e) => {
        if (e.target?.attrs?.isDeleteButton) return;
        e.cancelBubble = true;

        useSeatingStore.setState({
          highlightedTable: table.id,
          highlightedSeats: [],
        });

        if (table.openAddGuestModal) {
          table.openAddGuestModal(table);
        }
      }}
    >
      {/* ================= TABLE SHAPE ================= */}

      {/* ROUND */}
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

      {/* SQUARE */}
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

      {/* BANQUET / KNIGHTS */}
      {isBanquet && (
        <>
          <Rect
            width={banquetWidth}
            height={banquetHeight}
            offsetX={banquetWidth / 2}
            offsetY={banquetHeight / 2}
            fill={tableFill}
            shadowBlur={10}
            cornerRadius={14}
          />
          <Text
            text={`${table.name}\n${occupiedCount}/${table.seats}`}
            fontSize={18}
            fill={tableText}
            align="center"
            verticalAlign="middle"
            width={banquetWidth}
            height={banquetHeight}
            offsetX={banquetWidth / 2}
            offsetY={banquetHeight / 2}
          />
        </>
      )}

      {/* ================= SEATS ================= */}
      {seatsCoords.map((c, i) => {
        const seatGuest = assigned.find((s) => s.seatIndex === i);
        const isFree = !seatGuest;

        const isInHoverHighlight = highlightedSeats.includes(i);

        const isSelectedSeat =
          !!seatGuest &&
          !!selectedGuestId &&
          String(seatGuest.guestId) === String(selectedGuestId);

        const guestName = !isFree
          ? (guests || []).find(
              (g) => normalizeGuestId(g) === String(seatGuest.guestId)
            )?.name
          : null;

        return (
          <Group
            key={i}
            x={c.x}
            y={c.y}
            rotation={(c.rotation * 180) / Math.PI}
          >
            {isInHoverHighlight && (
              <Circle radius={14} fill="#34d399" opacity={0.5} />
            )}

            {isSelectedSeat && (
              <Circle radius={16} fill="#fde047" opacity={0.9} />
            )}

            <Circle
              radius={10}
              fill={
                isSelectedSeat
                  ? "#facc15"
                  : isFree
                  ? "#3b82f6"
                  : "#d1d5db"
              }
              stroke={isSelectedSeat ? "#eab308" : "#2563eb"}
              strokeWidth={isSelectedSeat ? 2 : 1}
              onClick={() => !isFree && handleSeatDrag(seatGuest.guestId)}
            />

            <Rect
              width={12}
              height={6}
              y={-14}
              offsetX={6}
              cornerRadius={2}
              fill={
                isSelectedSeat
                  ? "#eab308"
                  : isFree
                  ? "#2563eb"
                  : "#9ca3af"
              }
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
