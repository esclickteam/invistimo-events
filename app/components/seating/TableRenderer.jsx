"use client";

import { useRef, useMemo } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סימטריים סביב שולחן – צדדים נגדיים
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

    // חישוב סימטרי אמיתי: זוגות צדדים נגדיים
    const pairs = Math.floor(seats / 2);
    const remainder = seats % 2;

    // כמות לכל צד
    const top = Math.ceil(pairs / 2);
    const bottom = Math.floor(pairs / 2);
    const left = remainder > 0 ? Math.ceil(remainder / 2) : 0;
    const right = remainder > 0 ? Math.floor(remainder / 2) : 0;

    // עליון
    for (let i = 0; i < top; i++) {
      const offset = -((top - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: -half });
    }

    // תחתון
    for (let i = 0; i < bottom; i++) {
      const offset = -((bottom - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: half });
    }

    // שמאל
    for (let i = 0; i < left; i++) {
      const offset = -((left - 1) * gap) / 2 + i * gap;
      result.push({ x: -half, y: offset });
    }

    // ימין
    for (let i = 0; i < right; i++) {
      const offset = -((right - 1) * gap) / 2 + i * gap;
      result.push({ x: half, y: offset });
    }

    // אם יש עדיין כיסאות חסרים – נשלים סימטרית
    while (result.length < seats) {
      result.push({ x: 0, y: half + 20 * (result.length - seats / 2) });
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

  const handleDrop = (e) => {
    e.cancelBubble = true;
    if (!draggingGuest) return;
    assignGuestBlock({
      guestId: draggingGuest.id,
      tableId: table.id,
    });
  };

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

  return (
    <>
      {/* ===== שולחן ===== */}
      <Group
        ref={tableRef}
        x={table.x}
        y={table.y}
        rotation={table.rotation || 0}
        draggable
        onDragMove={updatePositionInStore}
        onDragEnd={handleDragEnd}
        onMouseUp={handleDrop}
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

        {/* ===== כיסאות ===== */}
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

      {/* ===== כפתור מחיקה קבוע (למעלה) ===== */}
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
    </>
  );
}
