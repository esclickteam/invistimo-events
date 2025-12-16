"use client";

import { useRef, useMemo, useState } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   חישוב כיסאות סימטריים סביב השולחן
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

    const base = Math.floor(seats / 4);
    const remainder = seats % 4;
    const sides = [base, base, base, base];
    for (let i = 0; i < remainder; i++) sides[i]++;

    // עליון
    for (let i = 0; i < sides[0]; i++) {
      const offset = -((sides[0] - 1) * gap) / 2 + i * gap;
      result.push({ x: offset, y: -half });
    }

    // ימין
    for (let i = 0; i < sides[1]; i++) {
      const offset = -((sides[1] - 1) * gap) / 2 + i * gap;
      result.push({ x: half, y: offset });
    }

    // תחתון
    for (let i = 0; i < sides[2]; i++) {
      const offset = ((sides[2] - 1) * gap) / 2 - i * gap;
      result.push({ x: offset, y: half });
    }

    // שמאל
    for (let i = 0; i < sides[3]; i++) {
      const offset = ((sides[3] - 1) * gap) / 2 - i * gap;
      result.push({ x: -half, y: offset });
    }
  }

  /* ========= BANQUET ========= */
  if (table.type === "banquet") {
    const width = 240;
    const gap = 24;
    const sideY = 59;
    const base = Math.floor(seats / 2);
    const remainder = seats % 2;

    const topCount = base + (remainder > 0 ? 1 : 0);
    const bottomCount = base;

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
  const [isOverTrash, setIsOverTrash] = useState(false);

  /* ===== Zustand ===== */
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

  /* ================= DROP HANDLER ================= */
  const handleDrop = (e) => {
    e.cancelBubble = true;
    if (!draggingGuest) return;

    assignGuestBlock({
      guestId: draggingGuest.id,
      tableId: table.id,
    });
  };

  /* ============================================================
     ✅ CLICK HANDLER – פתיחת מודאל הוספת אורחים
  ============================================================ */
  const handleClick = (e) => {
    e.cancelBubble = true;
    if (draggingGuest) return;

    if (typeof table.openAddGuestModal === "function") {
      table.openAddGuestModal();
    }
  };

  /* ============================================================
     🗑️ זיהוי גרירה מעל פח
  ============================================================ */
  const handleDragMove = (e) => {
    updatePositionInStore();
    const pos = e.target.position();

    // אזור הפח בצד ימין תחתון
    if (pos.x > 800 && pos.y > 450) {
      setIsOverTrash(true);
    } else {
      setIsOverTrash(false);
    }
  };

  const handleDragEnd = (e) => {
    updatePositionInStore();
    if (isOverTrash) {
      removeTable(table.id);
    }
    setIsOverTrash(false);
  };

  return (
    <>
      {/* ===== פח למחיקה ===== */}
      <Group x={820} y={470}>
        <Rect
          width={80}
          height={80}
          fill={isOverTrash ? "#ef4444" : "#f3f4f6"}
          cornerRadius={10}
          shadowBlur={4}
        />
        <Text
          text="🗑️"
          fontSize={36}
          align="center"
          verticalAlign="middle"
          width={80}
          height={80}
        />
      </Group>

      {/* ===== שולחן ===== */}
      <Group
        ref={tableRef}
        x={table.x}
        y={table.y}
        rotation={table.rotation || 0}
        draggable
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onMouseUp={handleDrop}
        onClick={handleClick}
      >
        {/* ===== גוף השולחן ===== */}
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
    </>
  );
}
