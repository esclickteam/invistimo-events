"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

import GridLayer from "@/app/components/seating/GridLayer";
import ElementsToolbar from "@/app/components/seating/ElementsToolbar";

/* ============================================================
   Seating Editor
============================================================ */
export default function SeatingEditor({ background }) {
  const stageRef = useRef(null);

  /* ==================== Background ==================== */
  const [bgImage] = useImage(background || "", "anonymous");

  /* ==================== Zustand ==================== */
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const draggedGuest = useSeatingStore((s) => s.draggedGuest);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);
  const dropGuest = useSeatingStore((s) => s.dropGuest);

  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);
  const addTable = useSeatingStore((s) => s.addTable);

  /* ==================== Highlight from URL ==================== */
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const highlightedGuestIdRaw = searchParams.get("guestId");

  const isPersonalMode = from === "personal" && !!highlightedGuestIdRaw;

  const canonicalGuestId = useMemo(() => {
    if (!highlightedGuestIdRaw) return null;
    const raw = String(highlightedGuestIdRaw);

    const found = (guests || []).find(
      (g) => String(g?._id ?? g?.id ?? "") === raw
    );

    return found ? String(found.id ?? found._id) : raw;
  }, [highlightedGuestIdRaw, guests]);

  const highlightedTableId = useMemo(() => {
    if (!isPersonalMode || !canonicalGuestId) return null;

    const table = tables.find((t) =>
      t.seatedGuests?.some(
        (s) => String(s.guestId) === String(canonicalGuestId)
      )
    );

    return table?.id || null;
  }, [tables, canonicalGuestId, isPersonalMode]);

  useEffect(() => {
    if (!isPersonalMode || draggedGuest) return;

    useSeatingStore.setState({
      highlightedTable: highlightedTableId ?? null,
    });
  }, [highlightedTableId, draggedGuest, isPersonalMode]);

  /* ==================== Canvas Size ==================== */
  const width =
    typeof window !== "undefined" ? window.innerWidth - 260 : 1200;
  const height =
    typeof window !== "undefined" ? window.innerHeight - 100 : 800;

  /* ==================== Zoom & Pan ==================== */
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  /* ==================== Mouse ==================== */
  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    updateGhost(pos);
    evalHover(pos);
  };

  const handleMouseUp = () => dropGuest();

  /* ==================== Drop Elements ==================== */
  const handleDrop = (e) => {
    e.preventDefault();

    const type = e.evt.dataTransfer?.getData("element-type");
    if (!type) return;

    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    addTable(type, 0, {
      x: pointer.x,
      y: pointer.y,
    });
  };

  /* ==================== Unseated Guests ==================== */
  const unseatedGuests = useMemo(() => {
    const seatedSet = new Set();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((s) => seatedSet.add(String(s.guestId)))
    );

    return guests.filter(
      (g) => !seatedSet.has(String(g.id ?? g._id))
    );
  }, [tables, guests]);

  const [addGuestTable, setAddGuestTable] = useState(null);

  return (
    <div className="flex relative w-full h-full">
      {/* SIDEBAR */}
      <GuestSidebar onDragStart={startDragGuest} />

      {/* ELEMENTS TOOLBAR */}
      <ElementsToolbar />

      {/* ZOOM CONTROLS */}
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

      {/* STAGE */}
      <Stage
        ref={stageRef}
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
        onDrop={handleDrop}
        onDragOver={(e) => e.evt.preventDefault()}
        className="flex-1"
      >
        {/* GRID */}
        <Layer listening={false}>
          <GridLayer width={width} height={height} />
        </Layer>

        {/* BACKGROUND + TABLES */}
        <Layer>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              width={width}
              height={height}
              opacity={0.28}
              listening={false}
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

        {/* DELETE */}
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

      {/* ADD GUEST MODAL */}
      {addGuestTable && (
        <AddGuestToTableModal
          table={addGuestTable}
          guests={unseatedGuests}
          onClose={() => setAddGuestTable(null)}
        />
      )}
    </div>
  );
}
