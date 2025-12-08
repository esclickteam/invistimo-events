"use client";
import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Circle, Group, Text, Image } from "react-konva";
import useImage from "use-image";
import GuestSidebar from "./GuestSidebar";
import TableView from "./TableView";
import AddTableModal from "./AddTableModal";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([
    { id: "g1", name: "דנה לוי", count: 3, tableId: null },
    { id: "g2", name: "משפחת כהן", count: 2, tableId: null },
    { id: "g3", name: "נועם ישראלי", count: 1, tableId: null },
  ]);

  const [selectedTable, setSelectedTable] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showAddModal, setShowAddModal] = useState(false);

  const stageRef = useRef();
  const [bgImage] = useImage(background || "", "anonymous");

  /* ---------------- RESIZE ---------------- */
  useEffect(() => {
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 80,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ---------------- ADD TABLE ---------------- */
  const handleAddTable = ({ type, seats }) => {
    setTables((prev) => [
      ...prev,
      {
        id: `t_${Date.now()}`,
        type,
        seats,
        x: 300,
        y: 250,
        name: `שולחן ${prev.length + 1}`,
        seatedGuests: [],
      },
    ]);
  };

  /* ---------------- DRAG TABLE ---------------- */
  const handleDrag = (id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  };

  /* ---------------- DRAG GUEST ---------------- */
  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData("guest", JSON.stringify(guest));
  };

  /* ---------------- FIND CONTINUOUS BLOCK ---------------- */
  const findBlock = (table, needed) => {
    const used = new Set(table.seatedGuests.map((g) => g.seatIndex));
    const seats = table.seats;
    for (let start = 0; start <= seats - needed; start++) {
      let ok = true;
      for (let offset = 0; offset < needed; offset++) {
        if (used.has(start + offset)) {
          ok = false;
          break;
        }
      }
      if (ok) return start;
    }
    return null;
  };

  /* ---------------- DROP ---------------- */
  const handleDropGuest = (e) => {
    const raw = e.evt.dataTransfer.getData("guest");
    if (!raw) return;
    const guest = JSON.parse(raw);
    const pointer = stageRef.current.getPointerPosition();
    if (!pointer) return;

    const table = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      return Math.sqrt(dx * dx + dy * dy) < 200;
    });
    if (!table) return;

    const startIndex = findBlock(table, guest.count);
    if (startIndex === null) {
      alert("אין מספיק מקומות רצופים בשולחן");
      return;
    }

    assignGuestBlock(table.id, startIndex, guest.id);
  };

  /* ---------------- ASSIGN MULTI-SEAT BLOCK ---------------- */
  const assignGuestBlock = (tableId, startIndex, guestId) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;
    const block = [];
    for (let i = 0; i < guest.count; i++) {
      block.push({ ...guest, seatIndex: startIndex + i });
    }
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, seatedGuests: [...t.seatedGuests, ...block] }
          : t
      )
    );
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId } : g))
    );
  };

  /* ---------------- REMOVE WHOLE BLOCK ---------------- */
  const removeSeat = (tableId, seatIndex) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    const item = table.seatedGuests.find((g) => g.seatIndex === seatIndex);
    if (!item) return;
    const guestId = item.id;

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, seatedGuests: t.seatedGuests.filter((g) => g.id !== guestId) }
          : t
      )
    );
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId: null } : g))
    );
  };

  /* ---------------- SEAT POSITIONS (SIDES + UX) ---------------- */
  const getCoords = (table) => {
    const seats = table.seats;
    const coords = [];

    if (table.type === "round") {
      const baseRadius = 75;
      const radius =
        seats <= 6
          ? baseRadius + 10
          : seats <= 10
          ? baseRadius + 20
          : seats <= 14
          ? baseRadius + 30
          : baseRadius + 40;

      for (let i = 0; i < seats; i++) {
        const angle = (i / seats) * Math.PI * 2;
        coords.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          rotation: (angle * 180) / Math.PI + 90,
        });
      }
    }

    if (table.type === "square" || table.type === "banquet") {
      const width = table.type === "square" ? 140 : 220;
      const height = table.type === "square" ? 140 : 80;
      const margin = 30;

      const perSide = Math.ceil(seats / 4);
      const spacingX = width / (perSide + 1);
      const spacingY = height / (perSide + 1);

      for (let i = 0; i < seats; i++) {
        const side = Math.floor((i * 4) / seats);
        const pos = i % perSide;
        let x = 0,
          y = 0,
          rotation = 0;

        if (side === 0) {
          x = -width / 2 + spacingX * (pos + 1);
          y = -height / 2 - margin;
          rotation = 180;
        } else if (side === 1) {
          x = width / 2 + margin;
          y = -height / 2 + spacingY * (pos + 1);
          rotation = -90;
        } else if (side === 2) {
          x = width / 2 - spacingX * (pos + 1);
          y = height / 2 + margin;
          rotation = 0;
        } else {
          x = -width / 2 - margin;
          y = -height / 2 + spacingY * (pos + 1);
          rotation = 90;
        }
        coords.push({ x, y, rotation });
      }
    }

    return coords;
  };

  /* ---------------- RENDER TABLE ---------------- */
  const renderTable = (table) => {
    const coords = getCoords(table);
    return (
      <Group
        key={table.id}
        x={table.x}
        y={table.y}
        draggable
        onDragEnd={(e) => handleDrag(table.id, e)}
        onClick={() => setSelectedTable(table)}
      >
        {table.type === "round" && <Circle radius={60} fill="#3b82f6" />}
        {table.type === "square" && (
          <Rect width={140} height={140} offsetX={70} offsetY={70} fill="#3b82f6" />
        )}
        {table.type === "banquet" && (
          <Rect width={220} height={80} offsetX={110} offsetY={40} fill="#3b82f6" />
        )}

        {/* 💺 Chairs with color states */}
        {coords.map((c, i) => {
          const isOccupied = table.seatedGuests?.some((g) => g.seatIndex === i);
          return (
            <Group key={i} x={c.x} y={c.y} rotation={c.rotation || 0}>
              <Circle
                radius={10}
                fill={isOccupied ? "#D1D5DB" : "#3B82F6"} // אפור תפוס, כחול פנוי
                stroke="#9CA3AF"
                strokeWidth={1}
              />
              <Rect
                width={10}
                height={6}
                y={-12}
                offsetX={5}
                cornerRadius={2}
                fill={isOccupied ? "#9CA3AF" : "#2563EB"} // גוון כהה יותר לפנוי
              />
            </Group>
          );
        })}

        <Text
          text={table.name}
          y={-10}
          fontSize={14}
          fill="white"
          align="center"
          width={200}
          offsetX={100}
        />
      </Group>
    );
  };

  return (
    <div className="flex h-full">
      <GuestSidebar guests={guests} tables={tables} onDragStart={handleGuestDragStart} />
      <div className="flex-1 relative">
        <Stage
          width={dimensions.width - 260}
          height={dimensions.height}
          ref={stageRef}
          onDrop={handleDropGuest}
          onDragOver={(e) => e.evt.preventDefault()}
        >
          <Layer>
            {bgImage && (
              <Image
                image={bgImage}
                width={dimensions.width}
                height={dimensions.height}
                opacity={0.25}
              />
            )}
            {tables.map((table) => renderTable(table))}
          </Layer>
        </Stage>

        {selectedTable && (
          <TableView
            table={tables.find((t) => t.id === selectedTable.id)}
            availableGuests={guests.filter((g) => !g.tableId)}
            onAssignSeat={assignGuestBlock}
            onRemoveSeat={removeSeat}
            onClose={() => setSelectedTable(null)}
          />
        )}

        {showAddModal && (
          <AddTableModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddTable}
          />
        )}

        <button
          onClick={() => setShowAddModal(true)}
          className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow"
        >
          ➕ הוסף שולחן
        </button>
      </div>
    </div>
  );
}
