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
import { useEditorStore } from "./editorStore";
import Lottie from "lottie-react";
import type { KonvaEventObject } from "konva/lib/Node";

interface EditorCanvasProps {
  onSelect: (obj: any | null) => void;
}

const EditorCanvas = forwardRef(function EditorCanvas(
  { onSelect }: EditorCanvasProps,
  ref: React.Ref<any>
) {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const objects = useEditorStore((s: any) => s.objects);
  const setSelected = useEditorStore((s: any) => s.setSelected);
  const background = useEditorStore((s: any) => s.background);
  const updateObject = useEditorStore((s: any) => s.updateObject);
  const scale = useEditorStore((s: any) => s.scale);
  const setScale = useEditorStore((s: any) => s.setScale);
  const addText = useEditorStore((s: any) => s.addText);
  const removeObject = useEditorStore((s: any) => s.removeObject);
  const duplicateObject = useEditorStore((s: any) => s.addText); // נשתמש ב־addText לשכפול לדוגמה

  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 1600;

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // שינוי scale אוטומטי
  useEffect(() => {
    const updateScale = () => {
      const maxHeight = window.innerHeight - 100;
      const maxWidth = window.innerWidth - 450;
      const scaleFactor = Math.min(
        maxWidth / CANVAS_WIDTH,
        maxHeight / CANVAS_HEIGHT
      );
      setScale(scaleFactor);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [setScale]);

  // בחירת אובייקט
  const handleSelect = (id: string | null) => {
    setSelected(id);
    const obj = objects.find((o: any) => o.id === id) || null;
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

  // עריכת טקסט inline
  const startEditingText = (obj: any) => {
    setEditingTextId(obj.id);

    setTimeout(() => {
      if (!inputRef.current) return;
      inputRef.current.value = obj.text || "";

      const stageBox = stageRef.current.container().getBoundingClientRect();
      const x = stageBox.left + obj.x * scale;
      const y = stageBox.top + obj.y * scale;

      Object.assign(inputRef.current.style, {
        display: "block",
        position: "absolute",
        top: y + "px",
        left: x + "px",
        fontSize: obj.fontSize * scale + "px",
        color: obj.fill,
        fontFamily: obj.fontFamily || "Arial",
        fontWeight: obj.fontWeight || "normal",
        border: "1px solid #999",
        background: "white",
        padding: "2px 4px",
        zIndex: "9999",
      });

      inputRef.current.focus();
    }, 10);
  };

  const finishEditing = () => {
    if (!editingTextId || !inputRef.current) return;
    updateObject(editingTextId, { text: inputRef.current.value });
    inputRef.current.style.display = "none";
    setEditingTextId(null);
  };

  // חיבור לפונקציות sidebar
  useImperativeHandle(ref, () => ({
    addText,
    addRect: useEditorStore.getState().addRect,
    addCircle: useEditorStore.getState().addCircle,
    removeObject,
    duplicateObject,
    setBackground: useEditorStore.getState().setBackground,
  }));

  // מחיקה/שכפול מהמקלדת
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!objects.length) return;
      const selected = objects.find((o: any) => o.id === useEditorStore.getState().selectedId);
      if (!selected) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        removeObject(selected.id);
      }
      if (e.ctrlKey && e.key === "c") {
        localStorage.setItem("clipboard", JSON.stringify(selected));
      }
      if (e.ctrlKey && e.key === "v") {
        const clip = JSON.parse(localStorage.getItem("clipboard") || "null");
        if (clip) {
          const newObj = { ...clip, id: `text-${Date.now()}`, x: clip.x + 20, y: clip.y + 20 };
          useEditorStore.getState().addText(); // אפשר להחליף לפי סוג
          updateObject(newObj.id, newObj);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [objects, removeObject, updateObject]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-auto relative">
      <input
        ref={inputRef}
        onBlur={finishEditing}
        onKeyDown={(e) => {
          if (e.key === "Enter") finishEditing();
          if (e.key === "Escape") {
            inputRef.current!.style.display = "none";
            setEditingTextId(null);
          }
        }}
        style={{ display: "none", position: "absolute" }}
      />

      <div style={{ transform: `scale(${scale || 1})`, transformOrigin: "top left" }}>
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          ref={stageRef}
          onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
            if (e.target === e.target.getStage()) handleSelect(null);
          }}
        >
          <Layer>
            {background && (
              <KonvaImage
                image={(() => {
                  const img = new window.Image();
                  img.src = background;
                  return img;
                })()}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
              />
            )}

            {objects.map((obj: any) => {
              const baseProps = {
                name: obj.id,
                className: obj.id,
                draggable: true,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                fill: obj.fill,
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                fontWeight: obj.fontWeight,
                align: obj.align,
                text: obj.text,
                onClick: () => handleSelect(obj.id),
                onTap: () => handleSelect(obj.id),
                onDragEnd: (e: KonvaEventObject<DragEvent>) =>
                  updateObject(obj.id, { x: e.target.x(), y: e.target.y() }),
                onDblClick: () => obj.type === "text" && startEditingText(obj),
              };

              switch (obj.type) {
                case "rect":
                  return <Rect key={obj.id} {...baseProps} />;
                case "text":
                  return <Text key={obj.id} {...baseProps} />;
                case "image":
                  return <KonvaImage key={obj.id} {...baseProps} image={obj.image} />;
                case "lottie":
                  return (
                    <Lottie
                      key={obj.id}
                      animationData={obj.lottieData}
                      style={{ position: "absolute", top: obj.y, left: obj.x, width: obj.width, height: obj.height }}
                      loop
                    />
                  );
                default:
                  return null;
              }
            })}

            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>
    </div>
  );
});

export default EditorCanvas;
