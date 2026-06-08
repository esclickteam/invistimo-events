"use client";

import {
  useEffect,
  useMemo,
  useState,
  Suspense,
  useRef,
  useCallback,
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
import MobileGuests from "./MobileGuests";

/* ============================================================
   TYPES
============================================================ */
type SeatingEditorProps = {
  background: string | null;
  invitationId?: string | null;
  onAutoSave?: () => Promise<boolean>;
  readOnly?: boolean;
  showStats?: boolean;
  hideSeats?: boolean;
  sidebarOpen?: boolean;
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
  _id?: string;
  x: number;
  y: number;
  capacity?: number;
  seatedGuests?: SeatedGuest[];
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const getTableId = (table: Table | null | undefined) =>
  String(table?.id ?? table?._id ?? "");

/* ============================================================
   INNER
============================================================ */
function SeatingEditorInner({
  background,
  invitationId = null,
  onAutoSave,
  readOnly = false,
  showStats = false,
  hideSeats = false,
  sidebarOpen = false,
}: SeatingEditorProps) {
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

  /* ================= LOCAL UI STATE ================= */
  const [showGuests, setShowGuests] = useState(false);
  const demoMode = useSeatingStore((s) => s.demoMode);

  useEffect(() => {
    if (demoMode && !readOnly) {
      setShowGuests(true);
    }
  }, [demoMode, readOnly]);

  /*
    חשוב:
    לא שומרים פה אובייקט שולחן שלם, כי הוא נהיה snapshot ישן.
    שומרים רק ID, וכל רינדור שולפים את השולחן המעודכן מתוך tables.
    זה מה שמסנכרן כיסא שנוסף במודאל גם לשולחן עצמו.
  */
  const [addGuestTableId, setAddGuestTableId] = useState<string | null>(null);

  const addGuestTable = useMemo(() => {
    if (!addGuestTableId) return null;

    return (
      tables.find((table) => getTableId(table) === String(addGuestTableId)) ||
      null
    );
  }, [tables, addGuestTableId]);

  /* ================= CONTAINER / VIEWPORT SIZE ================= */
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateMobile();

    window.addEventListener("resize", updateMobile);
    window.addEventListener("orientationchange", updateMobile);

    return () => {
      window.removeEventListener("resize", updateMobile);
      window.removeEventListener("orientationchange", updateMobile);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const getViewportElement = () => {
      const section = containerRef.current?.closest("section");
      return (section || containerRef.current) as HTMLElement | null;
    };

    const viewportElement = getViewportElement();
    if (!viewportElement) return;

    const updateSize = () => {
      const rect = viewportElement.getBoundingClientRect();
      setSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportElement);

    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, []);

  /* ================= ZOOM & PAN ================= */
  const MIN_SCALE = 0.04;
  const MAX_SCALE = 6;

  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const panStart = useRef<{ x: number; y: number } | null>(null);
  const stageStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);

  const didFitCanvasOnEntryRef = useRef(false);
  const prevInvitationIdRef = useRef<string | null>(invitationId ?? null);

  const getContentBounds = useCallback((): Bounds | null => {
    const xs: number[] = [];
    const ys: number[] = [];

    const tableSafeSize = isMobile ? 260 : 230;

    tables.forEach((table: any) => {
      if (!Number.isFinite(table.x) || !Number.isFinite(table.y)) return;

      xs.push(table.x - tableSafeSize);
      xs.push(table.x + tableSafeSize);
      ys.push(table.y - tableSafeSize);
      ys.push(table.y + tableSafeSize);
    });

    zones.forEach((zone: any) => {
      if (!Number.isFinite(zone.x) || !Number.isFinite(zone.y)) return;

      const width = Number.isFinite(zone.width) ? zone.width : 0;
      const height = Number.isFinite(zone.height) ? zone.height : 0;

      xs.push(zone.x);
      xs.push(zone.x + width);
      ys.push(zone.y);
      ys.push(zone.y + height);
    });

    if (!xs.length || !ys.length) return null;

    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }, [isMobile, tables, zones]);

  const fitAllTablesIntoScreen = useCallback(() => {
    if (size.width <= 0 || size.height <= 0) return;

    const bounds = getContentBounds();
    if (!bounds) return;

    const contentW = Math.max(1, bounds.maxX - bounds.minX);
    const contentH = Math.max(1, bounds.maxY - bounds.minY);

    const contentCenterX = bounds.minX + contentW / 2;
    const contentCenterY = bounds.minY + contentH / 2;

    const paddingX = isMobile ? 36 : 110;
    const paddingY = isMobile ? 92 : 110;

    const availableW = Math.max(240, size.width - paddingX);
    const availableH = Math.max(240, size.height - paddingY);

    const nextScale = Math.max(
      isMobile ? 0.08 : 0.14,
      Math.min(
        isMobile ? 0.9 : 1.25,
        Math.min(availableW / contentW, availableH / contentH)
      )
    );

    const nextX = size.width / 2 - contentCenterX * nextScale;
    const nextY = size.height / 2 - contentCenterY * nextScale;

    const nextView = {
      x: nextX,
      y: nextY,
      scale: nextScale,
    };

    setScale(nextView.scale);
    setStagePos({ x: nextView.x, y: nextView.y });
    setCanvasView(nextView);
  }, [getContentBounds, isMobile, setCanvasView, size.height, size.width]);

  useEffect(() => {
    const currentInvitationId = invitationId ?? null;

    if (prevInvitationIdRef.current !== currentInvitationId) {
      didFitCanvasOnEntryRef.current = false;
      prevInvitationIdRef.current = currentInvitationId;
    }
  }, [invitationId]);

  useEffect(() => {
    if (didFitCanvasOnEntryRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;
    if (!tables.length && !zones.length) return;

    didFitCanvasOnEntryRef.current = true;

    const timer = window.setTimeout(() => {
      fitAllTablesIntoScreen();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [fitAllTablesIntoScreen, size.height, size.width, tables.length, zones.length]);

  useEffect(() => {
    if (!canvasView) return;

    const isSameView =
      canvasView.scale === scale &&
      canvasView.x === stagePos.x &&
      canvasView.y === stagePos.y;

    if (isSameView) return;

    /*
      אחרי fit ראשוני לא מקבלים דריסות חיצוניות מה-store,
      כדי שריענון לייב או init חוזר לא יקפיצו את הקנבס לצד.
    */
    if (didFitCanvasOnEntryRef.current) return;

    setScale(canvasView.scale ?? 1);
    setStagePos({
      x: canvasView.x ?? 0,
      y: canvasView.y ?? 0,
    });
  }, [canvasView, scale, stagePos.x, stagePos.y]);

  const getBounds = () => {
    return {
      minX: -Infinity,
      maxX: Infinity,
      minY: -Infinity,
      maxY: Infinity,
    };
  };

  const persistCanvasView = (next: { x: number; y: number; scale: number }) => {
    setCanvasView(next);
  };

  const handleMouseMove = (e: any) => {
    if (readOnly) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (isPanning && panStart.current) {
      const dx = pos.x - panStart.current.x;
      const dy = pos.y - panStart.current.y;

      const next = {
        x: stageStart.current.x + dx,
        y: stageStart.current.y + dy,
      };

      const bounds = getBounds();

      const clamped = {
        x: clamp(next.x, bounds.minX, bounds.maxX),
        y: clamp(next.y, bounds.minY, bounds.maxY),
      };

      setStagePos(clamped);
      persistCanvasView({ ...clamped, scale });

      return;
    }

    updateGhost(pos);
    evalHover(pos);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const rawScale = direction > 0 ? scale * scaleBy : scale / scaleBy;
    const newScale = clamp(rawScale, MIN_SCALE, MAX_SCALE);

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };

    const newPosRaw = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const bounds = getBounds();

    const newPos = {
      x: clamp(newPosRaw.x, bounds.minX, bounds.maxX),
      y: clamp(newPosRaw.y, bounds.minY, bounds.maxY),
    };

    setScale(newScale);
    setStagePos(newPos);
    persistCanvasView({ ...newPos, scale: newScale });
  };

  const handleTouchStart = (e: any) => {
    const touches = e.evt.touches;

    if (touches && touches.length === 2) {
      const [t1, t2] = touches;

      lastTouchDist.current = Math.hypot(
        t1.clientX - t2.clientX,
        t1.clientY - t2.clientY
      );
    }
  };

  const handleTouchPanStart = (e: any) => {
    const stage = e.target.getStage();
    const touches = e.evt.touches;

    if (!stage || !touches || touches.length !== 1) return;

    panStart.current = {
      x: touches[0].clientX,
      y: touches[0].clientY,
    };

    stageStart.current = {
      x: stagePos.x,
      y: stagePos.y,
    };
  };

  const handleTouchMove = (e: any) => {
    const stage = e.target.getStage();
    const touches = e.evt.touches;

    if (!stage || !touches) return;

    if (touches.length === 1) {
      e.evt.preventDefault();

      const touch = touches[0];

      if (panStart.current) {
        const dx = touch.clientX - panStart.current.x;
        const dy = touch.clientY - panStart.current.y;

        const next = {
          x: stageStart.current.x + dx,
          y: stageStart.current.y + dy,
        };

        const bounds = getBounds();

        const clamped = {
          x: clamp(next.x, bounds.minX, bounds.maxX),
          y: clamp(next.y, bounds.minY, bounds.maxY),
        };

        setStagePos(clamped);
        persistCanvasView({ ...clamped, scale });
      }

      return;
    }

    if (touches.length === 2) {
      e.evt.preventDefault();

      const [t1, t2] = touches;

      const dist = Math.hypot(
        t1.clientX - t2.clientX,
        t1.clientY - t2.clientY
      );

      if (!lastTouchDist.current) {
        lastTouchDist.current = dist;
        return;
      }

      const scaleBy = dist / lastTouchDist.current;
      const newScale = clamp(scale * scaleBy, MIN_SCALE, MAX_SCALE);

      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      const mousePointTo = {
        x: (center.x - stagePos.x) / scale,
        y: (center.y - stagePos.y) / scale,
      };

      const newPosRaw = {
        x: center.x - mousePointTo.x * newScale,
        y: center.y - mousePointTo.y * newScale,
      };

      const bounds = getBounds();

      const newPos = {
        x: clamp(newPosRaw.x, bounds.minX, bounds.maxX),
        y: clamp(newPosRaw.y, bounds.minY, bounds.maxY),
      };

      setScale(newScale);
      setStagePos(newPos);
      persistCanvasView({ ...newPos, scale: newScale });

      lastTouchDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = null;
    panStart.current = null;
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
    const view = { x: stagePos.x, y: stagePos.y, scale };

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
    tables.forEach((table) =>
      table.seatedGuests?.forEach((seat) => seated.add(String(seat.guestId)))
    );
    return guests.filter((guest) => !seated.has(String(guest.id ?? guest._id)));
  }, [tables, guests]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 h-full w-full min-w-0 overflow-hidden"
      dir="ltr"
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onMouseDown={(e) => {
            if (e.evt.button !== 0) return;
            if (e.target !== e.target.getStage()) return;

            setIsPanning(true);

            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;

            panStart.current = pos;
            stageStart.current = {
              x: stagePos.x,
              y: stagePos.y,
            };
          }}
          onMouseUp={() => {
            setIsPanning(false);
            panStart.current = null;
          }}
          onMouseLeave={() => {
            setIsPanning(false);
            panStart.current = null;
          }}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onTouchStart={(e) => {
            handleTouchStart(e);
            handleTouchPanStart(e);
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => {
            handleTouchEnd();
            panStart.current = null;
            setIsPanning(false);
          }}
          style={{
            touchAction: "none",
            cursor: isPanning ? "grabbing" : "grab",
          }}
        >
          <Layer listening={false}>
            {bgImage &&
              bgImage.width > 0 &&
              bgImage.height > 0 &&
              size.width > 0 &&
              size.height > 0 && (
                <KonvaImage
                  image={bgImage}
                  x={-stagePos.x / scale}
                  y={-stagePos.y / scale}
                  width={size.width / scale}
                  height={size.height / scale}
                  opacity={0.28}
                />
              )}
          </Layer>

          <Layer>
            {zones.map((zone) => (
              <ZoneRenderer key={zone.id} zone={zone} />
            ))}
          </Layer>

          <Layer>
            {tables.map((table) => {
              const used = table.seatedGuests?.length ?? 0;

              return (
                <TableRenderer
                  key={table.id}
                  table={{
                    ...table,
                    openAddGuestModal: readOnly
                      ? undefined
                      : () => setAddGuestTableId(getTableId(table)),
                    statsLabel: showStats
                      ? `${used} / ${table.capacity ?? "—"}`
                      : undefined,
                  }}
                  hideSeats={hideSeats}
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
              {tables.map((table) => (
                <DeleteTableButton key={table.id} table={table} />
              ))}
            </Layer>
          )}
        </Stage>
      )}

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
          invitationId={invitationId ?? null}
          onAutoSave={onAutoSave}
          onClose={() => setAddGuestTableId(null)}
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