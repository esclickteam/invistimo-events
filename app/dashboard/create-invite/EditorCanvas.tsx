"use client";

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";

import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";

import Lottie from "lottie-react";
import { useEditorStore } from "./editorStore";
import EditableTextOverlay from "../../components/editor/EditableTextOverlay";
import { loadFont } from "../../components/editor/loadFont";

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
      image?: HTMLImageElement | null;
      removeBackground?: boolean;
    }
  | {
      id: string;
      type: "lottie";
      x: number;
      y: number;
      width: number;
      height: number;
      lottieData: any;
    };

interface EditorCanvasProps {
  onSelect: (obj: EditorObject | null) => void;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1600;

/* ============================================================
   REMOVE BACKGROUND (WHITE TO TRANSPARENT)
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
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r > 240 && g > 240 && b > 240) data[i + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
const EditorCanvas = forwardRef(function EditorCanvas(
  { onSelect }: EditorCanvasProps,
  ref
) {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const objects = useEditorStore((s) => s.objects as EditorObject[]);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setSelected = useEditorStore((s) => s.setSelected);
  const updateObject = useEditorStore((s) => s.updateObject);
  const removeObject = useEditorStore((s) => s.removeObject);

  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputRect, setTextInputRect] = useState<any>(null);

  /* ============================================================
      AUTO SCALE TO SCREEN
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
      LOAD IMAGE OBJECTS
============================================================ */
  useEffect(() => {
    objects.forEach((obj) => {
      if (obj.type === "image" && obj.url && !obj.image) {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          if (obj.removeBackground) {
            const cleared = removeWhiteBackground(img);
            const newImg = new Image();
            newImg.src = cleared;
            updateObject(obj.id, { image: newImg });
          } else {
            updateObject(obj.id, { image: img });
          }
        };

        img.src = obj.url;
      }
    });
  }, [objects, updateObject]);

  /* ============================================================
      SELECTION
============================================================ */
  const handleSelect = (id: string | null) => {
    setSelected(id);
    const obj = objects.find((o) => o.id === id) || null;

    onSelect(obj);

    if (transformerRef.current) {
      if (id) {
        const node = stageRef.current.findOne(`.${id}`);
        transformerRef.current.nodes(node ? [node] : []);
      } else {
        transformerRef.current.nodes([]);
      }
    }
  };

  /* ============================================================
      DOUBLE CLICK = TEXT EDIT
============================================================ */
  const handleDblClick = (obj: EditorObject) => {
    if (obj.type !== "text") return;

    const node = stageRef.current.findOne(`.${obj.id}`);
    if (!node) return;

    const abs = node.getAbsolutePosition();

    setTextInputRect({
      x: abs.x * scale,
      y: abs.y * scale,
      width: (obj.width || 200) * scale,
      height: obj.fontSize * 1.4 * scale,
    });

    setEditingTextId(obj.id);
  };

  /* ============================================================
      DELETE OBJECT (Keyboard)
============================================================ */
  const handleKeyDown = (e: KeyboardEvent) => {
    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      removeObject(obj.id);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  /* ============================================================
      SIDEBAR EXPORTED ACTIONS
============================================================ */
  useImperativeHandle(ref, () => ({
    addText: useEditorStore.getState().addText,
    addRect: useEditorStore.getState().addRect,
    addCircle: useEditorStore.getState().addCircle,
    addImage: useEditorStore.getState().addImage,
    addLottie: useEditorStore.getState().addLottie,
  }));

  /* ============================================================
      RENDER CANVAS
============================================================ */
  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto bg-gray-100 relative">
      <div
        className="shadow-2xl rounded-xl bg-white"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          ref={stageRef}
          className="bg-white rounded-xl border"
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) handleSelect(null);
          }}
        >
          <Layer>
            {objects.map((obj) => {
              /* -------------------- TEXT -------------------- */
              if (obj.type === "text") {
                loadFont(obj.fontFamily);

                return (
                  <Text
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    draggable
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
                  />
                );
              }

              /* -------------------- RECT -------------------- */
              if (obj.type === "rect") {
                return (
                  <Rect
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    draggable
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
                  />
                );
              }

              /* -------------------- CIRCLE -------------------- */
              if (obj.type === "circle") {
                return (
                  <Circle
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    draggable
                    x={obj.x}
                    y={obj.y}
                    radius={obj.radius}
                    fill={obj.fill}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
                  />
                );
              }

              /* -------------------- IMAGE -------------------- */
              if (obj.type === "image") {
                if (!obj.image) return null;

                return (
                  <KonvaImage
                    key={obj.id}
                    name={obj.id}
                    className={obj.id}
                    draggable
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    image={obj.image}
                    onClick={() => handleSelect(obj.id)}
                    onDragEnd={(e) =>
                      updateObject(obj.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const newWidth = node.width() * node.scaleX();
                      const newHeight = node.height() * node.scaleY();

                      updateObject(obj.id, {
                        width: newWidth,
                        height: newHeight,
                      });

                      node.scaleX(1);
                      node.scaleY(1);
                    }}
                  />
                );
              }

              /* -------------------- LOTTIE -------------------- */
              if (obj.type === "lottie") {
                return (
                  <Lottie
                    key={obj.id}
                    animationData={obj.lottieData}
                    style={{
                      position: "absolute",
                      top: obj.y,
                      left: obj.x,
                      width: obj.width,
                      height: obj.height,
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
                "top-right",
                "bottom-left",
                "bottom-right",
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) {
                  return oldBox;
                }
                return newBox;
              }}
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
