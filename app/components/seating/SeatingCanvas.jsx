"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";

/* STORES */
import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

/* RENDERERS */
import TableRenderer from "@/app/components/seating/TableRenderer";
import ZoneRenderer from "@/app/components/zones/ZoneRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";
import GridLayer from "@/app/components/seating/GridLayer";

/* MODALS / UI */
import AddTableDrawer from "@/app/dashboard/seating/AddTableDrawer";
import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";
import MobileGuests from "@/app/dashboard/seating/MobileGuests";

/* ============================================================
   PROPS
============================================================ */
export default function SeatingCanvas({
  background,
  mode = "editor", // "editor" | "viewer"
  showStats = false,
}) {
  const readOnly = mode === "viewer";
  const [bgImage] = useImage(background || "", "anonymous");

  /* ================= STORES ================= */
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const draggedGuest = useSeatingStore((s) => s.draggingGuest);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);
  const [addGuestTable, setAddGuestTable] = useState(null);


  const showAddModal = useSeatingStore((s) => s.showAddModal);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);
  const addTable = useSeatingStore((s) => s.addTable);

  const canvasView = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);

  const zones = useZoneStore((s) => s.zones);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const removeZone = useZoneStore((s) => s.removeZone);

  /* ================= CONTAINER SIZE ================= */
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resize = () => {
      setSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
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

  const panStart = useRef(null);
  const stageStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasView) return;
    setScale(canvasView.scale ?? 1);
    setStagePos({
      x: canvasView.x ?? 0,
      y: canvasView.y ?? 0,
    });
  }, [canvasView]);

  /* ================= AUTO FIT (ONE TIME) ================= */
useEffect(() => {
  if (!tables.length) return;
  if (!size.width || !size.height) return;

  const isDefault =
    !canvasView ||
    (canvasView.scale === 1 &&
      canvasView.x === 0 &&
      canvasView.y === 0);

  if (!isDefault) return;

  const xs = tables.map((t) => t.x);
  const ys = tables.map((t) => t.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);

  const PAD = 400;

  const scale = Math.max(
    0.4,
    Math.min(
      3,
      Math.min(
        size.width / (contentW + PAD),
        size.height / (contentH + PAD)
      )
    )
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const x = size.width / 2 - centerX * scale;
  const y = size.height / 2 - centerY * scale;

  setCanvasView({ x, y, scale });
}, [tables, size, canvasView, setCanvasView]);


  const handleMouseMove = (e) => {
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

  const handleWheel = (e) => {
    if (readOnly) return;

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

    function onKeyDown(e) {
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
  const handleAddTable = (type, seats) => {
    const view = canvasView ?? { x: 0, y: 0, scale: 1 };

    const centerX = (-view.x + size.width / 2) / view.scale;
    const centerY = (-view.y + size.height / 2) / view.scale;

    addTable(type, seats, { x: centerX, y: centerY });
  };

  /* ================= UNSEATED ================= */
  const unseatedGuests = useMemo(() => {
    const seated = new Set();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((s) => seated.add(String(s.guestId)))
    );
    return guests.filter(
      (g) => !seated.has(String(g.id ?? g._id))
    );
  }, [tables, guests]);

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
          {tables.map((t) => {
            const used = t.seatedGuests?.length ?? 0;
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
            {tables.map((t) => (
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

      {!readOnly && draggedGuest && (
        <MobileGuests
          onDragStart={startDragGuest}
          onClose={() => {}}
        />
      )}

      {mode === "editor" && addGuestTable && (
  <AddGuestToTableModal
    table={addGuestTable}
    guests={unseatedGuests}
    onClose={() => setAddGuestTable(null)}
  />
)}

    </div>
  );
}
