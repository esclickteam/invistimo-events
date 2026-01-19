"use client";

import {
  useEffect,
  useState,
  Suspense,
  useRef,
} from "react";
import { Stage, Layer, Image as KonvaImage, Group } from "react-konva";
import useImage from "use-image";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import ZoneRenderer from "@/app/components/zones/ZoneRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import DeleteTableButton from "@/app/components/seating/DeleteTableButton";
import GridLayer from "@/app/components/seating/GridLayer";
import MobileGuests from "./MobileGuests";

/* ============================================================
   TYPES
============================================================ */
export type SeatingMode = "editor" | "viewer";

type SeatingCanvasProps = {
  background: string | null;
  mode: SeatingMode;
  showStats?: boolean;
};

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

/* ============================================================
   COMPONENT
============================================================ */
function SeatingCanvasInner({
  background,
  mode,
  showStats = false,
}: SeatingCanvasProps) {
  const isViewer = mode === "viewer";
  const [bgImage] = useImage(background || "", "anonymous");

  /* ================= STORES ================= */
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const canvasView = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);

  const updateGhost = useSeatingStore((s) => s.updateGhostPosition);
  const evalHover = useSeatingStore((s) => s.evaluateHover);

  const zones = useZoneStore((s) => s.zones);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const removeZone = useZoneStore((s) => s.removeZone);

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

  /* ================= CANVAS VIEW ================= */
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasView) return;

    setScale(canvasView.scale ?? 1);
    setStagePos({
      x: canvasView.x ?? 0,
      y: canvasView.y ?? 0,
    });
  }, [canvasView]);

  /* ============================================================
     ✅ AUTO FIT – VIEWER ONLY (זהה ללקוח)
  ============================================================ */
  useEffect(() => {
    if (!isViewer) return;
    if (!tables.length) return;
    if (!size.width || !size.height) return;

    const isDefault =
  !canvasView ||
  canvasView.scale == null ||
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

    console.log("🟢 [Viewer AutoFit]", { x, y, scale });

    setCanvasView({ x, y, scale });
  }, [isViewer, tables, size, canvasView, setCanvasView]);

  /* ================= EVENTS ================= */
  const handleMouseMove = (e: any) => {
    if (isViewer) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    updateGhost(pos);
    evalHover(pos);
  };

  const handleWheel = (e: any) => {
    if (isViewer) return;

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
    setCanvasView({ x: newPos.x, y: newPos.y, scale: newScale });
  };

  useEffect(() => {
    if (isViewer) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!selectedZoneId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeZone(selectedZoneId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedZoneId, removeZone, isViewer]);

  if (!canvasView) return null;

  /* ================= RENDER ================= */
  return (
    <div ref={containerRef} className="relative w-full h-full">
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
        <Layer>
          <Group>
            <GridLayer width={size.width} height={size.height} />

            {bgImage && (
              <KonvaImage
                image={bgImage}
                width={size.width}
                height={size.height}
                opacity={0.28}
              />
            )}

            {zones.map((z) => (
              <ZoneRenderer key={z.id} zone={z} />
            ))}

            {tables.map((t) => {
              const used = t.seatedGuests?.length ?? 0;

              return (
                <TableRenderer
                  key={t.id}
                  table={{
                    ...t,
                    statsLabel: showStats
                      ? `${used} / ${t.capacity ?? "—"}`
                      : undefined,
                  }}
                />
              );
            })}
          </Group>
        </Layer>

        {!isViewer && (
          <Layer listening={false}>
            <GhostPreview />
          </Layer>
        )}

        {!isViewer && (
          <Layer>
            {tables.map((t) => (
              <DeleteTableButton key={t.id} table={t} />
            ))}
          </Layer>
        )}
      </Stage>

      {!isViewer && <MobileGuests onDragStart={() => {}} onClose={() => {}} />}
    </div>
  );
}

/* ============================================================
   EXPORT
============================================================ */
export default function SeatingCanvas(props: SeatingCanvasProps) {
  return (
    <Suspense fallback={null}>
      <SeatingCanvasInner {...props} />
    </Suspense>
  );
}
