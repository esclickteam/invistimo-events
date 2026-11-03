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

import { displayedOuter } from "@/lib/seating/tableVisual";
import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

import TableRenderer from "@/app/components/seating/TableRenderer";
import ZoneRenderer from "@/app/components/zones/ZoneRenderer";
import GhostPreview from "@/app/components/GhostPreview";
import AddTableDrawer from "./AddTableDrawer";
import AddGuestToTableModal from "@/app/components/AddGuestToTableModal";
import MobileGuests from "./MobileGuests";
import { captureSeatingStage, SEATING_EXPORT_HIDE_NAME } from "./seatingExport";
import {
  clamp,
  computeCanonicalBackgroundRect,
  fillViewToRect,
  fitViewToBounds,
  getBackgroundRect,
  getContentBounds,
  getSketchDisplayOpacity,
  preserveWorldCenterOnResize,
  type BackgroundLike,
  type CanvasView,
} from "@/lib/seating/canvasLayout";

/* ============================================================
   GLOBAL WINDOW TYPE
============================================================ */
declare global {
  interface Window {
    __captureInvistimoSeatingMap?: () => HTMLCanvasElement | null;
    __fitInvistimoSeatingToScreen?: () => void;
    __fillInvistimoSeatingToScreen?: () => void;
  }
}

type ViewMode = "fill" | "fit";

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
  /** When provided, the entry view waits until the event seating was loaded from the server. */
  initialViewReady?: boolean;
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
  layoutScale?: number;
};

const MIN_SCALE = 0.04;
const MAX_SCALE = 6;

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
  initialViewReady,
}: SeatingEditorProps) {
  const storeBackground = useSeatingStore(
    (s) => s.background
  ) as BackgroundLike;
  const backgroundUrl =
    typeof storeBackground === "string"
      ? storeBackground
      : (storeBackground && storeBackground.url) ||
        (typeof background === "string" ? background : "") ||
        "";
  const [bgImage] = useImage(backgroundUrl, "anonymous");
  const setBackground = useSeatingStore((s) => s.setBackground);
  const backgroundRect =
    storeBackground && typeof storeBackground === "object"
      ? getBackgroundRect(storeBackground)
      : null;

  /* ================= STORES ================= */
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const selectedTableIds = useSeatingStore(
    (s) => s.selectedTableIds
  ) as string[];
  const selectAllTables = useSeatingStore((s) => s.selectAllTables);
  const setSelectedLayoutPercent = useSeatingStore(
    (s) => s.setSelectedLayoutPercent
  );
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

  const [addGuestTable, setAddGuestTable] = useState<Table | null>(null);

  /* ================= CONTAINER / STAGE REFS ================= */
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);

  /* ================= EXPORT REAL MAP IMAGE ================= */
  const captureSeatingMapCanvas = useCallback(
    () => captureSeatingStage(stageRef.current),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.__captureInvistimoSeatingMap = captureSeatingMapCanvas;

    return () => {
      if (window.__captureInvistimoSeatingMap === captureSeatingMapCanvas) {
        delete window.__captureInvistimoSeatingMap;
      }
    };
  }, [captureSeatingMapCanvas]);

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

      setSize((prev) => {
        const next = {
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
        };

        if (
          prev.width === next.width &&
          prev.height === next.height
        ) {
          return prev;
        }

        return next;
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
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const panStart = useRef<{ x: number; y: number } | null>(null);
  const stageStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const viewRef = useRef<CanvasView>({ x: 0, y: 0, scale: 1 });

  const didFitCanvasOnEntryRef = useRef(false);
  const prevInvitationIdRef = useRef<string | null>(invitationId ?? null);
  const didResolveBackgroundRef = useRef(false);

  useEffect(() => {
    viewRef.current = { x: stagePos.x, y: stagePos.y, scale };
  }, [scale, stagePos.x, stagePos.y]);

  const computeBounds = useCallback(() => {
    return getContentBounds({
      tables,
      zones,
      background: storeBackground,
      mobile: isMobile,
    });
  }, [isMobile, storeBackground, tables, zones]);

  const applyView = useCallback(
    (nextView: CanvasView, persist = true) => {
      setScale(nextView.scale);
      setStagePos({ x: nextView.x, y: nextView.y });
      if (persist) setCanvasView(nextView);
    },
    [setCanvasView]
  );

  const [viewMode, setViewMode] = useState<ViewMode>("fill");

  const fitContentToScreen = useCallback(() => {
    if (size.width <= 0 || size.height <= 0) return false;

    const bounds = computeBounds();
    if (!bounds) return false;

    const nextView = fitViewToBounds({
      bounds,
      viewportWidth: size.width,
      viewportHeight: size.height,
      paddingX: isMobile ? 36 : 110,
      paddingY: isMobile ? 92 : 110,
      minScale: isMobile ? 0.08 : 0.14,
      // Allow zooming in enough that small layouts are readable; never
      // mutates table/sketch world geometry.
      maxScale: isMobile ? 1.4 : 2.5,
    });

    setViewMode("fit");
    applyView(nextView, true);
    return true;
  }, [applyView, computeBounds, isMobile, size.height, size.width]);

  const fillSketchToScreen = useCallback(() => {
    if (size.width <= 0 || size.height <= 0) return false;

    const rect = backgroundRect;
    if (!rect) {
      // No sketch yet — fall back to fitting tables/zones only.
      return fitContentToScreen();
    }

    const nextView = fillViewToRect({
      rect,
      viewportWidth: size.width,
      viewportHeight: size.height,
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
    });

    setViewMode("fill");
    applyView(nextView, true);
    return true;
  }, [
    applyView,
    backgroundRect,
    fitContentToScreen,
    size.height,
    size.width,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__fitInvistimoSeatingToScreen = () => {
      fitContentToScreen();
    };
    window.__fillInvistimoSeatingToScreen = () => {
      fillSketchToScreen();
    };
    return () => {
      if (window.__fitInvistimoSeatingToScreen) {
        delete window.__fitInvistimoSeatingToScreen;
      }
      if (window.__fillInvistimoSeatingToScreen) {
        delete window.__fillInvistimoSeatingToScreen;
      }
    };
  }, [fillSketchToScreen, fitContentToScreen]);

  const prevSizeForResizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const prev = prevSizeForResizeRef.current;

    if (
      didFitCanvasOnEntryRef.current &&
      prev.width > 0 &&
      prev.height > 0 &&
      size.width > 0 &&
      size.height > 0 &&
      (prev.width !== size.width || prev.height !== size.height)
    ) {
      const nextView = preserveWorldCenterOnResize({
        prevWidth: prev.width,
        prevHeight: prev.height,
        nextWidth: size.width,
        nextHeight: size.height,
        view: viewRef.current,
      });
      applyView(nextView, true);
    }

    prevSizeForResizeRef.current = {
      width: size.width,
      height: size.height,
    };
  }, [applyView, size.height, size.width]);

  useEffect(() => {
    const currentInvitationId = invitationId ?? null;

    if (prevInvitationIdRef.current !== currentInvitationId) {
      didFitCanvasOnEntryRef.current = false;
      didResolveBackgroundRef.current = false;
      prevInvitationIdRef.current = currentInvitationId;
    }
  }, [invitationId]);

  useEffect(() => {
    // New upload / URL change must re-resolve world rect.
    didResolveBackgroundRef.current = false;
  }, [background]);

  const [viewSettled, setViewSettled] = useState(false);

  useEffect(() => {
    if (didFitCanvasOnEntryRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;
    if (initialViewReady === false) return;

    const hasContent =
      tables.length > 0 || zones.length > 0 || Boolean(backgroundRect);
    if (initialViewReady === undefined && !hasContent && !background) return;

    const timer = window.setTimeout(() => {
      didFitCanvasOnEntryRef.current = true;

      // Default camera: Fill Screen when a sketch exists (aspect preserved,
      // overflow via pan). Fit remains available as an explicit mode.
      // Camera-only — never rewrites table x/y/rotation/layoutScale.
      if (backgroundRect) {
        fillSketchToScreen();
      } else if (hasContent || background) {
        fitContentToScreen();
      }

      setViewSettled(true);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    background,
    backgroundRect,
    fillSketchToScreen,
    fitContentToScreen,
    initialViewReady,
    size.height,
    size.width,
    tables.length,
    zones.length,
  ]);

  /*
    Resolve missing background world rect once image loads.
    Never pin sketch size to the current viewport/zoom — that breaks
    shared coordinates with tables.
  */
  useEffect(() => {
    if (readOnly) return;
    if (!viewSettled) return;
    if (!background || backgroundRect) return;
    if (!bgImage || bgImage.width <= 0 || bgImage.height <= 0) return;
    if (didResolveBackgroundRef.current) return;

    const current = useSeatingStore.getState().background as BackgroundLike;
    if (!current || typeof current !== "object" || current.url !== background) {
      return;
    }

    didResolveBackgroundRef.current = true;

    const contentWithoutBg = getContentBounds({
      tables,
      zones,
      background: null,
      mobile: isMobile,
    });

    const preferNaturalOrigin = Boolean(current.fitOnLoad);
    const rect = computeCanonicalBackgroundRect({
      imageWidth: bgImage.width,
      imageHeight: bgImage.height,
      contentBounds: contentWithoutBg,
      preferNaturalOrigin,
    });

    // Only backfill a missing world rect (new upload / legacy url-only).
    // Never rewrite an existing rect, table geometry, or seating assignments.
    const { fitOnLoad: _fitOnLoad, ...rest } = current;
    setBackground({
      ...rest,
      ...rect,
      naturalWidth: bgImage.width,
      naturalHeight: bgImage.height,
    });

    // Apply Fill using the just-computed rect (state backgroundRect is still
    // stale in this tick). Camera-only — tables stay put.
    if (size.width > 0 && size.height > 0) {
      const nextView = fillViewToRect({
        rect,
        viewportWidth: size.width,
        viewportHeight: size.height,
        minScale: MIN_SCALE,
        maxScale: MAX_SCALE,
      });
      setViewMode("fill");
      applyView(nextView, true);
    }
  }, [
    applyView,
    background,
    backgroundRect,
    bgImage,
    isMobile,
    readOnly,
    setBackground,
    size.height,
    size.width,
    tables,
    viewSettled,
    zones,
  ]);

  useEffect(() => {
    if (!canvasView) return;

    const isSameView =
      canvasView.scale === scale &&
      canvasView.x === stagePos.x &&
      canvasView.y === stagePos.y;

    if (isSameView) return;

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

  const persistCanvasView = (next: CanvasView) => {
    setCanvasView(next);
  };

  const pointerToWorld = (pointer: { x: number; y: number }) => ({
    x: (pointer.x - stagePos.x) / scale,
    y: (pointer.y - stagePos.y) / scale,
  });

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

    const world = pointerToWorld(pos);
    updateGhost(world);
    evalHover(world);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };
    const seating = useSeatingStore.getState() as {
      tables: Array<{
        id: string;
        x: number;
        y: number;
        seats?: number;
        type?: string;
        layoutScale?: number;
      }>;
      selectedTableIds?: string[];
      scaleSelectedTables?: (factor: number) => void;
    };
    const selected = new Set((seating.selectedTableIds || []).map(String));
    const zoomCamera = Boolean(e.evt.ctrlKey || e.evt.metaKey);
    const overSelected =
      !zoomCamera &&
      (seating.tables || []).some((table) => {
        if (!selected.has(String(table.id))) return false;
        const radius = displayedOuter(table) / 2;
        const dx = world.x - Number(table.x);
        const dy = world.y - Number(table.y);
        return Math.hypot(dx, dy) <= radius;
      });

    if (overSelected && selected.size && seating.scaleSelectedTables) {
      const factor = e.evt.deltaY < 0 ? 1.06 : 1 / 1.06;
      seating.scaleSelectedTables(factor);
      return;
    }

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
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        useSeatingStore.getState().selectAllTables();
        return;
      }

      if (!selectedZoneId) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeZone(selectedZoneId);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
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
      data-sidebar-open={sidebarOpen ? "true" : "false"}
      data-dragging-guest={draggedGuest ? "true" : "false"}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onMouseDown={(e) => {
            if (e.evt.button !== 0) return;
            if (e.target !== e.target.getStage()) return;

            if (!e.evt.shiftKey) {
              useSeatingStore.getState().clearTableSelection();
            }

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
              backgroundRect && (
                <KonvaImage
                  image={bgImage}
                  x={backgroundRect.x}
                  y={backgroundRect.y}
                  width={backgroundRect.width}
                  height={backgroundRect.height}
                  opacity={getSketchDisplayOpacity(
                    typeof storeBackground === "object" &&
                      storeBackground &&
                      typeof storeBackground.opacity === "number"
                      ? storeBackground.opacity
                      : null
                  )}
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
                      : () => setAddGuestTable(table),
                    statsLabel: showStats
                      ? `${used} / ${table.capacity ?? "—"}`
                      : undefined,
                  }}
                  hideSeats={hideSeats}
                  cameraScale={scale}
                />
              );
            })}
          </Layer>

          {!readOnly && (
            <Layer listening={false} name={SEATING_EXPORT_HIDE_NAME}>
              <GhostPreview />
            </Layer>
          )}

        </Stage>
      )}

      <div
        className="
          absolute bottom-4 left-4 z-20 flex flex-col gap-2
          md:bottom-6 md:left-6
        "
        dir="rtl"
      >
        <button
          type="button"
          data-tour="fill-screen"
          onClick={() => fillSketchToScreen()}
          className={`
            rounded-2xl border px-3 py-2 text-xs font-black shadow-sm
            backdrop-blur-md transition md:px-4 md:text-sm
            ${
              viewMode === "fill"
                ? "border-[#17203a] bg-[#17203a] text-white"
                : "border-[#e5d2b8] bg-white/90 text-[#6f5536] hover:bg-[#fff8ee]"
            }
          `}
        >
          מלא את המסך
        </button>
        <button
          type="button"
          data-tour="fit-to-screen"
          onClick={() => fitContentToScreen()}
          className={`
            rounded-2xl border px-3 py-2 text-xs font-black shadow-sm
            backdrop-blur-md transition md:px-4 md:text-sm
            ${
              viewMode === "fit"
                ? "border-[#17203a] bg-[#17203a] text-white"
                : "border-[#e5d2b8] bg-white/90 text-[#6f5536] hover:bg-[#fff8ee]"
            }
          `}
        >
          התאם למסך
        </button>
        <button
          type="button"
          data-tour="select-all-tables"
          onClick={() => selectAllTables()}
          className="
            rounded-2xl border border-[#e5d2b8] bg-white/90 px-3 py-2
            text-xs font-black text-[#6f5536] shadow-sm backdrop-blur-md
            transition hover:bg-[#fff8ee] md:px-4 md:text-sm
          "
        >
          בחר הכל
          {selectedTableIds?.length ? ` (${selectedTableIds.length})` : ""}
        </button>
        {selectedTableIds?.length ? (
          <label className="flex items-center gap-2 rounded-2xl border border-[#e5d2b8] bg-white/90 px-3 py-2 text-xs font-black text-[#6f5536] shadow-sm">
            גודל %
            <input
              type="number"
              min={20}
              max={250}
              step={1}
              defaultValue={Math.round(
                (Number(
                  tables.find((table) =>
                    selectedTableIds.map(String).includes(String(table.id))
                  )?.layoutScale
                ) || 1) * 100
              )}
              key={selectedTableIds.join(",")}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setSelectedLayoutPercent(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  (event.target as HTMLInputElement).blur();
                }
              }}
              className="w-16 rounded-lg border border-[#e5d2b8] bg-white px-2 py-1 text-center"
            />
          </label>
        ) : null}
      </div>

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
