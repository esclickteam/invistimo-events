"use client";

import { useState, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useSearchParams } from "next/navigation";

import { useSeatingStore } from "@/store/seatingStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import GuestSidebar from "./GuestSidebar";
import AddTableModal from "./AddTableModal";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";
import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";
import GridBackground from "@/app/components/seating/GridBackground";

export default function SeatingEditor({ background }) {
  const [bgImage] = useImage(background || "", "anonymous");

  /* ==================== Zustand ==================== */
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);
  const dropGuest = useSeatingStore((s) => s.dropGuest);

  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);
  const addTable = useSeatingStore((s) => s.addTable);

  /* ==================== Highlight from URL ==================== */
  const searchParams = useSearchParams();
  const highlightedGuestId = searchParams.get("guestId");

  const highlightedTableId = tables.find((table) =>
    table.seatedGuests?.some(
      (sg) => sg.guestId?.toString() === highlightedGuestId
    )
  )?.id;

  /* ==================== Add Guest Modal ==================== */
  const [addGuestTable, setAddGuestTable] = useState(null);

  /* ==================== Canvas Size ==================== */
  const width =
    typeof window !== "undefined" ? window.innerWidth - 260 : 1200;
  const height =
    typeof window !== "undefined" ? window.innerHeight - 100 : 800;

  /* ==================== 🔲 CELL LOGIC ==================== */
  const CELL_SIZE = 320;

  const getCellSizeForTable = (table) =>
    table.seats > 19 ? CELL_SIZE * 2 : CELL_SIZE;

  const snapPositionToCell = (pos, table) => {
    const size = getCellSizeForTable(table);
    return {
      x: Math.round(pos.x / size) * size,
      y: Math.round(pos.y / size) * size,
    };
  };

  /* ==================== Zoom & Pan ==================== */
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  /* ==================== 🎯 FOCUS TABLE (חדש!) ==================== */
  useEffect(() => {
    const handler = (e) => {
      const { x, y } = e.detail;
      if (x == null || y == null) return;

      // ממקם את השולחן במרכז המסך
      const centerX = width / 2;
      const centerY = height / 2;

      setStagePos({
        x: centerX - x * scale,
        y: centerY - y * scale,
      });
    };

    window.addEventListener("focus-table", handler);
    return () => window.removeEventListener("focus-table", handler);
  }, [width, height, scale]);

  /* ==================== Mouse ==================== */
  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    updateGhost(pos);
    evalHover(pos);
  };

  const handleMouseUp = () => {
    dropGuest({
      snapToCell: snapPositionToCell,
    });
  };

  return (
    <div className="flex relative w-full h-full">

      {/* ==================== SIDEBAR ==================== */}
      <GuestSidebar onDragStart={(guest) => startDragGuest(guest)} />

      {/* ==================== ZOOM CONTROLS ==================== */}
      <button
        onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
        className="absolute top-[70px] left-4 bg-white shadow rounded-full
                   w-12 h-12 text-2xl flex items-center justify-center z-50"
      >
        +
      </button>

      <button
        onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}
        className="absolute top-[130px] left-4 bg-white shadow rounded-full
                   w-12 h-12 text-2xl flex items-center justify-center z-50"
      >
        −
      </button>

      {/* ==================== STAGE ==================== */}
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
          if (!pointer) return;

          const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          };

          const direction = e.evt.deltaY > 0 ? -1 : 1;
          const newScale =
            direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

          setScale(newScale);

          setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
          });
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1"
      >

        {/* 🖼️ סקיצה */}
        <Layer listening={false}>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              width={width}
              height={height}
              opacity={0.28}
            />
          )}
        </Layer>

        {/* 🟦 GRID */}
        <Layer listening={false}>
          <GridBackground
            width={width}
            height={height}
            gridSize={CELL_SIZE}
          />
        </Layer>

        {/* 🪑 שולחנות */}
        <Layer>
          {tables.map((t) => (
            <TableRenderer
              key={t.id}
              table={{
                ...t,
                openAddGuestModal: () => setAddGuestTable(t),
                isHighlighted: t.id === highlightedTableId,
              }}
            />
          ))}
          <GhostPreview />
        </Layer>

        {/* 🗑️ מחיקת שולחנות */}
        <Layer>
          {tables.map((t) => (
            <DeleteTableButton key={t.id} table={t} />
          ))}
        </Layer>
      </Stage>

      {/* ==================== MODALS ==================== */}
      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onAdd={({ type, seats }) => {
            addTable(type, seats);
            setShowAddModal(false);
          }}
        />
      )}

      {addGuestTable && (
        <AddGuestToTableModal
          table={addGuestTable}
          guests={guests.filter(
            (g) =>
              !tables.some((t) =>
                t.seatedGuests?.some(
                  (sg) => sg.guestId === g._id
                )
              )
          )}
          onClose={() => setAddGuestTable(null)}
        />
      )}

      {/* ==================== ADD TABLE ==================== */}
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
