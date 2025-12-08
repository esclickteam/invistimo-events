"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Image } from "react-konva";
import useImage from "use-image";
import TableView from "./TableView";
import AddTableModal from "./AddTableModal";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [bgImage] = useImage(background || "", "anonymous");
  const stageRef = useRef();

  // 🧱 עדכון גודל הקנבס
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

  /* =========================================================
     יצירת שולחן חדש
  ========================================================= */
  const handleAddTable = ({ type, seats }) => {
    const newTable = {
      id: `table_${Date.now()}`,
      type,
      seats,
      x: 150 + tables.length * 120,
      y: 200,
      name: `שולחן ${tables.length + 1}`,
    };
    setTables((prev) => [...prev, newTable]);
  };

  /* =========================================================
     גרירה חלקה של כל הקבוצה
  ========================================================= */
  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  /* =========================================================
     עריכת שם שולחן
  ========================================================= */
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
      prev.map((t) => (t.id === editingId ? { ...t, name: editText } : t))
    );
    setEditingId(null);
  };

  /* =========================================================
     ציור שולחנות לפי סוג
  ========================================================= */
  const renderTable = (table) => {
    const seatRadius = 7;
    const seatColor = "#f59e0b";
    const seats = [];

    if (table.type === "round") {
      const radius = 55;
      for (let i = 0; i < table.seats; i++) {
        const angle = (i / table.seats) * Math.PI * 2;
        const seatX = radius * Math.cos(angle);
        const seatY = radius * Math.sin(angle);
        seats.push(
          <Circle key={i} x={seatX} y={seatY} radius={seatRadius} fill={seatColor} />
        );
      }
      return (
        <Group
          key={table.id}
          x={table.x}
          y={table.y}
          draggable
          onDragEnd={(e) => handleDrag(table.id, e)}
          onClick={() => setSelectedTable(table)}
          onDblClick={() => handleDoubleClick(table)}
        >
          <Circle x={60} y={60} radius={45} fill="#60a5fa" />
          {seats.map((s, i) =>
            React.cloneElement(s, {
              x: 60 + s.props.x,
              y: 60 + s.props.y,
              key: i,
            })
          )}
          <Text
            x={40}
            y={55}
            text={table.name}
            fontSize={13}
            fill="white"
            listening={false}
          />
        </Group>
      );
    }

    if (table.type === "square") {
      const size = 100;
      const perSide = Math.ceil(table.seats / 4);
      const step = size / (perSide + 1);
      let seatIndex = 0;
      for (let side = 0; side < 4; side++) {
        for (let i = 1; i <= perSide; i++) {
          const offset = i * step - size / 2;
          let seatX = 0;
          let seatY = 0;
          if (side === 0) seatX = offset + 50, seatY = -15;
          if (side === 1) seatX = size + 15, seatY = offset + 50;
          if (side === 2) seatX = offset + 50, seatY = size + 15;
          if (side === 3) seatX = -15, seatY = offset + 50;
          seats.push(
            <Circle key={seatIndex++} x={seatX} y={seatY} radius={seatRadius} fill={seatColor} />
          );
        }
      }
      return (
        <Group
          key={table.id}
          x={table.x}
          y={table.y}
          draggable
          onDragEnd={(e) => handleDrag(table.id, e)}
          onClick={() => setSelectedTable(table)}
          onDblClick={() => handleDoubleClick(table)}
        >
          <Rect x={0} y={0} width={100} height={100} fill="#60a5fa" cornerRadius={8} />
          {seats}
          <Text x={30} y={42} text={table.name} fontSize={13} fill="white" listening={false} />
        </Group>
      );
    }

    if (table.type === "rect") {
      const width = 160;
      const height = 60;
      const sideSeats = Math.ceil(table.seats / 2);
      const spacing = width / (sideSeats + 1);
      for (let i = 1; i <= sideSeats; i++) {
        const seatX = i * spacing;
        seats.push(
          <Circle key={`top${i}`} x={seatX} y={-10} radius={seatRadius} fill={seatColor} />,
          <Circle key={`bottom${i}`} x={seatX} y={height + 10} radius={seatRadius} fill={seatColor} />
        );
      }
      return (
        <Group
          key={table.id}
          x={table.x}
          y={table.y}
          draggable
          onDragEnd={(e) => handleDrag(table.id, e)}
          onClick={() => setSelectedTable(table)}
          onDblClick={() => handleDoubleClick(table)}
        >
          <Rect x={0} y={0} width={width} height={height} fill="#60a5fa" cornerRadius={6} />
          {seats}
          <Text x={width / 2 - 25} y={height / 2 - 7} text={table.name} fontSize={13} fill="white" listening={false} />
        </Group>
      );
    }
  };

  /* =========================================================
     רינדור כללי
  ========================================================= */
  return (
    <div className="relative h-full w-full bg-gray-100">
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700"
      >
        ➕ הוסף שולחן
      </button>

      {dimensions.width > 0 && (
        <Stage width={dimensions.width} height={dimensions.height} ref={stageRef}>
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

      {editingId && (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEditBlur}
          autoFocus
          className="absolute z-30 border border-blue-400 rounded-md px-2 py-1 text-sm"
          style={{
            top: editPosition.y,
            left: editPosition.x,
          }}
        />
      )}
    </div>
  );
}
