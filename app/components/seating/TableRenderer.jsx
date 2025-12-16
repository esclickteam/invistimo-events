"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סימטריים מול צדדים (לא צמודים)
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
      });
    }
  }

  /* ========= SQUARE ========= */
  if (table.type === "square") {
    const size = 160;
    const gap = 26;
    const half = size / 2 + 16;

    // חלוקה סימטרית: צדדים נגדיים זהים
    const topBottom = Math.ceil(seats / 2);
    const perTop = Math.floor(topBottom / 2);
    const perSide = seats - topBottom;

    const leftSide = Math.ceil(perSide / 2);
    const rightSide = Math.floor(perSide / 2);

    // עליון
    for (let i = 0; i < perTop; i++) {
      const offset = -((perTop - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: -half });
    }

    // תחתון
    for (let i = 0; i < perTop; i++) {
      const offset = -((perTop - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: half });
    }

    // שמאל
    for (let i = 0; i < leftSide; i++) {
      const offset = -((leftSide - 1) * gap) / 2 + i * gap;
      result.push({ x: -half, y: offset });
    }

    // ימין
    for (let i = 0; i < rightSide; i++) {
      const offset = -((rightSide - 1) * gap) / 2 + i * gap;
      result.push({ x: half, y: offset });
    }
  }

  /* ========= BANQUET ========= */
  if (table.type === "banquet") {
    const width = 240;
    const gap = 24;
    const sideY = 59;
    const topCount = Math.ceil(seats / 2);
    const bottomCount = Math.floor(seats / 2);

    for (let i = 0; i < topCount; i++) {
      const offset = -((topCount - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: -sideY });
    }

    for (let i = 0; i < bottomCount; i++) {
      const offset = -((bottomCount - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: sideY });
    }
  }

  return result;
}

/* ============================================================
   TableRenderer
============================================================ */
export default function TableRenderer({ table }) {
  const tableRef = useRef(null);
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeTable = useSeatingStore((s) => s.removeTable);

  const assigned = table.seatedGuests || [];

  /* ===== Map seatIndex → guest ===== */
  const seatToGuestMap = useMemo(() => {
    const map = new Map();
    assigned.forEach((s) => {
      const g = guests.find(
        (guest) =>
          String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (g) map.set(s.seatIndex, g);
    });
    return map;
  }, [assigned, guests]);

  const occupiedCount = new Set(assigned.map((s) => s.seatIndex)).size;

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId));

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

  /* ================= מחיקה באמצעות גרירה מעל פח (HTML) ================= */
  const handleDragEnd = (e) => {
    updatePositionInStore();
    const pos = e.target.getClientRect();
    const trash = document.getElementById("trash-drop");
    if (trash) {
      const rect = trash.getBoundingClientRect();
      if (
        pos.x + pos.width / 2 > rect.left &&
        pos.x < rect.right &&
        pos.y + pos.height / 2 > rect.top &&
        pos.y < rect.bottom
      ) {
        removeTable(table.id);
      }
    }
  };

  /* ================= הצגה ================= */
  return (
    <>
      {/* כפתור מחיקה אמיתי מחוץ לקנבס */}
      <div
        id="trash-drop"
        className="fixed top-4 right-40 z-50 bg-white border border-gray-300 shadow-md rounded-xl w-12 h-12 flex items-center justify-center hover:bg-red-50 transition"
      >
        <img
          src="/icons/trash.svg"
          alt="delete"
          className="w-6 h-6 opacity-70 hover:opacity-100 transition"
        />
      </div>

      {/* השולחן עצמו */}
      <Group
        ref={tableRef}
        x={table.x}
        y={table.y}
        rotation={table.rotation || 0}
        draggable
        onDragMove={updatePositionInStore}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.cancelBubble = true;
          if (!draggingGuest && typeof table.openAddGuestModal === "function")
            table.openAddGuestModal();
        }}
      >
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

        {/* הכיסאות */}
        {seatsCoords.map((c, i) => {
          const guest = seatToGuestMap.get(i);
          return (
            <Group key={i} x={c.x} y={c.y}>
              <Circle
                radius={10}
                fill={guest ? "#d1d5db" : "#3b82f6"}
                stroke="#2563eb"
              />
              {guest && (
                <Text
                  text={guest.name}
                  fontSize={11}
                  y={14}
                  width={90}
                  offsetX={45}
                  align="center"
                  fill="#111827"
                />
              )}
            </Group>
          );
        })}
      </Group>
    </>
  );
}
