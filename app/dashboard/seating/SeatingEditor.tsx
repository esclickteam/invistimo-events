"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useSearchParams } from "next/navigation";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import ZoneRenderer from "@/app/components/zones/ZoneRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import GuestSidebar from "./GuestSidebar";
import AddTableDrawer from "./AddTableDrawer";
import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";
import GridLayer, { snapPosition } from "@/app/components/seating/GridLayer";

/* ============================================================
   TYPES
============================================================ */
type Guest = { id?: string; _id?: string; name?: string };
type SeatedGuest = { guestId: string };
type Table = { id: string; seatedGuests?: SeatedGuest[] };

/* ============================================================
   MAIN EDITOR COMPONENT
============================================================ */
function SeatingEditorInner({ background }: { background: string | null }) {
  const [bgImage] = useImage(background || "", "anonymous");

  /* ================= STORES ================= */
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const draggedGuest = useSeatingStore((s) => s.draggedGuest ?? s.draggingGuest);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);
  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);
  const addTable = useSeatingStore((s) => s.addTable);

  /* ================= ZONES ================= */
  const zones = useZoneStore((s) => s.zones);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  /* ================= Highlight ================= */
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const highlightedGuestIdRaw = searchParams.get("guestId");
  const isPersonalMode = from === "personal" && !!highlightedGuestIdRaw;

  const canonicalGuestId = useMemo(() => {
    if (!highlightedGuestIdRaw) return null;
    const raw = String(highlightedGuestIdRaw);
    const found = guests.find((g) => String(g?._id ?? g?.id ?? "") === raw);
    return found ? String(found.id ?? found._id) : raw;
  }, [highlightedGuestIdRaw, guests]);

  const highlightedTableId = useMemo(() => {
    if (!isPersonalMode || !canonicalGuestId) return null;
    const table = tables.find((t) =>
      t.seatedGuests?.some((s) => String(s.guestId) === String(canonicalGuestId))
    );
    return table?.id || null;
  }, [tables, canonicalGuestId, isPersonalMode]);

  useEffect(() => {
    if (!isPersonalMode || draggedGuest) return;
    useSeatingStore.setState({ highlightedTable: highlightedTableId ?? null });
  }, [highlightedTableId, draggedGuest, isPersonalMode]);

  /* ================= Add Guest Modal ================= */
  const [addGuestTable, setAddGuestTable] = useState<Table | null>(null);

  /* ================= Canvas Config ================= */
  const width = typeof window !== "undefined" ? window.innerWidth - 260 : 1200;
  const height = typeof window !== "undefined" ? window.innerHeight - 100 : 800;

  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const handleMouseMove = (e: any) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    updateGhost(pos);
    evalHover(pos);
  };

  const handleDragMove = (e: any) => {
    const pos = e.target.position();
    const snapped = snapPosition(pos);
    e.target.position(snapped);
  };

  /* ================= Guests without Seats ================= */
  const unseatedGuests = useMemo(() => {
    const seatedIds = new Set(
      tables.flatMap((t) => t.seatedGuests?.map((s) => String(s.guestId)) || [])
    );
    return guests.filter((g) => !seatedIds.has(String(g.id ?? g._id)));
  }, [tables, guests]);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="flex relative w-full h-full overflow-hidden">
      {/* === Sidebar (לא נוגעים) === */}
      <GuestSidebar onDragStart={startDragGuest} />

      {/* === Zoom Controls === */}
      <button
        onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
        className="absolute top-20 left-4 bg-white shadow rounded-full w-12 h-12 text-2xl z-50"
      >
        +
      </button>
      <button
        onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}
        className="absolute top-36 left-4 bg-white shadow rounded-full w-12 h-12 text-2xl z-50"
      >
        −
      </button>

      {/* === Stage Canvas === */}
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isPanning}
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          if (e.target === stage) {
            setSelectedZone(null);
            setIsPanning(true);
          }
        }}
        onMouseUp={() => setIsPanning(false)}
        className="flex-1 cursor-default bg-[#f8f8f8]"
      >
        {/* === Grid === */}
        <Layer listening={false}>
          <GridLayer width={width} height={height} />
        </Layer>

        {/* === Background === */}
        <Layer listening={false}>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              width={width}
              height={height}
              opacity={0.25}
            />
          )}
        </Layer>

        {/* === Zones === */}
        <Layer>
          {zones.map((zone) => (
            <ZoneRenderer key={zone.id} zone={zone} />
          ))}
        </Layer>

        {/* === Tables === */}
        <Layer>
          {tables.map((t) => (
            <TableRenderer
              key={t.id}
              table={{
                ...t,
                onDragMove: handleDragMove,
                openAddGuestModal: () => setAddGuestTable(t),
              }}
            />
          ))}
        </Layer>

        {/* === Ghost (Dragged Guest) === */}
        <Layer listening={false}>
          <GhostPreview />
        </Layer>
      </Stage>

      {/* === Add Table Button === */}
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 bg-green-600 hover:bg-green-700 transition text-white px-4 py-2 rounded-lg shadow z-50"
      >
        ➕ הוסף שולחן
      </button>

      {/* === Drawer: Add Table === */}
      <AddTableDrawer
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={({ type, seats }) => {
          addTable(type, seats);
          setShowAddModal(false);
        }}
      />

      {/* === Modal: Assign Guest to Table === */}
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

/* ============================================================
   WRAPPER
============================================================ */
export default function SeatingEditor({ background }: { background: string | null }) {
  return (
    <Suspense fallback={null}>
      <SeatingEditorInner background={background} />
    </Suspense>
  );
}
