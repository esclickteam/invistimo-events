"use client";

import { useEffect, useMemo, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useSearchParams } from "next/navigation";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import ZoneRenderer from "@/app/components/zones/ZoneRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import GuestSidebar from "./GuestSidebar";
import AddTableModal from "./AddTableModal";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";
import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";

export default function SeatingEditor({ background }) {
  /* ==================== Background ==================== */
  const [bgImage] = useImage(background || "", "anonymous");

  /* ==================== STORES ==================== */
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

  /* 🧱 ZONES */
  const zones = useZoneStore((s) => s.zones);

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

  /* ==================== Add Guest Modal ==================== */
  const [addGuestTable, setAddGuestTable] = useState(null);

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

  /* ==================== Unseated Guests ==================== */
  const unseatedGuests = useMemo(() => {
    const seated = new Set();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((s) => seated.add(String(s.guestId)))
    );
    return guests.filter(
      (g) => !seated.has(String(g.id ?? g._id))
    );
  }, [tables, guests]);

  return (
    <div className="flex relative w-full h-full">
      {/* SIDEBAR */}
      <GuestSidebar onDragStart={startDragGuest} />

      {/* ZOOM CONTROLS */}
      <button
        onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
        className="absolute top-[70px] left-4 bg-white shadow rounded-full w-12 h-12 text-2xl z-50"
      >
        +
      </button>
      <button
        onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}
        className="absolute top-[130px] left-4 bg-white shadow rounded-full w-12 h-12 text-2xl z-50"
      >
        −
      </button>

      {/* STAGE */}
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onDragEnd={(e) => setStagePos(e.target.position())}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1"
      >
        {/* BACKGROUND */}
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

        {/* 🧱 ZONES */}
        <Layer>
          {zones.map((zone) => (
            <ZoneRenderer key={zone.id} zone={zone} />
          ))}
        </Layer>

        {/* 🪑 TABLES */}
        <Layer>
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

      {/* ADD TABLE */}
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50"
      >
        ➕ הוסף שולחן
      </button>

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
          guests={unseatedGuests}
          onClose={() => setAddGuestTable(null)}
        />
      )}
    </div>
  );
}
