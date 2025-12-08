"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Image, Line } from "react-konva";
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
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [bgImage] = useImage(background || "", "anonymous");
  const stageRef = useRef();

  /* 📏 עדכון גודל קנבס */
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

  /* ➕ הוספת שולחן */
  const handleAddTable = (type = "rect", seats = 10) => {
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

  /* 🎯 גרירה של שולחן */
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

  /* 🧍‍♀️ גרירת אורחים */
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

  /* 🎨 ציור שולחנות */
  const renderTable = (table) => {
    const usedSeats = table.seatedGuests.reduce((s, g) => s + g.count, 0);
    const width = 160;
    const height = 60;
    const radius = 50;

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
        {table.type === "rect" && (
          <Rect width={width} height={height} fill="#60a5fa" cornerRadius={8} />
        )}
        {table.type === "round" && <Circle radius={radius} fill="#60a5fa" />}
        {table.type === "knights" && (
          <Line
            points={[0, 0, 100, 0, 80, 60, 20, 60]}
            closed
            fill="#60a5fa"
          />
        )}

        {/* שם השולחן */}
        <Text
          text={table.name}
          x={-20}
          y={table.type === "round" ? -5 : height / 3}
          fontSize={13}
          fill="white"
        />

        {/* ספירה */}
        <Text
          text={`${usedSeats}/${table.seats} הושבו`}
          x={-25}
          y={table.type === "round" ? 20 : height + 20}
          fontSize={12}
          fill="#ffffffcc"
        />

        {/* שמות האורחים */}
        {table.seatedGuests.map((g, i) => (
          <Text
            key={`${g.id}_${i}`}
            text={`${g.name} (${g.count})`}
            x={-25}
            y={height + 40 + i * 14}
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
                <Image image={bgImage} width={dimensions.width} height={dimensions.height} />
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

        <AddTableModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddTable}
        />
      </div>
    </div>
  );
}
