"use client";

import {
  useEffect,
  useMemo,
  useState,
  Suspense,
  useRef,
} from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import ZoneRenderer from "@/app/components/zones/ZoneRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import AddTableDrawer from "./AddTableDrawer";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";
import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";
import GridLayer from "@/app/components/seating/GridLayer";
import MobileGuests from "./MobileGuests";

/* ============================================================
   TYPES
============================================================ */
type Guest = {
  id?: string;
  _id?: string;
  name?: string;
};

type SeatedGuest = {
  guestId: string;
};

type Table = {
  id: string;
  x: number;
  y: number;
  capacity?: number;
  seatedGuests?: SeatedGuest[];
};

type CanvasView = {
  x: number;
  y: number;
  scale: number;
};

type SeatingEditorProps = {
  background: string | null;
  readOnly?: boolean;
  showStats?: boolean;
  tables?: Table[];
  guests?: Guest[];
  canvasView?: CanvasView | null;
};

/* ============================================================
   INNER COMPONENT
============================================================ */
function SeatingEditorInner({
  background,
  readOnly = false,
  showStats = false,
  tables: propTables,
  guests: propGuests,
  canvasView: propCanvasView,
}: SeatingEditorProps) {

  const [bgImage] = useImage(background || "", "anonymous");

  /* ================= STORES ================= */
  const tablesStore = useSeatingStore((s) => s.tables) as Table[];
  const guestsStore = useSeatingStore((s) => s.guests) as Guest[];
  const draggedGuest = useSeatingStore((s) => s.draggingGuest);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);
  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);
  const addTable = useSeatingStore((s) => s.addTable);
  const canvasViewStore = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);
  const demoMode = useSeatingStore((s) => s.demoMode);

  const zones = useZoneStore((s) => s.zones);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const removeZone = useZoneStore((s) => s.removeZone);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  /* ================= EFFECTIVE ================= */
  const effectiveTables = propTables ?? tablesStore;
  const effectiveGuests = propGuests ?? guestsStore;
  const effectiveCanvasView = propCanvasView ?? canvasViewStore;

  /* ================= LOCAL UI STATE ================= */
  const [showGuests, setShowGuests] = useState(false);
  const [addGuestTable, setAddGuestTable] = useState<Table | null>(null);

  useEffect(() => {
    if (demoMode && !readOnly) {
      setShowGuests(true);
    }
  }, [demoMode, readOnly]);

  /* ================= CONTAINER SIZE ================= */
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resize = () => {
      setSize({
        width: containerRef.current!.offsetWidth,
        height: containerRef.current!.offsetHeight,
      });
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ================= ZOOM & PAN ================= */
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const panStart = useRef<{ x: number; y: number } | null>(null);
  const stageStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /* ================= CENTER ON SNAPSHOT ================= */
  useEffect(() => {
    if (!effectiveTables.length) return;
    if (effectiveCanvasView) return;
    if (!size.width || !size.height) return;

    const xs = effectiveTables.map((t) => t.x);
    const ys = effectiveTables.map((t) => t.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPos = {
      x: size.width / 2 - centerX,
      y: size.height / 2 - centerY,
    };

    setStagePos(newPos);
    setScale(1);

    setCanvasView({
      x: newPos.x,
      y: newPos.y,
      scale: 1,
    });
  }, [effectiveTables, size.width, size.height, effectiveCanvasView]);

  /* ================= APPLY CANVASVIEW ================= */
  useEffect(() => {
    if (!effectiveCanvasView) return;
    setScale(effectiveCanvasView.scale ?? 1);
    setStagePos({
      x: effectiveCanvasView.x ?? 0,
      y: effectiveCanvasView.y ?? 0,
    });
  }, [effectiveCanvasView]);

  /* ================= HANDLERS ================= */
  const handleMouseMove = (e: any) => {
    if (readOnly) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    updateGhost(pos);
    evalHover(pos);

    if (isPanning && panStart.current) {
      setStagePos({
        x: stageStart.current.x + (pos.x - panStart.current.x),
        y: stageStart.current.y + (pos.y - panStart.current.y),
      });
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0
        ? Math.min(scale * scaleBy, 3)
        : Math.max(scale / scaleBy, 0.4);

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setStagePos(newPos);
    setCanvasView({ ...newPos, scale: newScale });
  };

  /* ================= DELETE ZONE ================= */
  useEffect(() => {
    if (readOnly) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!selectedZoneId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeZone(selectedZoneId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedZoneId, removeZone, readOnly]);

  /* ================= ADD TABLE ================= */
  const handleAddTable = (type: string, seats: number) => {
    const view = effectiveCanvasView ?? { x: 0, y: 0, scale: 1 };

    const centerX = (-view.x + size.width / 2) / view.scale;
    const centerY = (-view.y + size.height / 2) / view.scale;

    addTable(type, seats, {
      x: centerX,
      y: centerY,
    });
  };

  /* ================= UNSEATED ================= */
  const unseatedGuests = useMemo(() => {
    const seated = new Set<string>();
    effectiveTables.forEach((t) =>
      t.seatedGuests?.forEach((s) => seated.add(String(s.guestId)))
    );
    return effectiveGuests.filter(
      (g) => !seated.has(String(g.id ?? g._id))
    );
  }, [effectiveTables, effectiveGuests]);

  /* ================= RENDER ================= */
  return (
    <div ref={containerRef} className="relative w-full h-full">
      {!readOnly && (
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50"
        >
          ➕ הוסף שולחן
        </button>
      )}

      <Stage
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
      >
        <Layer listening={false}>
          <GridLayer width={size.width} height={size.height} />
        </Layer>

        <Layer listening={false}>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              width={size.width}
              height={size.height}
              opacity={0.28}
            />
          )}
        </Layer>

        <Layer>
          {zones.map((z) => (
            <ZoneRenderer key={z.id} zone={z} />
          ))}
        </Layer>

        <Layer>
          {effectiveTables.map((t) => {
            const used =
              t.seatedGuests?.length ?? 0;
            return (
              <TableRenderer
                key={t.id}
                table={{
                  ...t,
                  openAddGuestModal: readOnly
                    ? undefined
                    : () => setAddGuestTable(t),
                  statsLabel: showStats
                    ? `${used} / ${t.capacity ?? "—"}`
                    : undefined,
                }}
              />
            );
          })}
        </Layer>

        {!readOnly && (
          <Layer listening={false}>
            <GhostPreview />
          </Layer>
        )}

        {!readOnly && (
          <Layer>
            {effectiveTables.map((t) => (
              <DeleteTableButton key={t.id} table={t} />
            ))}
          </Layer>
        )}
      </Stage>

      {!readOnly && showAddModal && (
        <AddTableDrawer
          open
          onClose={() => setShowAddModal(false)}
          onAdd={({ type, seats }) => {
            handleAddTable(type, seats);
            setShowAddModal(false);
          }}
        />
      )}

      {!readOnly && addGuestTable && (
        <AddGuestToTableModal
          table={addGuestTable}
          guests={unseatedGuests}
          onClose={() => setAddGuestTable(null)}
        />
      )}

      {!readOnly && showGuests && (
        <MobileGuests
          onDragStart={startDragGuest}
          onClose={() => setShowGuests(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   EXPORT
============================================================ */
export default function SeatingEditor(props: SeatingEditorProps) {
  return (
    <Suspense fallback={null}>
      <SeatingEditorInner {...props} />
    </Suspense>
  );
}
