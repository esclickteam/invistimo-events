"use client";

import { useEffect, useState } from "react";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";

import { useSeatingStore } from "@/store/seatingStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import GuestSidebar from "./GuestSidebar";
import AddTableModal from "./AddTableModal";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";

import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";


export default function SeatingEditor({ background }) {
  const [bgImage] = useImage(background || "", "anonymous");

  /* -------------------- Zustand State -------------------- */
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const init = useSeatingStore((s) => s.init);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);
  const dropGuest = useSeatingStore((s) => s.dropGuest);

  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);

  const addTable = useSeatingStore((s) => s.addTable);

  // ⭐ שולחן שאליו רוצים להוסיף אורחים
  const [addGuestTable, setAddGuestTable] = useState(null);

  /* -------------------- INIT SAMPLE DATA -------------------- */
  useEffect(() => {
    init(
      [
        {
          id: "t1",
          name: "שולחן 1",
          type: "round",
          seats: 12,
          x: 400,
          y: 300,
          seatedGuests: [],
        },
      ],
      [
        { id: "g1", name: "דנה לוי", count: 3, tableId: null },
        { id: "g2", name: "משפחת כהן", count: 2, tableId: null },
        { id: "g3", name: "נועם ישראלי", count: 1, tableId: null },
      ]
    );
  }, [init]);

  /* -------------------- Canvas Size -------------------- */
  const width = typeof window !== "undefined" ? window.innerWidth - 260 : 1200;
  const height =
    typeof window !== "undefined" ? window.innerHeight - 100 : 800;

  /* -------------------- ZOOM STATE -------------------- */
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  /* -------------------- Move Ghost -------------------- */
  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    updateGhost(pos);
    evalHover(pos);
  };

  /* -------------------- Drop Guest -------------------- */
  const handleMouseUp = () => {
    dropGuest();
  };

  return (
    <div className="flex relative w-full h-full">

      {/* SIDEBAR */}
      <GuestSidebar
        guests={guests.filter((g) => !g.tableId)}
        tables={tables}
        onDragStart={(guest) => startDragGuest(guest)}
      />

      {/* 🔍 ZOOM BUTTONS */}
      <button
        onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
        className="absolute top-[70px] left-4 bg-white shadow rounded-full w-12 h-12 text-2xl flex items-center justify-center z-50"
      >
        +
      </button>

      <button
        onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}
        className="absolute top-[130px] left-4 bg-white shadow rounded-full w-12 h-12 text-2xl flex items-center justify-center z-50"
      >
        −
      </button>

      {/* MAIN CANVAS */}
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onDragEnd={(e) => setStagePos(e.target.position())}
        onWheel={(e) => {
          e.evt.preventDefault();

          const stage = e.target.getStage();
          const oldScale = stage.scaleX();
          const scaleBy = 1.04;

          const pointer = stage.getPointerPosition();
          const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          };

          const direction = e.evt.deltaY > 0 ? -1 : 1;
          const newScale =
            direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

          setScale(newScale);

          const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
          };

          setStagePos(newPos);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1"
      >
        {/* TABLES + BACKGROUND */}
        <Layer>
          {bgImage && (
            <Image
              image={bgImage}
              width={width}
              height={height}
              opacity={0.28}
            />
          )}

          {tables.map((t) => (
            <TableRenderer
              key={t.id}
              table={{
                ...t,
                openAddGuestModal: () => setAddGuestTable(t),
              }}
            />
          ))}

          <GhostPreview />
        </Layer>

        {/* DELETE BUTTONS */}
        <Layer>
          {tables.map((t) => (
            <DeleteTableButton key={t.id} table={t} />
          ))}
        </Layer>
      </Stage>

      {/* ADD TABLE MODAL */}
      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onAdd={({ type, seats }) => {
            addTable(type, seats);
            setShowAddModal(false);
          }}
        />
      )}

      {/* ⭐ ADD GUESTS TO TABLE MODAL */}
      {addGuestTable && (
        <AddGuestToTableModal
          table={addGuestTable}
          guests={guests.filter((g) => !g.tableId)}
          onClose={() => setAddGuestTable(null)}
        />
      )}

      {/* ADD TABLE BUTTON */}
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 bg-green-600 
                   text-white px-4 py-2 rounded-lg shadow z-50"
      >
        ➕ הוסף שולחן
      </button>
    </div>
  );
}
