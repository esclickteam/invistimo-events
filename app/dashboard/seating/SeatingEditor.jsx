"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Image } from "react-konva";
import useImage from "use-image";
import GuestSidebar from "./GuestSidebar";
import TableView from "./TableView";
import AddTableModal from "./AddTableModal";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([
    { id: "g1", name: "דנה לוי", count: 2, tableId: null },
    { id: "g2", name: "משפחת כהן", count: 3, tableId: null },
    { id: "g3", name: "נועם ישראלי", count: 1, tableId: null },
    { id: "g4", name: "רותם דויד", count: 2, tableId: null },
  ]);

  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [bgImage] = useImage(background || "", "anonymous");
  const stageRef = useRef();

  // 📏 גודל הקנבס
  useEffect(() => {
    const updateSize = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 80,
      });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ➕ הוספת שולחן
  const handleAddTable = ({ type, seats }) => {
    const newTable = {
      id: `table_${Date.now()}`,
      type,
      seats,
      x: 200 + tables.length * 120,
      y: 200,
      name: `שולחן ${tables.length + 1}`,
      seatedGuests: [],
    };
    setTables((prev) => [...prev, newTable]);
  };

  // 🎯 גרירה של שולחן
  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  // 🧍 גרירת אורח
  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData("guestId", guest.id);
  };

  // 🪑 השמת אורח בשולחן
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
        return {
          ...t,
          seatedGuests: [...t.seatedGuests, guest],
        };
      })
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId } : g))
    );
  };

  // 🎨 ציור שולחן
  const renderTable = (table) => {
    const usedSeats = table.seatedGuests.reduce((s, g) => s + g.count, 0);
    const seatRadius = 10;
    const chairs = [];

    for (let i = 0; i < table.seats; i++) {
      const angle = (i / table.seats) * Math.PI * 2;
      const radius = 70;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      const occupied = i < usedSeats;
      chairs.push(
        <Circle
          key={i}
          x={x}
          y={y}
          radius={seatRadius}
          fill={occupied ? "#22d3ee" : "#e5e7eb"}
          shadowBlur={occupied ? 10 : 3}
          shadowColor={occupied ? "#0ea5e9" : "#9ca3af"}
        />
      );
    }

    return (
      <Group
        key={table.id}
        x={table.x}
        y={table.y}
        draggable
        onDragEnd={(e) => handleDrag(table.id, e)}
        onDrop={(e) => handleGuestDrop(table.id, e)}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => setSelectedTable(table)}
      >
        <Circle radius={55} fill="#3b82f6" shadowBlur={8} shadowColor="#1d4ed8" />
        {chairs}
        <Text
          text={table.name}
          y={-5}
          fontSize={14}
          fill="white"
          align="center"
          width={100}
          x={-50}
        />
        <Text
          text={`${usedSeats}/${table.seats} הושבו`}
          y={10}
          fontSize={12}
          fill="#ffffffcc"
          align="center"
          width={100}
          x={-50}
        />
      </Group>
    );
  };

  return (
    <div className="flex h-full">
      <GuestSidebar guests={guests} onDragStart={handleGuestDragStart} />

      <div className="flex-1 relative bg-gray-100">
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700"
        >
          ➕ הוסף שולחן
        </button>

        {dimensions.width > 0 && (
          <Stage width={dimensions.width - 260} height={dimensions.height} ref={stageRef}>
            <Layer>
              {bgImage && (
                <Image
                  image={bgImage}
                  width={dimensions.width}
                  height={dimensions.height}
                  opacity={0.3}
                />
              )}
              {tables.map((table) => renderTable(table))}
            </Layer>
          </Stage>
        )}

        {showAddModal && (
          <AddTableModal onClose={() => setShowAddModal(false)} onAdd={handleAddTable} />
        )}

        {selectedTable && (
          <TableView
            table={selectedTable}
            onClose={() => setSelectedTable(null)}
          />
        )}
      </div>
    </div>
  );
}
