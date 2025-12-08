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
      return dist < 140;
    });

    if (!table) return;

    // מציאת כיסא פנוי
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

    // עדכון שולחן
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, seatedGuests: [...t.seatedGuests, { ...guest, seatIndex }] }
          : t
      )
    );

    // עדכון אורח
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId } : g))
    );
  };

  /* ---------------- REMOVE SEAT ---------------- */
  const removeSeat = (tableId, seatIndex) => {
    const guest = tables
      .find((t) => t.id === tableId)
      .seatedGuests.find((g) => g.seatIndex === seatIndex);

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

  /* ---------------- MANUAL TABLE CHANGE ---------------- */
  const handleManualTableChange = (guestId, newTableId) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;

    // הורד מהשולחן הקודם
    if (guest.tableId) {
      removeGuestFromTable(guest.tableId, guestId);
    }

    // הושב בשולחן החדש (כיסא ראשון פנוי)
    const table = tables.find((t) => t.id === newTableId);
    if (!table) return;

    const used = table.seatedGuests.map((g) => g.seatIndex);
    const free = [...Array(table.seats).keys()].find((i) => !used.includes(i));

    if (free === undefined) return alert("אין מקום פנוי");

    assignGuestToSeat(newTableId, free, guestId);
  };

  /* ---------------- REMOVE ALL GUESTS FROM TABLE ---------------- */
  const removeGuestFromTable = (tableId, guestId) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              seatedGuests: t.seatedGuests.filter((g) => g.id !== guestId)
            }
          : t
      )
    );

    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId: null } : g))
    );
  };

  /* ---------------- TABLE RENDERING ---------------- */
  const renderTable = (table) => {
    const seats = table.seats;
    const chairs = [];
    let coords = [];

    // ⭕ עגול
    if (table.type === "round") {
      for (let i = 0; i < seats; i++) {
        const angle = (i / seats) * Math.PI * 2;
        coords.push({
          x: Math.cos(angle) * 80,
          y: Math.sin(angle) * 80
        });
      }
    }

    // ▢ מרובע
    if (table.type === "square") {
      const side = Math.ceil(seats / 4);
      for (let i = 0; i < seats; i++) {
        const sideIndex = Math.floor(i / side);
        const pos = i % side;
        const offset = pos * 30 - (side * 30) / 2;

        if (sideIndex === 0)
          coords.push({ x: offset, y: -90 });
        if (sideIndex === 1)
          coords.push({ x: 90, y: offset });
        if (sideIndex === 2)
          coords.push({ x: offset, y: 90 });
        if (sideIndex === 3)
          coords.push({ x: -90, y: offset });
      }
    }

    // 🟦 אבירים (מלבן)
    if (table.type === "banquet") {
      const half = Math.ceil(seats / 2);
      for (let i = 0; i < seats; i++) {
        const pos = i % half;
        const offset = pos * 35 - (half * 35) / 2;
        if (i < half)
          coords.push({ x: offset, y: -60 });
        else
          coords.push({ x: offset, y: 60 });
      }
    }

    // בניית הכיסאות
    coords.forEach((c, i) => {
      chairs.push(
        <Circle
          key={i}
          x={c.x}
          y={c.y}
          radius={10}
          fill="#d1d5db"
        />
      );
    });

    return (
      <Group
        key={table.id}
        x={table.x}
        y={table.y}
        draggable
        onDragEnd={(e) => handleDrag(table.id, e)}
        onClick={() => setSelectedTable(table)}
      >
        {/* גוף השולחן בצבע כחול */}
        {table.type === "round" && (
          <Circle radius={55} fill="#3b82f6" />
        )}
        {table.type === "square" && (
          <Rect width={130} height={130} offsetX={65} offsetY={65} fill="#3b82f6" />
        )}
        {table.type === "banquet" && (
          <Rect width={220} height={80} offsetX={110} offsetY={40} fill="#3b82f6" />
        )}

        {chairs}

        {/* שם + כמות */}
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
