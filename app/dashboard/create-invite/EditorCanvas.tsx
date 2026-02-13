 "use client";

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useMemo,
} from "react";

import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Circle,
  Transformer,
} from "react-konva";

import { useEditorStore } from "./editorStore";
import EditableTextOverlay from "../../components/editor/EditableTextOverlay";
import { loadFont } from "../../components/editor/loadFont";
import Konva from "konva";



/* ============================================================
   TYPES
============================================================ */
export interface TextObject {
  id: string;
  type: "text";
  x: number;
  y: number;
  width?: number;
  text: string;
  height?: number;

  fontFamily: string;
  fontSize: number;
  fontWeight?: "bold" | "normal";
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  fill?: string;
  rotation?: number;
}

export type EditorObject =
  | TextObject
  | {
      id: string;
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      radius: number;
      fill?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "image";
      x: number;
      y: number;
      width: number;
      height: number;
      url?: string;
      image?: HTMLImageElement | HTMLVideoElement | null;
      removeBackground?: boolean;
      isBackground?: boolean;
      rotation?: number;
    };

interface EditorCanvasProps {
  onSelect: (obj: EditorObject | null) => void;
  initialData?: { objects: EditorObject[] };
}

export interface EditorCanvasRef {
  getCanvasData?: () => any;

  getPreviewImage?: () => string; // ⭐️ זה החסר

  uploadBackground?: (file: File) => void;
  addText?: () => void;
  updateSelected?: (patch: Record<string, any>) => void;
  deleteSelected?: () => void;

  zoomIn?: () => void;
  zoomOut?: () => void;
  resetZoom?: () => void;
}

/* ============================================================
   CANVAS SIZE
============================================================ */
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 720;


/* ============================================================
   HELPERS
============================================================ */
function isBackgroundImage(obj: EditorObject) {
  return obj.type === "image" && obj.isBackground === true;
}

function getCoverDims(
  img: HTMLImageElement | HTMLVideoElement,
  canvasW: number,
  canvasH: number
) {
  const iw = (img as any).width;
  const ih = (img as any).height;

  if (!iw || !ih) return { x: 0, y: 0, width: canvasW, height: canvasH };

  const aspect = iw / ih;
  let width = canvasW;
  let height = canvasW / aspect;

  if (height < canvasH) {
    height = canvasH;
    width = canvasH * aspect;
  }

  return {
    x: (canvasW - width) / 2,
    y: (canvasH - height) / 2,
    width,
    height,
  };
}

/* ============================================================
   REMOVE WHITE BACKGROUND
============================================================ */
function removeWhiteBackground(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const EditorCanvas = forwardRef<EditorCanvasRef, EditorCanvasProps>(
  function EditorCanvas({ onSelect, initialData }, ref) {

  const isMobile =
  typeof window !== "undefined" && window.innerWidth <= 768;


  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const objects = useEditorStore((s) => s.objects as EditorObject[]);
  const selectedId = useEditorStore((s) => s.selectedId);

  const setSelected = useEditorStore((s) => s.setSelected);
  const updateObject = useEditorStore((s) => s.updateObject);
  const removeObject = useEditorStore((s) => s.removeObject);
  const setObjects = useEditorStore((s) => s.setObjects);

  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputRect, setTextInputRect] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);


  const [mobileDeletePos, setMobileDeletePos] = useState<{
  x: number;
  y: number;
} | null>(null);



  /* ============================================================
     AUTO SCALE
  ============================================================ */
  useEffect(() => {
  if (!containerRef.current) return;

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;

    const factor = Math.min(
      width / CANVAS_WIDTH,
      height / CANVAS_HEIGHT,
      1
    );

    setScale(factor);
  });

  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, [setScale]);

  
  /* ============================================================
     LOAD EXISTING CANVAS
  ============================================================ */
  useEffect(() => {
    if (initialData?.objects) {
      setObjects(initialData.objects);
    }
  }, [initialData, setObjects]);

  /* ============================================================
     LOAD IMAGES
  ============================================================ */
  useEffect(() => {
    objects.forEach((obj) => {
      if (obj.type !== "image" || !obj.url || obj.image) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (obj.removeBackground) {
          const cleared = removeWhiteBackground(img);
          const newImg = new Image();
          newImg.src = cleared;
          newImg.onload = () => updateObject(obj.id, { image: newImg });
        } else updateObject(obj.id, { image: img });
      };
      img.src = obj.url;
    });
  }, [objects, updateObject]);

  /* ============================================================
   🔁 FORCE REDRAW WHEN OBJECTS CHANGE (FIX MOBILE ISSUE)
============================================================ */
useEffect(() => {
  if (!mainLayerRef.current) return;
  console.log("🖼️ Redrawing canvas after objects change");

  requestAnimationFrame(() => {
    mainLayerRef.current?.batchDraw();
  });
}, [objects]);

  /* ============================================================
     UPLOAD CUSTOM INVITATION AS BACKGROUND (תוספת בלבד)
  ============================================================ */
  const handleUploadBackground = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const dims = getCoverDims(img, CANVAS_WIDTH, CANVAS_HEIGHT);

        const withoutOldBg = useEditorStore
          .getState()
          .objects.filter((o: any) => !isBackgroundImage(o));

        setObjects([
          {
            id: `bg-${Date.now()}`,
            type: "image",
            x: dims.x,
            y: dims.y,
            width: dims.width,
            height: dims.height,
            image: img,
            url: reader.result as string,
            isBackground: true,
          },
          ...withoutOldBg,
        ]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* ============================================================
     SELECTION HANDLING
  ============================================================ */
  const handleSelect = (id: string | null) => {
  setSelected(id);

  const obj = objects.find((o) => o.id === id) || null;
  onSelect(obj);

  const node = id ? stageRef.current?.findOne(`.${id}`) : null;

  if (transformerRef.current) {
    transformerRef.current.nodes(node ? [node] : []);
  }

  // 📱 מובייל – מיקום כפתור מחיקה
  if (isMobile && node && stageRef.current) {
    const stageBox =
      stageRef.current.container().getBoundingClientRect();
    const r = node.getClientRect();

    setMobileDeletePos({
      x: stageBox.left + (r.x + r.width) * scale + 6,
      y: stageBox.top + r.y * scale - 6,
    });
  } else {
    setMobileDeletePos(null);
  }
};

const startEditText = (obj: TextObject) => {
  const node = stageRef.current?.findOne(`.${obj.id}`);
  if (!node) return;

  const stageBox = stageRef.current.container().getBoundingClientRect();
  const r = node.getClientRect({ skipShadow: true, skipStroke: true });

  setTextInputRect({
    x: stageBox.left + r.x * scale,
    y: stageBox.top + r.y * scale,
    width: r.width * scale,
    height: r.height * scale,
  });

  setSelected(obj.id);
  onSelect(obj);
  setEditingTextId(obj.id);
};

  /* ============================================================
     DOUBLE CLICK → TEXT EDIT
  ============================================================ */
  const handleDblClick = (obj: EditorObject) => {
  if (obj.type !== "text") return;

  // שימוש בלוגיקה האחידה
  startEditText(obj as TextObject);
};

  /* ============================================================
     DELETE / BACKSPACE
  ============================================================ */
  useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    // ❌ אם עורכים טקסט – לא למחוק אובייקט
    if (editingTextId) return;

    if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
  removeObject(selectedId);

  // 🧹 ניקוי Transformer
  transformerRef.current?.nodes([]);

  setSelected(null);
  setMobileDeletePos(null);

  lastTapRef.current = null;

}

  };

  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [selectedId, editingTextId, removeObject, setSelected]);

  /* ============================================================
     EXPORT
  ============================================================ */
  useImperativeHandle(ref, () => ({
  /* =========================================================
     🆕 הוספת טקסט חדש + פתיחת עריכה
  ========================================================= */
  addText: () => {
    const newId = `text-${Date.now()}`;
    const BOX_WIDTH = 240;

    const newText: TextObject = {
      id: newId,
      type: "text",
      text: "הקלד טקסט כאן",
      x: (CANVAS_WIDTH - BOX_WIDTH) / 2,
      y: 200,
      width: BOX_WIDTH,
      height: 40 * 1.3,
      fontFamily: "Heebo",
      fontSize: 40,
      fill: "#000000",
      align: "center",
      lineHeight: 1.2,
    };

    useEditorStore.setState((state: any) => ({
      objects: [...state.objects, newText],
      selectedId: newId,
    }));

    setTimeout(() => {
      const node = stageRef.current?.findOne(`.${newId}`);
      if (!node) return;

      const stageBox = stageRef.current.container().getBoundingClientRect();
      const r = node.getClientRect({ skipShadow: true, skipStroke: true });

      setTextInputRect({
        x: stageBox.left + r.x * scale,
        y: stageBox.top + r.y * scale,
        width: r.width * scale,
        height: r.height * scale,
      });

      setEditingTextId(newId);
    }, 50);
  },

  /* =========================================================
     🔥 עדכון אובייקט נבחר
  ========================================================= */
  updateSelected: (patch: Record<string, any>) => {
    const id = useEditorStore.getState().selectedId;
    if (!id) return;
    updateObject(id, patch);
  },

  /* =========================================================
     מחיקה
  ========================================================= */
  deleteSelected: () => {
    const id = useEditorStore.getState().selectedId;
    if (!id) return;
    removeObject(id);
    setSelected(null);
    onSelect(null);
  },

  /* =========================================================
     רקע
  ========================================================= */
  uploadBackground: handleUploadBackground,

  /* =========================================================
     JSON של הקנבס
  ========================================================= */
  getCanvasData: () => ({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    objects: useEditorStore.getState().objects.map((o) => ({
      ...o,
      image: undefined,
    })),
  }),

  /* =========================================================
     ⭐️⭐️ PREVIEW IMAGE – זה הקריטי ⭐️⭐️
  ========================================================= */
  getPreviewImage: () => {
    const stage = stageRef.current;
    if (!stage) return "";

    return stage.toDataURL({
      pixelRatio: 2,
      mimeType: "image/png",
    });
  },

  /* =========================================================
     ZOOM
  ========================================================= */
  zoomIn: () => setScale(Math.min(scale + 0.1, 3)),
  zoomOut: () => setScale(Math.max(scale - 0.1, 0.3)),
  resetZoom: () => setScale(1),
}));




  /* ============================================================
     SORT — BACKGROUND FIRST
  ============================================================ */
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => (isBackgroundImage(a) ? -1 : 1));
  }, [objects]);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
  <div
    ref={containerRef}
    className="w-full h-full flex items-center justify-center bg-gray-100 overflow-auto relative"
  >
    <div
      className="shadow-2xl rounded-3xl bg-white overflow-hidden relative"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top center",
        width: `${CANVAS_WIDTH}px`,
        height: `${CANVAS_HEIGHT}px`,
        border: "10px solid #f8f8f8",
      }}
    >
      <Stage
  width={CANVAS_WIDTH}
  height={CANVAS_HEIGHT}
  ref={stageRef}

  onMouseDown={(e) => {
  if (e.target === e.target.getStage()) {

  lastTapRef.current = null;
  

    // ✍️ אם היינו בעריכת טקסט – רק לסיים עריכה
    if (editingTextId) {
  setEditingTextId(null);
  setTextInputRect(null);

  lastTapRef.current = null;


  // 🧹 קריטי: לנקות Transformer של הטקסט הערוך
  transformerRef.current?.nodes([]);

  return; // ⛔ לא לבטל בחירה!
}

// 🧹 רק אם לא בעריכה – לבטל בחירה
handleSelect(null);

if (isMobile) {
  setMobileDeletePos(null);
}


  }
}}
>

          <Layer ref={mainLayerRef}>
            {sortedObjects.map((obj) => {
              const isEditingThis = editingTextId === obj.id;

              if (obj.type === "text") {
                loadFont(obj.fontFamily);
              


              return (
  <Text
  key={obj.id}
  name={obj.id}
  className={obj.id}

  x={obj.x ?? 0}
  y={obj.y ?? 0}

  rotation={obj.rotation || 0}
  text={obj.text ?? ""}

  fontFamily={obj.fontFamily ?? "Heebo"}
  fontSize={obj.fontSize ?? 40}
  fill={obj.fill ?? "#000000"}
  align={obj.align ?? "center"}

  wrap="word"
  lineHeight={obj.lineHeight ?? 1.2}
  verticalAlign="top"

  width={obj.width}
  height={obj.height}


  fontStyle={[
    obj.fontWeight === "bold" ? "bold" : null,
    obj.italic ? "italic" : null,
  ].filter(Boolean).join(" ")}

  textDecoration={obj.underline ? "underline" : undefined}

  /* 🔥🔥 זה מה שחסר לך 🔥🔥 */
  opacity={isEditingThis ? 0 : 1}
  listening={!isEditingThis}
  draggable={!isEditingThis}

  onClick={() => {
    if (!isMobile) handleSelect(obj.id);
  }}
  onDblClick={() => {
    if (!isMobile) handleDblClick(obj);
  }}

  onTap={(e) => {
  e.cancelBubble = true;

  const now = Date.now();
  const DOUBLE_TAP_DELAY = 300;

  // אם זה Tap שני מהיר על אותו אלמנט → עריכה
  if (
    lastTapRef.current &&
    lastTapRef.current.id === obj.id &&
    now - lastTapRef.current.time < DOUBLE_TAP_DELAY
  ) {
    startEditText(obj as TextObject);
    lastTapRef.current = null;
    return;
  }

  // אחרת → Tap ראשון (בחירה בלבד)
  handleSelect(obj.id);

  lastTapRef.current = {
    id: obj.id,
    time: now,
  };
}}

  onDragEnd={(e) =>
    updateObject(obj.id, {
      x: e.target.x(),
      y: e.target.y(),
    })
  }

  onTransformEnd={(e) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const baseWidth =
      typeof obj.width === "number" ? obj.width : node.width();

    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(20, baseWidth * scaleX),
      fontSize: Math.max(5, (obj.fontSize ?? 40) * scaleY),

      height: obj.height
  ? Math.max(10, obj.height * scaleY)
  : Math.max(
      10,
      (obj.fontSize ?? 40) *
        scaleY *
        (obj.lineHeight ?? 1.2)
    ),

    });

    node.scaleX(1);
    node.scaleY(1);
  }}

/>





                );
              }

              if (obj.type === "rect") {
                return (
                  <Rect
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    rotation={obj.rotation || 0}
                    draggable
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      updateObject(obj.id, {
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, obj.width * scaleX),
                        height: Math.max(5, obj.height * scaleY),
                        rotation: node.rotation(),
                      });
                      node.scaleX(1);
                      node.scaleY(1);
                    }}
                  />
                );
              }

              if (obj.type === "circle") {
                return (
                  <Circle
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    x={obj.x}
                    y={obj.y}
                    radius={obj.radius}
                    fill={obj.fill}
                    draggable
                    rotation={obj.rotation || 0}
                    onClick={() => handleSelect(obj.id)}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scale = node.scaleX();
                      updateObject(obj.id, {
                        x: node.x(),
                        y: node.y(),
                        radius: obj.radius * scale,
                        rotation: node.rotation(),
                      });
                      node.scaleX(1);
                      node.scaleY(1);
                    }}
                  />
                );
              }

              if (obj.type === "image") {
                const bg = isBackgroundImage(obj);

                if (bg) {
                  return (
                    <KonvaImage
                      key={obj.id}
                      name={obj.id}
                      className={obj.id}
                      x={0}
                      y={0}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      image={obj.image || undefined}
                      draggable={false}
                      onClick={() => handleSelect(obj.id)}
                    />
                  );
                }

                return (
                  <KonvaImage
  key={obj.id}
  name={obj.id}
  className={obj.id}
  x={obj.x}
  y={obj.y}
  width={obj.width}
  height={obj.height}
  image={obj.image || undefined}
  rotation={obj.rotation || 0}
  draggable
  onClick={() => handleSelect(obj.id)}      // דסקטופ
  onTap={(e) => {                            // 📱 מובייל ← זה החסר
    e.cancelBubble = true;
    handleSelect(obj.id);
  }}
  onTransformEnd={(e) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      width: obj.width * scaleX,
      height: obj.height * scaleY,
      rotation: node.rotation(),
    });
    node.scaleX(1);
    node.scaleY(1);
                    }}
                  />
                );
              }

              return null;
            })}

            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              enabledAnchors={[
                "top-left",
                "top-center",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-center",
                "bottom-right",
              ]}
              anchorSize={8}
              borderStroke="#7c3aed"
              anchorFill="#7c3aed"
            />
          </Layer>
        </Stage>
      </div>

      {isMobile && mobileDeletePos && selectedId && !editingTextId && (
  <button

    onClick={() => {
  removeObject(selectedId);

  // 🧹 ניקוי Transformer (זה הפתרון!)
  transformerRef.current?.nodes([]);

  setSelected(null);
  onSelect(null);
  setMobileDeletePos(null);

  lastTapRef.current = null;

}}

    style={{
      position: "fixed",
      left: mobileDeletePos.x,
      top: mobileDeletePos.y,
      zIndex: 9999,
    }}
    className="
      w-9 h-9
      rounded-full
      bg-red-600
      text-white
      flex items-center justify-center
      shadow-lg
      active:scale-95
    "
  >
    ✕
  </button>
)}

{editingTextId && (
  <EditableTextOverlay
    key={editingTextId}
    obj={
      (objects.find(
        (o): o is TextObject =>
          o.id === editingTextId && o.type === "text"
      ) as TextObject | null) || null
    }
    rect={textInputRect}

    /* =========================
       ✍️ בזמן הקלדה – resize כמו Canva
    ========================= */
    onLiveChange={({ text, height }) => {
      if (!editingTextId || height == null) return;

      // 1️⃣ עדכון טקסט + גובה בזמן אמת (מה-textarea)
      updateObject(editingTextId, {
        text,
        height,
      });

      // 2️⃣ עדכון overlay לפי הגובה החדש
      setTextInputRect((prev: any) =>
        prev
          ? {
              ...prev,
              height: height * scale,
            }
          : prev
      );
    }}

    /* =========================
       ✅ סיום עריכה
    ========================= */
    onFinish={({ text }) => {
  if (!editingTextId) return;

  // 1️⃣ טקסט סופי
  updateObject(editingTextId, { text });

  // 2️⃣ sync סופי מול Konva
  requestAnimationFrame(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const node = stage.findOne(
      `.${editingTextId}`
    ) as Konva.Text | null;

    if (node) {
      updateObject(editingTextId, {
        height: node.height(),
      });
    }

    // 3️⃣ יציאה ממצב עריכה
    setEditingTextId(null);
    setTextInputRect(null);

    // 4️⃣ ריענון בחירה → מחזיר כפתור מחיקה
    transformerRef.current?.nodes([]);


  });
}}


  />
)}


    </div>
  );
});

export default EditorCanvas;
