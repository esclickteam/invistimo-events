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
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";

import Lottie from "lottie-react";
import { useEditorStore } from "./editorStore";
import EditableTextOverlay from "../../components/editor/EditableTextOverlay";
import { loadFont } from "../../components/editor/loadFont";

/* ============================================================
   TYPE DEFINITIONS
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
      isAnimated?: boolean;
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

/* ============================================================
   CANVAS SIZE (טלפון)
============================================================ */
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 720;

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
     AUTO SCALE SCREEN
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
     LOAD IMAGE / VIDEO
  ============================================================ */
  useEffect(() => {
    objects.forEach((obj) => {
      if (obj.type !== "image" || !obj.url || obj.image) return;
      const cleanUrl = obj.url.split("?")[0];
      const format = cleanUrl.split(".").pop()?.toLowerCase();

      if (format === "mp4" || format === "webm") {
        const video = document.createElement("video");
        video.src = obj.url;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        const onLoaded = () => {
          video.removeEventListener("loadeddata", onLoaded);
          video.play().catch(() => {});
          updateObject(obj.id, { image: video, isAnimated: true });
        };
        video.addEventListener("loadeddata", onLoaded);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const isLikelyAnimated =
          obj.isAnimated || format === "gif" || format === "webp";
        if (obj.removeBackground && !isLikelyAnimated) {
          const cleared = removeWhiteBackground(img);
          const newImg = new Image();
          newImg.src = cleared;
          newImg.onload = () => {
            updateObject(obj.id, { image: newImg });
          };
        } else {
          updateObject(obj.id, { image: img });
        }
      };
      img.src = obj.url;
    });
  }, [objects, updateObject]);

  /* ============================================================
     FORCE REDRAW WHEN VIDEO EXISTS
  ============================================================ */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const stage = stageRef.current;
      if (stage) {
        const hasVideo = objects.some(
          (o) => o.type === "image" && o.image instanceof HTMLVideoElement
        );
        if (hasVideo) stage.batchDraw();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [objects]);

  /* ============================================================
     SELECTION LOGIC
  ============================================================ */
  const handleSelect = (id: string | null) => {
    setSelected(id);
    const obj = objects.find((o) => o.id === id) || null;
    onSelect(obj);
    if (transformerRef.current) {
      if (id) {
        const node = stageRef.current?.findOne(`.${id}`);
        transformerRef.current.nodes(node ? [node] : []);
      } else {
        transformerRef.current.nodes([]);
      }
    }
  };

  /* ============================================================
     DOUBLE CLICK EDIT TEXT
  ============================================================ */
  const handleDblClick = (obj: EditorObject) => {
    if (obj.type !== "text") return;
    const node = stageRef.current?.findOne(`.${obj.id}`);
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
     DELETE WITH KEYBOARD
  ============================================================ */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const obj = objects.find((o) => o.id === selectedId);
      if (!obj) return;
      if (e.key === "Delete") removeObject(obj.id);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [objects, selectedId, removeObject]);

  /* ============================================================
     EXPORT ACTIONS TO SIDEBAR
  ============================================================ */
  useImperativeHandle(ref, () => ({
    addText: useEditorStore.getState().addText,
    addRect: useEditorStore.getState().addRect,
    addCircle: useEditorStore.getState().addCircle,
    addImage: useEditorStore.getState().addImage,
    addLottie: useEditorStore.getState().addLottie,
  }));

  /* ============================================================
     RENDER CANVAS (טלפון)
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
            {objects.map((obj) => {
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
                    fontStyle={`${obj.fontWeight === "bold" ? "bold" : "normal"} ${
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
                      updateObject(obj.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
                  />
                );
              }

              if (obj.type === "circle") {
                return (
                  <Rect
                    key={obj.id}
                    name={obj.id}
                    draggable
                    x={obj.x}
                    y={obj.y}
                    width={obj.radius * 2}
                    height={obj.radius * 2}
                    cornerRadius={obj.radius}
                    fill={obj.fill}
                    onClick={() => handleSelect(obj.id)}
                  />
                );
              }

              if (obj.type === "image") {
                if (!obj.image) return null;
                return (
                  <KonvaImage
                    key={obj.id}
                    name={obj.id}
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
                  />
                );
              }

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
                      pointerEvents: "none",
                    }}
                  />
                );
              }

              return null;
            })}
            <Transformer ref={transformerRef} />
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
