"use client";
import React, { useState, useEffect, useRef } from "react";
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
        name: `שולחן ${prev.length + 1}`,
        x: 200 + prev.length * 120,
        y: 250,
        seatedGuests: [],
      },
    ]);
  };

  /* ---------------- DRAG TABLE ---------------- */
  const handleTableDrag = (id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  };

  /* ---------------- DRAG GUEST ---------------- */
  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData("guest", JSON.stringify(guest));
  };

  /* ---------------- DROP ON STAGE (Konva-safe) ---------------- */
  const handleDropGuest = (e) => {
    const raw = e.evt.dataTransfer.getData("guest");
    if (!raw) return;

    const guest = JSON.parse(raw);
    const pointer = stageRef.current.getPointerPosition();

    // מציאת שולחן לפי קרבה
    const table = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < 120; 
    });

    if (!table) return;

    assignGuestToTable(guest, table.id);
  };

  /* ---------------- ASSIGN GUEST ---------------- */
  const assignGuestToTable = (guest, tableId) => {
    const table = tables.find((t) => t.id === tableId);
    const used = table.seatedGuests.reduce((s, g) => s + g.count, 0);

    if (used + guest.count > table.seats) {
      alert("אין מספיק מקומות בשולחן 😅");
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

  /* ---------------- REMOVE GUEST ---------------- */
  const removeGuestFromTable = (tableId, guest) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, seatedGuests: t.seatedGuests.filter((x) => x.id !== guest.id) }
          : t
      )
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, tableId: null } : g))
    );
  };

  /* ---------------- CHANGE TABLE MANUALLY ---------------- */
  const handleManualTableChange = (guestId, newTableId) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;

    // הורד מהשולחן הקודם
    if (guest.tableId) {
      removeGuestFromTable(guest.tableId, guest);
    }

    // הושב בשולחן החדש
    assignGuestToTable(guest, newTableId);
  };

  /* ---------------- RENDER TABLE ---------------- */
  const renderTable = (table) => {
    const used = table.seatedGuests.reduce((s, g) => s + g.count, 0);

    // קונפיג הכיסאות המקורי שלך:
    const chairs = [];
    for (let i = 0; i < table.seats; i++) {
      const angle = (i / table.seats) * Math.PI * 2;
      const x = 70 * Math.cos(angle);
      const y = 70 * Math.sin(angle);
      const occupied = i < used;

      chairs.push(
        <Circle
          key={i}
          x={x}
          y={y}
          radius={10}
          fill={occupied ? "#22d3ee" : "#e5e7eb"}
        />
      );
    }

    return (
      <Group
        key={table.id}
        x={table.x}
        y={table.y}
        draggable
        onDragEnd={(e) => handleTableDrag(table.id, e)}
        onClick={() => setSelectedTable(table)}
      >
        {table.type === "round" && (
          <Circle radius={55} fill="#3b82f6" shadowBlur={8} />
        )}

        {table.type === "square" && (
          <Rect
            width={120}
            height={120}
            offsetX={60}
            offsetY={60}
            fill="#22c55e"
            cornerRadius={10}
          />
        )}

        {table.type === "banquet" && (
          <Rect
            width={200}
            height={80}
            offsetX={100}
            offsetY={40}
            fill="#3b82f6"
            cornerRadius={10}
          />
        )}

        {chairs}

        <Text
          text={table.name}
          y={-5}
          align="center"
          width={200}
          offsetX={100}
          fill="white"
          fontSize={14}
        />
        <Text
          text={`${used}/${table.seats} הושבו`}
          y={12}
          align="center"
          width={200}
          offsetX={100}
          fill="white"
          fontSize={12}
        />
      </Group>
    );
  };

  return (
    <div className="flex h-full">
      
      {/* סיידבר */}
      <GuestSidebar
        guests={guests}
        onDragStart={handleGuestDragStart}
        onManualTableChange={handleManualTableChange}
      />

      {/* אזור עבודה */}
      <div className="flex-1 relative bg-gray-100">
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1.5 rounded-lg shadow"
        >
          ➕ הוסף שולחן
        </button>

        {dimensions.width > 0 && (
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
            table={tables.find((t) => t.id === selectedTable.id)}
            onClose={() => setSelectedTable(null)}
            onRemoveGuest={(guest) => removeGuestFromTable(selectedTable.id, guest)}
          />
        )}
      </div>
    </div>
  );
}
