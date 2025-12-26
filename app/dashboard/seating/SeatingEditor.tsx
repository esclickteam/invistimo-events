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
  seatedGuests?: SeatedGuest[];
};

/* ============================================================
   INNER
============================================================ */
function SeatingEditorInner({ background }: { background: string | null }) {
  const [bgImage] = useImage(background || "", "anonymous");

  /* ================= STORES ================= */
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const guests = useSeatingStore((s) => s.guests) as Guest[];

  const draggedGuest = useSeatingStore((s) => s.draggingGuest);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);

  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);
  const addTable = useSeatingStore((s) => s.addTable);

  const canvasView = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);

  const zones = useZoneStore((s) => s.zones);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const removeZone = useZoneStore((s) => s.removeZone);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  /* ================= LOCAL UI STATE ================= */
  const [showGuests, setShowGuests] = useState(false);
  const demoMode = useSeatingStore((s) => s.demoMode);

useEffect(() => {
  if (demoMode) {
    setShowGuests(true); // 🔥 בדמו – פותחים רשימת אורחים אוטומטית
  }
}, [demoMode]);

  const [addGuestTable, setAddGuestTable] = useState<Table | null>(null);

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

  useEffect(() => {
    if (!canvasView) return;
    setScale(canvasView.scale ?? 1);
    setStagePos({
      x: canvasView.x ?? 0,
      y: canvasView.y ?? 0,
    });
  }, [canvasView]);

  const handleMouseMove = (e: any) => {
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
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedZoneId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeZone(selectedZoneId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedZoneId, removeZone]);

  /* ================= ADD TABLE ================= */
  const handleAddTable = (type: string, seats: number) => {
    const view = canvasView ?? { x: 0, y: 0, scale: 1 };

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
    tables.forEach((t) =>
      t.seatedGuests?.forEach((s) => seated.add(String(s.guestId)))
    );
    return guests.filter(
      (g) => !seated.has(String(g.id ?? g._id))
    );
  }, [tables, guests]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* ➕ הוסף שולחן */}
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50"
      >
        ➕ הוסף שולחן
      </button>

      {/* 👥 רשימת אורחים – מובייל */}
      <button
        onClick={() => setShowGuests(true)}
        className="
          absolute
          top-16
          left-4
          md:hidden
          bg-white
          border
          border-gray-200
          text-gray-700
          px-4
          py-2
          rounded-lg
          shadow
          z-50
          flex
          items-center
          gap-2
        "
      >
        רשימת אורחים 👥
      </button>

      {/* ZOOM */}
      <button
        onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
        className="absolute top-28 left-4 bg-white shadow rounded-full w-12 h-12 text-2xl z-50"
      >
        +
      </button>
      <button
        onClick={() => setScale((s) => Math.max(s - 0.1, 0.4))}
        className="absolute top-44 left-4 bg-white shadow rounded-full w-12 h-12 text-2xl z-50"
      >
        −
      </button>

      <Stage
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          if (e.target === stage) {
            setSelectedZone(null);
            setIsPanning(true);
            const pos = stage.getPointerPosition();
            if (pos) {
              panStart.current = pos;
              stageStart.current = stagePos;
            }
          }
        }}
        onMouseUp={() => {
          setIsPanning(false);
          panStart.current = null;
        }}
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
          {tables.map((t) => (
            <TableRenderer
              key={t.id}
              table={{
                ...t,
                openAddGuestModal: () => setAddGuestTable(t),
              }}
            />
          ))}
        </Layer>

        <Layer listening={false}>
          <GhostPreview />
        </Layer>

        <Layer>
          {tables.map((t) => (
            <DeleteTableButton key={t.id} table={t} />
          ))}
        </Layer>
      </Stage>

      {showAddModal && (
        <AddTableDrawer
          open
          onClose={() => setShowAddModal(false)}
          onAdd={({ type, seats }) => {
            handleAddTable(type, seats);
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

      {showGuests && (
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
export default function SeatingEditor({
  background,
}: {
  background: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <SeatingEditorInner background={background} />
    </Suspense>
  );
}
