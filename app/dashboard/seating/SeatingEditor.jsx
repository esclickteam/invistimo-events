"use client";

import { useState, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group, Image } from "react-konva";
import useImage from "use-image";
import TableView from "./TableView";
import AddTableModal from "./AddTableModal";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [bgImage] = useImage(background || "", "anonymous");

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

  const handleAddTable = ({ type, seats }) => {
    const newTable = {
      id: `table_${Date.now()}`,
      type,
      seats,
      x: 150 + tables.length * 120,
      y: 150,
      name: `שולחן ${tables.length + 1}`,
    };
    setTables((prev) => [...prev, newTable]);
  };

  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  const renderTable = (table) => {
    const seatRadius = 8;
    const seats = [];

    if (table.type === "round") {
      const radius = 50;
      for (let i = 0; i < table.seats; i++) {
        const angle = (i / table.seats) * Math.PI * 2;
        const seatX = table.x + 50 + radius * Math.cos(angle);
        const seatY = table.y + 50 + radius * Math.sin(angle);
        seats.push(<Circle key={i} x={seatX} y={seatY} radius={seatRadius} fill="#f59e0b" />);
      }
      return (
        <>
          <Circle
            x={table.x + 50}
            y={table.y + 50}
            radius={50}
            fill="#60a5fa"
            draggable
            onDragEnd={(e) => handleDrag(table.id, e)}
            onClick={() => setSelectedTable(table)}
          />
          {seats}
          <Text x={table.x + 30} y={table.y + 45} text={table.name} fontSize={13} fill="white" />
        </>
      );
    }

    if (table.type === "square") {
      const size = 100;
      for (let i = 0; i < table.seats; i++) {
        const side = i % 4;
        const pos = Math.floor(i / 4);
        let seatX = table.x, seatY = table.y;
        if (side === 0) seatX += pos * 20, seatY -= 10;
        if (side === 1) seatX += size + 10, seatY += pos * 20;
        if (side === 2) seatX += pos * 20, seatY += size + 10;
        if (side === 3) seatX -= 10, seatY += pos * 20;
        seats.push(<Circle key={i} x={seatX} y={seatY} radius={seatRadius} fill="#f59e0b" />);
      }
      return (
        <>
          <Rect
            x={table.x}
            y={table.y}
            width={100}
            height={100}
            fill="#60a5fa"
            cornerRadius={6}
            draggable
            onDragEnd={(e) => handleDrag(table.id, e)}
            onClick={() => setSelectedTable(table)}
          />
          {seats}
          <Text x={table.x + 30} y={table.y + 40} text={table.name} fontSize={13} fill="white" />
        </>
      );
    }

    if (table.type === "rect") {
      const width = 160;
      const height = 60;
      for (let i = 0; i < table.seats / 2; i++) {
        const offset = i * 25;
        seats.push(
          <Circle key={`top${i}`} x={table.x + 20 + offset} y={table.y - 10} radius={seatRadius} fill="#f59e0b" />,
          <Circle key={`bottom${i}`} x={table.x + 20 + offset} y={table.y + height + 10} radius={seatRadius} fill="#f59e0b" />
        );
      }
      return (
        <>
          <Rect
            x={table.x}
            y={table.y}
            width={width}
            height={height}
            fill="#60a5fa"
            cornerRadius={6}
            draggable
            onDragEnd={(e) => handleDrag(table.id, e)}
            onClick={() => setSelectedTable(table)}
          />
          {seats}
          <Text x={table.x + 45} y={table.y + 22} text={table.name} fontSize={13} fill="white" />
        </>
      );
    }
  };

  return (
    <div className="relative h-full w-full bg-gray-100">
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700"
      >
        ➕ הוסף שולחן
      </button>

      {dimensions.width > 0 && (
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {bgImage && (
              <Image
                image={bgImage}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}
            {tables.map((table) => renderTable(table))}
          </Layer>
        </Stage>
      )}

      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTable}
        />
      )}

      {selectedTable && (
        <TableView
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}
