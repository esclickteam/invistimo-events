"use client";

import { useEffect } from "react";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";

import { useSeatingStore } from "@/store/seatingStore";

// נתיבים נכונים
import TableRenderer from "@/app/components/seating/TableRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import GuestSidebar from "./GuestSidebar";
import AddTableModal from "./AddTableModal";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";  // ⭐ חדש

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

      {/* MAIN CANVAS */}
      <Stage
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1"
      >
        {/* ---------------------- שכבת שולחנות + רקע ---------------------- */}
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
            <TableRenderer key={t.id} table={t} />
          ))}

          <GhostPreview />
        </Layer>

        {/* ---------------------- שכבה עליונה — כפתורי מחיקה ---------------------- */}
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
