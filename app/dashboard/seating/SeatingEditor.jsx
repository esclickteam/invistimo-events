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
    { id: "g1", name: "דנה לוי", count: 2, tableId: null },
    { id: "g2", name: "משפחת כהן", count: 3, tableId: null },
    { id: "g3", name: "נועם ישראלי", count: 1, tableId: null },
    { id: "g4", name: "רותם דויד", count: 2, tableId: null }
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
        height: window.innerHeight - 80
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
        seatedGuests: []
      }
    ]);
  };

  /* ---------------- DRAG TABLE ---------------- */
  const handleDrag = (id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  };

  /* ---------------- DRAG GUEST START ---------------- */
  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData("guest", JSON.stringify(guest));
  };

  /* ---------------- DROP GUEST ---------------- */
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
      return dist < 160; 
    });

    if (!table) return;

    const used = table.seatedGuests.map((g) => g.seatIndex);
    const freeSeat = [...Array(table.seats).keys()].find(
      (i) => !used.includes(i)
    );

    if (freeSeat === undefined) {
      alert("אין מקום פנוי בשולחן");
      return;
    }

    assignGuestToSeat(table.id, freeSeat, guest.id);
  };

  /* ---------------- ASSIGN GUEST TO SEAT ---------------- */
  const assignGuestToSeat = (tableId, seatIndex, guestId) => {
    const guest = guests.find((g) => g.id === guestId);

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, seatedGuests: [...t.seatedGuests, { ...guest, seatIndex }] }
          : t
      )
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId } : g))
    );
  };

  /* ---------------- REMOVE SEAT ---------------- */
  const removeSeat = (tableId, seatIndex) => {
    const guest = tables
      .find((t) => t.id === tableId)
      ?.seatedGuests?.find((g) => g.seatIndex === seatIndex);

    if (!guest) return;

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              seatedGuests: t.seatedGuests.filter(
                (g) => g.seatIndex !== seatIndex
              )
            }
          : t
      )
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, tableId: null } : g))
    );
  };

  /* ---------------- שינוי ידני של מספר שולחן ---------------- */
  const handleManualTableChange = (guestId, newTableId) => {
    if (!newTableId) return;

    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;

    // הסרה משולחן קודם
    if (guest.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === guest.tableId
            ? {
                ...t,
                seatedGuests: t.seatedGuests.filter((g) => g.id !== guestId)
              }
            : t
        )
      );
    }

    const table = tables.find((t) => t.id === newTableId);
    if (!table) return;

    const used = table.seatedGuests.map((g) => g.seatIndex);
    const freeSeat = [...Array(table.seats).keys()].find(
      (i) => !used.includes(i)
    );

    if (freeSeat === undefined) return alert("אין מקום פנוי");

    assignGuestToSeat(newTableId, freeSeat, guestId);
  };

  /* ---------------- SEAT POSITION LOGIC ---------------- */
  const getSeatCoords = (table) => {
    const seats = table.seats;
    let coords = [];

    /* עגול */
    if (table.type === "round") {
      for (let i = 0; i < seats; i++) {
        const angle = (i / seats) * Math.PI * 2;
        coords.push({
          x: Math.cos(angle) * 80,
          y: Math.sin(angle) * 80
        });
      }
    }

    /* מרובע */
    if (table.type === "square") {
      const perSide = Math.ceil(seats / 4);
      const spacing = 35;

      for (let i = 0; i < seats; i++) {
        const side = Math.floor(i / perSide);
        const pos = i % perSide;
        const offset = pos * spacing - ((perSide - 1) * spacing) / 2;

        if (side === 0) coords.push({ x: offset, y: -95 });
        if (side === 1) coords.push({ x: 95, y: offset });
        if (side === 2) coords.push({ x: offset, y: 95 });
        if (side === 3) coords.push({ x: -95, y: offset });
      }
    }

    /* אבירים — שתי שורות ישרות */
    if (table.type === "banquet") {
      const left = Math.ceil(seats / 2);
      const right = seats - left;

      const spacing = 32;
      const leftOffset = (left - 1) * spacing / 2;
      const rightOffset = (right - 1) * spacing / 2;

      for (let i = 0; i < seats; i++) {
        let x = 0, y = 0;

        if (i < left) {
          x = -130;
          y = i * spacing - leftOffset;
        } else {
          const idx = i - left;
          x = 130;
          y = idx * spacing - rightOffset;
        }

        coords.push({ x, y });
      }
    }

    return coords;
  };

  /* ---------------- RENDER TABLE ---------------- */
  const renderTable = (table) => {
    const coords = getSeatCoords(table);

    return (
      <Group
        key={table.id}
        x={table.x}
        y={table.y}
        draggable
        onDragEnd={(e) => handleDrag(table.id, e)}
        onClick={() => setSelectedTable(table)}
      >
        {/* גוף השולחן */}
        {table.type === "round" && <Circle radius={55} fill="#3b82f6" />}
        {table.type === "square" && (
          <Rect width={130} height={130} offsetX={65} offsetY={65} fill="#3b82f6" />
        )}
        {table.type === "banquet" && (
          <Rect width={260} height={80} offsetX={130} offsetY={40} fill="#3b82f6" />
        )}

        {/* כיסאות */}
        {coords.map((c, i) => (
          <Circle key={i} x={c.x} y={c.y} radius={10} fill="#d1d5db" />
        ))}

        {/* שם שולחן + סטטוס */}
        <Text
          text={table.name}
          y={-5}
          fontSize={14}
          fill="white"
          align="center"
          width={200}
          offsetX={100}
        />
        <Text
          text={`${table.seatedGuests.length}/${table.seats} הושבו`} 
          y={15}
          fontSize={12}
          fill="#e5e7eb"
          align="center"
          width={200}
          offsetX={100}
        />
      </Group>
    );
  };

  return (
    <div className="flex h-full">
      <GuestSidebar
        guests={guests}
        tables={tables}
        onDragStart={handleGuestDragStart}
        onManualTableChange={handleManualTableChange}
      />

      <div className="flex-1 relative">
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

        {selectedTable && (
          <TableView
            table={tables.find((t) => t.id === selectedTable.id)}
            availableGuests={guests.filter((g) => !g.tableId)}
            onClose={() => setSelectedTable(null)}
            onAssignSeat={assignGuestToSeat}
            onRemoveSeat={removeSeat}
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
