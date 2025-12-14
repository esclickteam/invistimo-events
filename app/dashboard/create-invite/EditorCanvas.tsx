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
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      radius: number;
      fill?: string;
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
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

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

  /* ============================================================
     AUTO SCALE
  ============================================================ */
  useEffect(() => {
    const handleResize = () => {
      const maxHeight = window.innerHeight - 100;
      const maxWidth = window.innerWidth - 450;

      const factor = Math.min(
        maxWidth / CANVAS_WIDTH,
        maxHeight / CANVAS_HEIGHT
      );

      setScale(factor);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
     LOAD IMAGES (RSVP NEEDS THIS!)
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
        } else {
          updateObject(obj.id, { image: img });
        }
      };

      img.src = obj.url;
    });
  }, [objects, updateObject]);

  /* ============================================================
     SELECTION HANDLING
  ============================================================ */
  const handleSelect = (id: string | null) => {
    setSelected(id);
    const obj = objects.find((o) => o.id === id) || null;
    onSelect(obj);

    if (transformerRef.current) {
      const node = id ? stageRef.current?.findOne(`.${id}`) : null;
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

  const abs = node.getAbsolutePosition();
  const stageBox = stageRef.current.container().getBoundingClientRect();

  // ✅ חישוב גובה הפונט ויישור לפי baseline כדי שהמיקום לא יזוז בכלל
  const fontHeight = obj.fontSize * (obj.lineHeight || 1.1);
  const baselineFix = obj.fontSize * 0.25; // תיקון גובה קטן שמתאים ל-Konva

  setTextInputRect({
    x: stageBox.left + abs.x * scale,
    y: stageBox.top + abs.y * scale - baselineFix, // ← כאן התיקון!
    width: (obj.width || node.width() || 200) * scale,
    height: fontHeight * scale,
  });

  setEditingTextId(obj.id);
};

  /* ============================================================
     DELETE WITH KEYBOARD
  ============================================================ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedId) {
        removeObject(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeObject]);

  /* ============================================================
     EXPORT
  ============================================================ */
  useImperativeHandle(ref, () => ({
    addText: useEditorStore.getState().addText,
    addRect: useEditorStore.getState().addRect,
    addCircle: useEditorStore.getState().addCircle,
    addImage: useEditorStore.getState().addImage,

    getCanvasData: () => ({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      objects: useEditorStore.getState().objects.map((o: any) => ({
        ...o,
        image: undefined, // ❗ חשוב ל-RSVP
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
     RENDER CANVAS
  ============================================================ */
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100 overflow-auto relative">
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
          className="bg-white"
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) handleSelect(null);
          }}
        >
          <Layer>
            {sortedObjects.map((obj) => {
              if (obj.type === "text") {
                loadFont(obj.fontFamily);
                const isEditingThis = editingTextId === obj.id;

                return (
                  <Text
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    draggable={!isEditingThis}
                    x={obj.x}
                    y={obj.y}
                    text={obj.text}
                    fontFamily={obj.fontFamily}
                    fontSize={obj.fontSize}
                    width={obj.width}
                    fill={obj.fill}
                    align={obj.align}
                    fontStyle={`${obj.fontWeight === "bold" ? "bold" : ""} ${
                      obj.italic ? "italic" : ""
                    }`}
                    textDecoration={obj.underline ? "underline" : ""}
                    onDblClick={() => handleDblClick(obj)}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
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
                    draggable
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, { x: e.target.x(), y: e.target.y() })
                    }
                  />
                );
              }

              if (obj.type === "circle") {
                return (
                  <Circle
                    key={obj.id}
                    name={obj.id}
                    draggable
                    x={obj.x}
                    y={obj.y}
                    radius={obj.radius}
                    fill={obj.fill}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, { x: e.target.x(), y: e.target.y() })
                    }
                  />
                );
              }

              if (obj.type === "image") {
                const bg = isBackgroundImage(obj);
                if (bg && obj.image) {
                  const { x, y, width, height } = getCoverDims(
                    obj.image,
                    CANVAS_WIDTH,
                    CANVAS_HEIGHT
                  );

                  return (
                    <KonvaImage
                      key={obj.id}
                      name={obj.id}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      image={obj.image}
                      listening={true}
                      onClick={() => handleSelect(obj.id)}
                    />
                  );
                }

                return (
                  <KonvaImage
                    key={obj.id}
                    name={obj.id}
                    draggable={!bg}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    image={obj.image || undefined}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, { x: e.target.x(), y: e.target.y() })
                    }
                  />
                );
              }

              return null;
            })}

            <Transformer
              ref={transformerRef}
              anchorSize={0}
              borderStroke="transparent"
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
