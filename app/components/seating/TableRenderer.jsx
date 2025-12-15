"use client";

import { useRef, useEffect, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { getSeatCoordinates } from "@/logic/seatingEngine";
import { snapPosition } from "@/logic/gridSnap";

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

  /* ================= GRID SNAP POSITION ================= */
  const updatePositionInStore = () => {
    if (!tableRef.current) return;

    const raw = tableRef.current.getPosition();
    const snapped = snapPosition(raw);

    tableRef.current.position(snapped);

    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id ? { ...t, x: snapped.x, y: snapped.y } : t
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

  /* ================= BANQUET ================= */
  const isBanquet = table.type === "banquet" || table.type === "knights";
  const orientation = table.orientation || "horizontal";

  const banquetWidth = orientation === "horizontal" ? 260 : 100;
  const banquetHeight = orientation === "horizontal" ? 100 : 260;

  const rotateBanquet = () => {
    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id
          ? {
              ...t,
              orientation:
                t.orientation === "vertical" ? "horizontal" : "vertical",
            }
          : t
      ),
    }));
  };

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      draggable
      onDragMove={(e) => {
        e.cancelBubble = true;
        updatePositionInStore();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        updatePositionInStore();
      }}
      onClick={(e) => {
        e.cancelBubble = true;

        // ✅ רק סימון שולחן – בלי לפתוח שום תפריט
        useSeatingStore.setState({
          highlightedTable: table.id,
          highlightedSeats: [],
        });
      }}
    >
      {/* ================= TABLE SHAPE ================= */}

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

          {/* 🔁 ROTATE */}
          <Group
            x={banquetWidth / 2 - 12}
            y={-banquetHeight / 2 - 26}
            onClick={(e) => {
              e.cancelBubble = true;
              rotateBanquet();
            }}
          >
            <Circle radius={14} fill="#111827" opacity={0.9} />
            <Text
              text="⟳"
              fontSize={16}
              fill="white"
              align="center"
              verticalAlign="middle"
              width={28}
              height={28}
              offsetX={14}
              offsetY={14}
            />
          </Group>
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
          ? guests.find(
              (g) => normalizeGuestId(g) === String(seatGuest.guestId)
            )?.name
          : null;

        return (
          <Group key={i} x={c.x} y={c.y}>
            {isInHoverHighlight && (
              <Circle radius={14} fill="#34d399" opacity={0.5} />
            )}

            <Circle
              radius={10}
              fill={isFree ? "#3b82f6" : "#d1d5db"}
              onClick={() => !isFree && handleSeatDrag(seatGuest.guestId)}
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
