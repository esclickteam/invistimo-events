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
type SeatingEditorProps = {
  background: string | null;
  readOnly?: boolean;
  showStats?: boolean;
  hideSeats?: boolean;
  sidebarOpen?: boolean; // ⭐ חדש
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
   INNER
============================================================ */
function SeatingEditorInner({
  background,
  readOnly = false,
  showStats = false,
  hideSeats = false,
  sidebarOpen = false, // ⭐ כאן
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

  const fitCanvasToTables = useSeatingStore(
  (s) => s.fitCanvasToTables
);


  const zones = useZoneStore((s) => s.zones);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const removeZone = useZoneStore((s) => s.removeZone);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  const prevSizeRef = useRef<{ width: number; height: number } | null>(null);

  /* ================= ZOOM & PAN ================= */
const [scale, setScale] = useState(1);
const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
const [isPanning, setIsPanning] = useState(false);

const panStart = useRef<{ x: number; y: number } | null>(null);
const stageStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

// ⭐ Pinch zoom (mobile)
const lastTouchDist = useRef<number | null>(null);



  /* ================= LOCAL UI STATE ================= */
  const [showGuests, setShowGuests] = useState(false);
  const demoMode = useSeatingStore((s) => s.demoMode);

  useEffect(() => {
    if (demoMode && !readOnly) {
      setShowGuests(true);
    }
  }, [demoMode, readOnly]);

  const [addGuestTable, setAddGuestTable] = useState<Table | null>(null);

  /* ================= CONTAINER SIZE ================= */
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const isMobile =
  typeof window !== "undefined" && window.innerWidth < 768;

const getContentBounds = () => {
  const xs: number[] = [];
  const ys: number[] = [];

  // ⭐ שולחנות – לקחת בחשבון גודל אמיתי
  tables.forEach((t: any) => {
    const r = 80; // רדיוס בטוח לשולחן (עגול / מרובע)
    xs.push(t.x - r);
    xs.push(t.x + r);
    ys.push(t.y - r);
    ys.push(t.y + r);
  });

  // ⭐ אזורים
  zones.forEach((z: any) => {
    xs.push(z.x);
    ys.push(z.y);
    xs.push(z.x + z.width);
    ys.push(z.y + z.height);
  });

  if (!xs.length || !ys.length) {
    return { minX: 0, minY: 0, maxX: size.width, maxY: size.height };
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};




  useEffect(() => {
  if (!containerRef.current) return;

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    setSize({ width, height });
  });

  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);

const didInitMobileRef = useRef(false);

useEffect(() => {
  if (!isMobile) return;
  if (size.width === 0 || size.height === 0) return;
  if (didInitMobileRef.current) return;
  if (!tables.length && !zones.length) return;
if (size.width === 0 || size.height === 0) return;


  didInitMobileRef.current = true;

  const { minX, minY, maxX, maxY } = getContentBounds();

  const PAD = 220;

  const contentW = Math.max(1, (maxX - minX) + PAD);
  const contentH = Math.max(1, (maxY - minY) + PAD);

  const scaleFit = Math.min(size.width / contentW, size.height / contentH);
  const initialScale = Math.max(0.35, Math.min(1.2, scaleFit));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const x = size.width / 2 - centerX * initialScale;
  const y = size.height / 2 - centerY * initialScale;

  setScale(initialScale);
  setStagePos({ x, y });
  setCanvasView({ x, y, scale: initialScale });
}, [isMobile, size.width, size.height, tables.length, zones.length, setCanvasView]);







useEffect(() => {
  // ❗ במובייל לא מבצעים center-on-resize
  if (isMobile) return;

  if (!prevSizeRef.current) {
    prevSizeRef.current = size;
    return;
  }

  const prev = prevSizeRef.current;
  if (prev.width === size.width && prev.height === size.height) return;

  const prevCenter = {
    x: prev.width / 2,
    y: prev.height / 2,
  };

  const newCenter = {
    x: size.width / 2,
    y: size.height / 2,
  };

  const dx = newCenter.x - prevCenter.x;
  const dy = newCenter.y - prevCenter.y;

  setStagePos((pos) => {
    const next = {
      x: pos.x + dx,
      y: pos.y + dy,
    };

    setCanvasView({
      x: next.x,
      y: next.y,
      scale,
    });

    return next;
  });

  prevSizeRef.current = size;
}, [isMobile, size.width, size.height, scale]);






  useEffect(() => {
  if (!canvasView) return;

  // ❗ במובייל – לא לדרוס init
  if (isMobile && didInitMobileRef.current) return;

  setScale(canvasView.scale ?? 1);
  setStagePos({
    x: canvasView.x ?? 0,
    y: canvasView.y ?? 0,
  });
}, [canvasView, isMobile]);


  

useEffect(() => {
  if (!readOnly) return;
  if (!tables.length) return;
  if (size.width === 0 || size.height === 0) return;

  // ⭐ אם כבר יש canvasView מה־snapshot – לא נוגעים
  if (
    canvasView &&
    (canvasView.x !== 0 ||
      canvasView.y !== 0 ||
      canvasView.scale !== 1)
  ) {
    return;
  }

  fitCanvasToTables(size.width, size.height);
}, [
  readOnly,
  tables,
  size.width,
  size.height,
  canvasView,
  fitCanvasToTables,
]);



const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const getBounds = (scaleVal: number) => {
  if (!isMobile) {
    return {
      minX: -Infinity,
      maxX: Infinity,
      minY: -Infinity,
      maxY: Infinity,
    };
  }

  const { minX, minY, maxX, maxY } = getContentBounds();
  const PAD = 120;

  const contentWidth = (maxX - minX + PAD) * scaleVal;
  const contentHeight = (maxY - minY + PAD) * scaleVal;

  let minBoundX = size.width - contentWidth;
  let maxBoundX = 0;
  let minBoundY = size.height - contentHeight;
  let maxBoundY = 0;

  // ⭐ אם התוכן קטן מהמסך – משחררים / ממרכזים
  if (contentHeight <= size.height) {
    const centerY = (size.height - contentHeight) / 2;
    minBoundY = centerY;
    maxBoundY = centerY;
  }

  if (contentWidth <= size.width) {
    const centerX = (size.width - contentWidth) / 2;
    minBoundX = centerX;
    maxBoundX = centerX;
  }

  return {
    minX: minBoundX,
    maxX: maxBoundX,
    minY: minBoundY,
    maxY: maxBoundY,
  };
};






  const handleMouseMove = (e: any) => {
    if (readOnly) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    updateGhost(pos);
    evalHover(pos);

    if (isPanning && panStart.current) {
  const dx = pos.x - panStart.current.x;
  const dy = pos.y - panStart.current.y;

  const next = {
    x: stageStart.current.x + dx,
    y: stageStart.current.y + dy,
  };

  // ✅ גבולות בסיסיים לפי גודל המסך (מספיק כדי שלא "ייעלם")
  const bounds = getBounds(scale);

const clamped = {
  x: clamp(next.x, bounds.minX, bounds.maxX),
  y: clamp(next.y, bounds.minY, bounds.maxY),
};


  setStagePos(clamped);
  setCanvasView({ ...clamped, scale });


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

  const newPosRaw = {
  x: pointer.x - mousePointTo.x * newScale,
  y: pointer.y - mousePointTo.y * newScale,
};

// ✅ גבולות בסיסיים שלא יאפשרו "להיעלם" מהמסך
const bounds = getBounds(newScale);

const newPos = {
  x: clamp(newPosRaw.x, bounds.minX, bounds.maxX),
  y: clamp(newPosRaw.y, bounds.minY, bounds.maxY),
};


setScale(newScale);
setStagePos(newPos);
setCanvasView({ ...newPos, scale: newScale });
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

  // 👆 Pan עם אצבע אחת
if (touches.length === 1) {
  e.evt.preventDefault(); // ⭐ הוספה קריטית

  const t = touches[0];

  if (panStart.current) {
    const dx = t.clientX - panStart.current.x;
    const dy = t.clientY - panStart.current.y;

    const next = {
  x: stageStart.current.x + dx,
  y: stageStart.current.y + dy,
};

const bounds = getBounds(scale);

const clamped = {
  x: clamp(next.x, bounds.minX, bounds.maxX),
  y: clamp(next.y, bounds.minY, bounds.maxY),
};


setStagePos(clamped);
setCanvasView({ ...clamped, scale });

  }

  return;
}


  // 🤏 Pinch zoom – שתי אצבעות
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
    const newScale = Math.max(0.4, Math.min(3, scale * scaleBy));

    // מרכז הזום בין שתי האצבעות
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

const bounds = getBounds(newScale);

const newPos = {
  x: clamp(newPosRaw.x, bounds.minX, bounds.maxX),
  y: clamp(newPosRaw.y, bounds.minY, bounds.maxY),
};


setScale(newScale);
setStagePos(newPos);
setCanvasView({ ...newPos, scale: newScale });


    lastTouchDist.current = dist;
  }
};



const handleTouchEnd = () => {
  lastTouchDist.current = null;
  panStart.current = null; // ⭐ הוספה
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
  const view = canvasView ?? { x: 0, y: 0, scale: 1 };

  // ⚠️ מרכז ה-Stage עצמו (לא מתעסקים בסיידבר)
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
    <div
  ref={containerRef}
  className="relative w-full z-0 overflow-hidden"
  style={{ height: "100dvh" }} // ⭐ קריטי למובייל
>

      

      {size.width > 0 && size.height > 0 && (
  <Stage
  width={size.width}
  height={size.height}
  scaleX={scale}
  scaleY={scale}
  x={stagePos.x}
  y={stagePos.y}
  onWheel={handleWheel}
  onMouseMove={handleMouseMove}
  onTouchStart={(e) => {
    handleTouchStart(e);     // 🤏 init pinch (2 fingers)
    handleTouchPanStart(e);  // 👆 init pan (1 finger)
  }}
  onTouchMove={handleTouchMove}
  onTouchEnd={() => {
    handleTouchEnd();        // reset pinch
    panStart.current = null; // reset pan
  }}
  style={{
    touchAction: "none",
    position: "relative",
    zIndex: 0,
  }}
>


        <Layer listening={false}>
          <GridLayer width={size.width} height={size.height} />
        </Layer>

        <Layer listening={false}>
          {bgImage &&
  bgImage.width > 0 &&
  bgImage.height > 0 &&
  size.width > 0 &&
  size.height > 0 && (

            <KonvaImage
  image={bgImage}
  x={0}
  y={0}
  width={bgImage.width}
  height={bgImage.height}
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
  hideSeats={hideSeats} // ⭐ זה השורה החשובה
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
