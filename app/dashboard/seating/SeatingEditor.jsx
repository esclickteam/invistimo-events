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

/* ==================== EVENT TYPES ==================== */
const EVENT_TYPES = [
  { key: "wedding", label: "💍 חתונה" },
  { key: "bar_mitzvah", label: "🎤 בר מצווה" },
  { key: "bat_mitzvah", label: "🎤 בת מצווה" },
  { key: "brit", label: "👶 ברית / בריתה" },
  { key: "henna", label: "🪔 חינה" },
];

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
  const loadPreset = useZoneStore((s) => s.loadPreset);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const removeZone = useZoneStore((s) => s.removeZone);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  /* ==================== Highlight from URL ==================== */
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const highlightedGuestIdRaw = searchParams.get("guestId");
  const isPersonalMode = from === "personal" && !!highlightedGuestIdRaw;

  const canonicalGuestId = useMemo(() => {
    if (!highlightedGuestIdRaw) return null;
    const raw = String(highlightedGuestIdRaw);
    const found = guests.find(
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
  const [isPanning, setIsPanning] = useState(false);

  /* ==================== Mouse ==================== */
  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    updateGhost(pos);
    evalHover(pos);
  };

  const handleMouseUp = () => dropGuest();

  /* ==================== DELETE ZONE (Keyboard) ==================== */
  useEffect(() => {
    function onKeyDown(e) {
      if (!selectedZoneId) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeZone(selectedZoneId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedZoneId, removeZone]);

  /* ==================== Unseated Guests ==================== */
  const unseatedGuests = useMemo(() => {
    const seated = new Set();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((s) =>
        seated.add(String(s.guestId))
      )
    );
    return guests.filter(
      (g) => !seated.has(String(g.id ?? g._id))
    );
  }, [tables, guests]);

  return (
    <div className="flex relative w-full h-full">
      <GuestSidebar onDragStart={startDragGuest} />

      {/* STAGE */}
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isPanning}
        onDragEnd={(e) => {
          if (isPanning) {
            setStagePos(e.target.position());
          }
        }}
        onMouseDown={(e) => {
          const stage = e.target.getStage();

          // לחיצה על רקע ריק → pan
          if (e.target === stage) {
            setSelectedZone(null);
            setIsPanning(true);
          }
        }}
        onMouseUp={() => {
          setIsPanning(false);
        }}
        onMouseMove={handleMouseMove}
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

        {/* ZONES */}
        <Layer>
          {zones.map((zone) => (
            <ZoneRenderer key={zone.id} zone={zone} />
          ))}
        </Layer>

        {/* TABLES */}
        <Layer>
          {tables.map((t) => (
            <TableRenderer
              key={t.id}
              table={{
                ...t,
                openAddGuestModal: () =>
                  setAddGuestTable(t),
              }}
            />
          ))}
          <GhostPreview />
        </Layer>

        {/* DELETE TABLE BUTTONS */}
        <Layer>
          {tables.map((t) => (
            <DeleteTableButton key={t.id} table={t} />
          ))}
        </Layer>
      </Stage>

      {/* ADD TABLE */}
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 bg-green-600
                   text-white px-4 py-2 rounded-lg z-50"
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
