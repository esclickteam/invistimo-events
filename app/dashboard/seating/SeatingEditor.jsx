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

  /* -------------------- Resize Canvas -------------------- */
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

  /* -------------------- Add Table -------------------- */
  const handleAddTable = ({ type, seats }) => {
    const newTable = {
      id: `table_${Date.now()}`,
      type,
      seats: Number(seats),
      x: 200 + tables.length * 140,
      y: 250,
      name: `שולחן ${tables.length + 1}`,
      seatedGuests: [],
    };
    setTables((prev) => [...prev, newTable]);
  };

  /* -------------------- Drag Table -------------------- */
  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  /* -------------------- Drag Guest Start -------------------- */
  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData("guest", JSON.stringify(guest));
  };

  /* -------------------- Drop Guest on Stage -------------------- */
  const handleStageDrop = (e) => {
    const raw = e.evt.dataTransfer.getData("guest");
    if (!raw) return;

    const guest = JSON.parse(raw);
    const pointer = stageRef.current.getPointerPosition();

    // מציאת שולחן באזור
    const table = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < 120; // טווח זיהוי סביב השולחן
    });

    if (!table) return;

    assignGuestToTable(guest, table.id);
  };

  /* -------------------- Assign Guest -------------------- */
  const assignGuestToTable = (guest, tableId) => {
    // בדיקה מקום פנוי
    const table = tables.find((t) => t.id === tableId);
    const usedSeats = table.seatedGuests.reduce((sum, g) => sum + g.count, 0);

    if (usedSeats + guest.count > table.seats) {
      alert("אין מספיק מקומות בשולחן הזה 😅");
      return;
    }

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, seatedGuests: [...t.seatedGuests, guest] }
          : t
      )
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, tableId } : g))
    );
  };

  /* -------------------- Render Table (With Shapes) -------------------- */
  const renderTable = (table) => {
    const usedSeats = table.seatedGuests.reduce((s, g) => s + g.count, 0);

    // גודל אוטומטי לפי מספר מושבים
    const base = Math.min(100 + table.seats * 4, 260);

    let shape;
    if (table.type === "round") {
      shape = <Circle radius={base / 2} fill="#3b82f6" shadowBlur={10} />;
    } else if (table.type === "square") {
      shape = (
        <Rect
          width={base}
          height={base}
          fill="#22c55e"
          offsetX={base / 2}
          offsetY={base / 2}
          cornerRadius={12}
        />
      );
    } else if (table.type === "banquet") {
      shape = (
        <Rect
          width={base * 1.8}
          height={base * 0.6}
          fill="#f97316"
          offsetX={(base * 1.8) / 2}
          offsetY={(base * 0.6) / 2}
          cornerRadius={10}
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
        onClick={() => setSelectedTable(table)}
      >
        {shape}

        <Text
          text={table.name}
          y={-10}
          fontSize={18}
          fill="white"
          align="center"
          width={200}
          offsetX={100}
        />

        <Text
          text={`${usedSeats}/${table.seats} הושבו`}
          y={10}
          fontSize={14}
          fill="#ffffffcc"
          align="center"
          width={200}
          offsetX={100}
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
          <Stage
            width={dimensions.width - 260}
            height={dimensions.height}
            ref={stageRef}
            onDrop={handleStageDrop}
            onDragOver={(e) => e.evt.preventDefault()}
          >
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
    </div>
  );
}
