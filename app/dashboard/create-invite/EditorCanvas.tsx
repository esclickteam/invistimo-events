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

/* ============================================================
   TYPES
============================================================ */
export interface TextObject {
  id: string;
  type: "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
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

const EditorCanvas = forwardRef(function EditorCanvas(
  { onSelect, initialData }: EditorCanvasProps,
  ref
) {

  const isMobile =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);


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
  };

  /* ============================================================
     DOUBLE CLICK → TEXT EDIT
  ============================================================ */
  const handleDblClick = (obj: EditorObject) => {
    if (obj.type !== "text") return;
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
    setEditingTextId(obj.id);
  };

  /* ============================================================
     DELETE / BACKSPACE
  ============================================================ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        removeObject(selectedId);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeObject, setSelected]);

  /* ============================================================
     EXPORT
  ============================================================ */
  useImperativeHandle(ref, () => ({
  // 🆕 הוספת טקסט חדש שנבחר אוטומטית ונפתח לעריכה
  addText: () => {
    const newId = `text-${Date.now()}`;
    const newText: TextObject = {
      id: newId,
      type: "text",
      text: "טקסט חדש",
      x: 100,
      y: 300,
      fontFamily: "Heebo",
      fontSize: 40,
      fill: "#000000",
      align: "center",
    };
    const current = useEditorStore.getState().objects;
    useEditorStore.getState().setObjects([...current, newText]);
    useEditorStore.getState().setSelected(newId);

    // 🔥 פותח ישר מצב עריכה (כמו בקאנבה)
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

  addRect: useEditorStore.getState().addRect,
  addCircle: useEditorStore.getState().addCircle,
  addImage: useEditorStore.getState().addImage,
  uploadBackground: handleUploadBackground,

  getCanvasData: () => ({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    objects: useEditorStore.getState().objects.map((o: any) => ({
      ...o,
      image: undefined,
    })),
  }),
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
          if (e.target === e.target.getStage()) handleSelect(null);
        }}
      >
          <Layer>
            {sortedObjects.map((obj) => {
              const isEditingThis = editingTextId === obj.id;

              if (obj.type === "text") {
                loadFont(obj.fontFamily);
                return (
                  <Text
  key={obj.id}
  name={obj.id}
  className={obj.id}
  x={obj.x}
  y={obj.y}
  rotation={obj.rotation || 0}
  text={obj.text}
  fontFamily={obj.fontFamily}
  fontSize={obj.fontSize}
  width={obj.width}
  fill={obj.fill}
  align={obj.align}
  wrap="none"
  fontStyle={`${obj.fontWeight === "bold" ? "bold" : ""} ${
    obj.italic ? "italic" : ""
  }`}
  textDecoration={obj.underline ? "underline" : ""}
  draggable={!isEditingThis}
  onClick={() => {
    handleSelect(obj.id);

    // 📱 מובייל – לחיצה אחת פותחת עריכה
     if (isMobile) {
    setTimeout(() => {
      handleDblClick(obj);
    }, 0);
  }
}}
  onDblClick={() => {
    // 🖥️ דסקטופ – דאבל קליק פותח עריכה
    if (!isMobile) {
      handleDblClick(obj);
    }
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
      fontSize: Math.max(5, obj.fontSize * scaleY),
    });
    node.scaleX(1);
    node.scaleY(1);
  }}
  opacity={isEditingThis ? 0 : 1}
  listening={!isEditingThis}
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
                    onClick={() => handleSelect(obj.id)}
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

      {editingTextId && (
        <EditableTextOverlay
          obj={
            (objects.find(
              (o) => o.id === editingTextId && o.type === "text"
            ) as TextObject | null) || null
          }
          rect={textInputRect}
          onFinish={(txt) => {
            updateObject(editingTextId, { text: txt });
            setEditingTextId(null);
          }}
        />
      )}
    </div>
  );
});

export default EditorCanvas;
