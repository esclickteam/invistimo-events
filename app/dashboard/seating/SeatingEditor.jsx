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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [bgImage] = useImage(background || "", "anonymous");
  const stageRef = useRef();

  /* 📏 גודל הקנבס */
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

  /* ➕ הוספת שולחן חדש */
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

  /* 🎯 גרירה של שולחן */
  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

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
        return {
          ...t,
          seatedGuests: [...t.seatedGuests, guest],
        };
      })
    );

    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestId ? { ...g, tableId } : g
      )
    );
  };

  /* 🎨 ציור שולחן ריאליסטי */
  const renderTable = (table) => {
    const usedSeats = table.seatedGuests.reduce((s, g) => s + g.count, 0);
    const remaining = table.seats - usedSeats;

    const seatRadius = 8;
    const tableRadius = table.type === "round" ? 50 : 45;

    const chairs = [];
    for (let i = 0; i < table.seats; i++) {
      let angle = (i / table.seats) * Math.PI * 2;
      let x = tableRadius * Math.cos(angle);
      let y = tableRadius * Math.sin(angle);

      chairs.push(
        <Group key={`chair-${i}`}>
          <Circle x={x} y={y} radius={seatRadius} fill="#fbbf24" />
          {table.seatedGuests[i] && (
            <Text
              x={x - 20}
              y={y - 25}
              text={table.seatedGuests[i].name}
              fontSize={11}
              fill="#fff"
              width={40}
              align="center"
            />
          )}
        </Group>
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
      >
        <Circle radius={tableRadius - 10} fill="#3b82f6" />
        {chairs}
        <Text
          text={table.name}
          y={-8}
          fontSize={13}
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
