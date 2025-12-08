"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Image } from "react-konva";
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [bgImage] = useImage(background || "", "anonymous");
  const stageRef = useRef();

  /* 📏 גודל הקנבס */
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

  /* ➕ הוספת שולחן חדש */
  const handleAddTable = ({ type, seats }) => {
    const newTable = {
      id: `table_${Date.now()}`,
      type,
      seats,
      x: 150 + tables.length * 150,
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

        const used = t.seatedGuests.reduce((sum, g) => sum + g.count, 0);
        if (used + guest.count > t.seats) {
          alert("אין מספיק מקומות בשולחן הזה 😅");
          return t;
        }

        const newSeats = [];
        for (let i = 0; i < guest.count; i++) {
          newSeats.push({ ...guest, seatIndex: used + i });
        }

        return { ...t, seatedGuests: [...t.seatedGuests, ...newSeats] };
      })
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId } : g))
    );
  };

  /* 🎨 ציור שולחנות תלת-ממדיים */
  const renderTable = (table) => {
    const usedSeats = table.seatedGuests.length;
    const seatRadius = 9;
    const chairs = [];
    const guestsAtTable = table.seatedGuests;

    const drawChair = (x, y, guestAtSeat) => (
      <Group key={`${x}-${y}`}>
        <Circle
          x={x}
          y={y}
          radius={seatRadius}
          fill={guestAtSeat ? "#22c55e" : "#d1d5db"}
          shadowBlur={guestAtSeat ? 10 : 4}
          shadowColor={guestAtSeat ? "#22c55e" : "#9ca3af"}
        />
        {guestAtSeat && (
          <Text
            x={x - 25}
            y={y - 25}
            text={guestAtSeat.name}
            fontSize={10}
            fill="white"
            width={50}
            align="center"
            shadowColor="#00000080"
            shadowBlur={3}
          />
        )}
      </Group>
    );

    if (table.type === "round") {
      const radius = 55;
      for (let i = 0; i < table.seats; i++) {
        const angle = (i / table.seats) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        chairs.push(drawChair(x, y, guestsAtTable[i]));
      }
    }

    if (table.type === "square") {
      const side = Math.ceil(table.seats / 4);
      let idx = 0;
      const spacing = 26;
      for (let i = 0; i < side; i++)
        chairs.push(drawChair(-55 + i * spacing, -60, guestsAtTable[idx++]));
      for (let i = 0; i < side; i++)
        chairs.push(drawChair(60, -55 + i * spacing, guestsAtTable[idx++]));
      for (let i = 0; i < side; i++)
        chairs.push(drawChair(55 - i * spacing, 60, guestsAtTable[idx++]));
      for (let i = 0; i < side; i++)
        chairs.push(drawChair(-60, 55 - i * spacing, guestsAtTable[idx++]));
    }

    if (table.type === "rect") {
      const perSide = Math.ceil(table.seats / 2);
      const spacing = 25;
      let idx = 0;
      for (let i = 0; i < perSide; i++)
        chairs.push(drawChair(-70 + i * spacing, -40, guestsAtTable[idx++]));
      for (let i = 0; i < perSide; i++)
        chairs.push(drawChair(-70 + i * spacing, 40, guestsAtTable[idx++]));
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
        {/* גוף השולחן */}
        {table.type === "round" && (
          <Circle radius={40} fillLinearGradientStartPoint={{ x: -20, y: -20 }} fillLinearGradientEndPoint={{ x: 20, y: 20 }} fillLinearGradientColorStops={[0, "#60a5fa", 1, "#2563eb"]} shadowBlur={8} shadowColor="#00000080" />
        )}
        {table.type === "square" && (
          <Rect
            width={80}
            height={80}
            offsetX={40}
            offsetY={40}
            cornerRadius={10}
            fillLinearGradientStartPoint={{ x: -40, y: -40 }}
            fillLinearGradientEndPoint={{ x: 40, y: 40 }}
            fillLinearGradientColorStops={[0, "#60a5fa", 1, "#2563eb"]}
            shadowBlur={8}
            shadowColor="#00000080"
          />
        )}
        {table.type === "rect" && (
          <Rect
            width={120}
            height={50}
            offsetX={60}
            offsetY={25}
            cornerRadius={8}
            fillLinearGradientStartPoint={{ x: -60, y: -25 }}
            fillLinearGradientEndPoint={{ x: 60, y: 25 }}
            fillLinearGradientColorStops={[0, "#60a5fa", 1, "#2563eb"]}
            shadowBlur={8}
            shadowColor="#00000080"
          />
        )}

        {chairs}

        {/* טקסטים */}
        <Text
          text={table.name}
          y={-8}
          fontSize={13}
          fill="white"
          align="center"
          width={120}
          x={-60}
          shadowColor="#00000080"
          shadowBlur={2}
        />
        <Text
          text={`${usedSeats}/${table.seats} הושבו`}
          y={12}
          fontSize={12}
          fill="#ffffffcc"
          align="center"
          width={120}
          x={-60}
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
          onClick={() => setShowAddModal(true)}
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

        {showAddModal && (
          <AddTableModal onClose={() => setShowAddModal(false)} onAdd={handleAddTable} />
        )}
      </div>
    </div>
  );
}
