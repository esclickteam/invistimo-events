"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import useImage from "use-image";
import GuestSidebar from "./GuestSidebar";
import AddTableModal from "./AddTableModal";

export const dynamic = "force-dynamic";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([
    { id: "g1", name: "דנה לוי", count: 2, tableId: null },
    { id: "g2", name: "משפחת כהן", count: 3, tableId: null },
    { id: "g3", name: "נועם ישראלי", count: 1, tableId: null },
    { id: "g4", name: "רותם דויד", count: 2, tableId: null },
  ]);

  const [selectedTable, setSelectedTable] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const stageRef = useRef();
  const [bgImage] = useImage(background || "", "anonymous");

  /* 📏 גודל קנבס */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateSize = () =>
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 80,
        });
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, []);

  /* ➕ יצירת שולחן חדש */
  const handleAddTable = ({ type, seats }) => {
    const newTable = {
      id: `שולחן ${tables.length + 1}`,
      type,
      seats,
      x: 200 + tables.length * 120,
      y: 200,
      name: `שולחן ${tables.length + 1}`,
      seatedGuests: [],
    };
    setTables((prev) => [...prev, newTable]);
  };

  /* 🎯 גרירה */
  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x, y } : t))
    );
  }, []);

  /* ✏️ עריכת שם שולחן */
  const handleDoubleClick = (table) => {
    setEditingId(table.id);
    setEditText(table.name);
    setEditPosition({
      x: table.x + 40,
      y: table.y + 45,
    });
  };

  const handleEditBlur = () => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === editingId ? { ...t, name: editText } : t
      )
    );
    setEditingId(null);
  };

  /* 🧍 גרירת אורח */
  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData("guestId", guest.id);
  };

  const handleGuestDrop = (tableId, e) => {
    const guestId = e.dataTransfer.getData("guestId");
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const used = t.seatedGuests.reduce((s, g) => s + g.count, 0);
        if (used + guest.count > t.seats) {
          alert("אין מספיק מקומות בשולחן הזה 😅");
          return t;
        }
        return { ...t, seatedGuests: [...t.seatedGuests, { ...guest }] };
      })
    );

    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestId ? { ...g, tableId } : g
      )
    );
  };

  /* 🎨 ציור שולחן */
  const renderTable = (table) => {
    const usedSeats = table.seatedGuests.reduce((s, g) => s + g.count, 0);
    const color =
      usedSeats >= table.seats ? "#f87171" : "#60a5fa";

    return (
      <Group
        key={table.id}
        x={table.x}
        y={table.y}
        draggable
        onDragEnd={(e) => handleDrag(table.id, e)}
        onClick={() => setSelectedTable(table)}
        onDblClick={() => handleDoubleClick(table)}
        onDrop={(e) => handleGuestDrop(table.id, e)}
        onDragOver={(e) => e.preventDefault()}
      >
        {table.type === "round" && <Circle radius={50} fill={color} />}
        {table.type === "square" && (
          <Rect width={80} height={80} fill={color} cornerRadius={6} />
        )}
        {table.type === "rect" && (
          <Rect width={140} height={60} fill={color} cornerRadius={6} />
        )}

        <Text
          text={table.name}
          y={table.type === "round" ? -5 : 10}
          x={-25}
          fontSize={13}
          fill="white"
        />

        <Text
          text={`${usedSeats}/${table.seats} הושבו`}
          y={table.type === "round" ? 20 : 30}
          x={-25}
          fontSize={12}
          fill="#ffffffcc"
        />

        {table.seatedGuests.map((g, i) => (
          <Text
            key={g.id + i}
            text={`${g.name} (${g.count})`}
            y={50 + i * 14}
            x={-25}
            fontSize={12}
            fill="#fff"
          />
        ))}
      </Group>
    );
  };

  return (
    <div className="flex h-full">
      <div className="min-w-[260px] max-w-[260px] bg-white border-r z-30">
        <GuestSidebar guests={guests} onDragStart={handleGuestDragStart} />
      </div>

      <div className="flex-1 relative bg-gray-100 overflow-hidden">
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700"
        >
          ➕ הוסף שולחן
        </button>

        {dimensions.width > 0 && (
          <Stage width={dimensions.width - 260} height={dimensions.height} ref={stageRef}>
            <Layer>
              {bgImage && (
                <Rect
                  width={dimensions.width}
                  height={dimensions.height}
                  fillPatternImage={bgImage}
                />
              )}
              {tables.map((table) => renderTable(table))}
            </Layer>
          </Stage>
        )}

        {editingId && (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditBlur}
            autoFocus
            className="absolute z-30 border border-blue-400 rounded-md px-2 py-1 text-sm"
            style={{ top: editPosition.y, left: editPosition.x }}
          />
        )}

        {isModalOpen && (
          <AddTableModal
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddTable}
          />
        )}
      </div>
    </div>
  );
}
