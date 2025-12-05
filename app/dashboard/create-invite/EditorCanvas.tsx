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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const objects = useEditorStore((s: any) => s.objects);
  const setSelected = useEditorStore((s: any) => s.setSelected);
  const updateObject = useEditorStore((s: any) => s.updateObject);
  const removeObject = useEditorStore((s: any) => s.removeObject);
  const addText = useEditorStore((s: any) => s.addText);
  const addRect = useEditorStore((s: any) => s.addRect);
  const addCircle = useEditorStore((s: any) => s.addCircle);
  const addImage = useEditorStore((s: any) => s.addImage);
  const addLottie = useEditorStore((s: any) => s.addLottie);
  const bringToFront = useEditorStore((s: any) => s.bringToFront);
  const sendToBack = useEditorStore((s: any) => s.sendToBack);
  const background = useEditorStore((s: any) => s.background);
  const scale = useEditorStore((s: any) => s.scale);
  const setScale = useEditorStore((s: any) => s.setScale);

  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 1600;

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [copiedObject, setCopiedObject] = useState<any | null>(null);

  /* שינוי scale */
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

  /* בחירת אובייקט */
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

  /* התחלת עריכת טקסט */
  const startEditingText = (obj: any) => {
    setEditingTextId(obj.id);

    setTimeout(() => {
      if (!inputRef.current) return;

      inputRef.current.value = obj.text || "";

      const stageBox = stageRef.current.container().getBoundingClientRect();
      const x = stageBox.left + obj.x * scale;
      const y = stageBox.top + obj.y * scale;

      inputRef.current.style.position = "absolute";
      inputRef.current.style.top = y + "px";
      inputRef.current.style.left = x + "px";
      inputRef.current.style.fontSize = obj.fontSize * scale + "px";
      inputRef.current.style.color = obj.fill;
      inputRef.current.style.fontFamily = obj.fontFamily || "Arial";
      inputRef.current.style.fontWeight = obj.fontWeight || "normal";
      inputRef.current.style.border = "1px solid #999";
      inputRef.current.style.background = "white";
      inputRef.current.style.padding = "2px 4px";
      inputRef.current.style.zIndex = "9999";
      inputRef.current.style.display = "block";

      inputRef.current.focus();
    }, 10);
  };

  /* סיום עריכה */
  const finishEditing = () => {
    if (!editingTextId || !inputRef.current) return;
    updateObject(editingTextId, { text: inputRef.current.value });
    inputRef.current.style.display = "none";
    setEditingTextId(null);
  };

  /* -----------------------------
      Keyboard Events
  ----------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedObj = objects.find((o: any) => o.id === stageRef.current?.selectedId);
      if (!selectedObj) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        removeObject(selectedObj.id);
      }

      if (e.ctrlKey && e.key === "c") {
        setCopiedObject({ ...selectedObj, id: `copy-${Date.now()}` });
      }

      if (e.ctrlKey && e.key === "v" && copiedObject) {
        if (copiedObject.type === "image") {
          addImage(copiedObject.image.src);
        } else if (copiedObject.type === "lottie") {
          addLottie(copiedObject.lottieData);
        } else {
          const newObj = { ...copiedObject, id: `copy-${Date.now()}`, x: copiedObject.x + 20, y: copiedObject.y + 20 };
          useEditorStore.getState().updateObject(newObj.id, newObj); // add new object
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [objects, copiedObject, addImage, addLottie, removeObject]);

  /* פונקציות ל-Sidebar */
  useImperativeHandle(ref, () => ({
    addText,
    addRect,
    addCircle,
    addImage,
    addLottie,
    setBackground: useEditorStore.getState().setBackground,
    duplicateObject: (id: string) => {
      const obj = objects.find((o: any) => o.id === id);
      if (!obj) return;
      const copy = { ...obj, id: `copy-${Date.now()}`, x: obj.x + 20, y: obj.y + 20 };
      useEditorStore.getState().updateObject(copy.id, copy); // add new object
    },
  }));

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-auto relative">
      {/* input לעריכת טקסט */}
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
        style={{
          display: "none",
          position: "absolute",
        }}
      />

      {/* Canvas */}
      <div
        className="shadow-2xl rounded-xl bg-white"
        style={{
          transform: `scale(${scale || 1})`,
          transformOrigin: "top left",
        }}
      >
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          ref={stageRef}
          className="bg-white rounded-xl border"
          onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
            if (e.target === e.target.getStage()) handleSelect(null);
          }}
        >
          <Layer>
            {/* רקע */}
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

            {/* אובייקטים */}
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
                text: obj.text,
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                fontWeight: obj.fontWeight,
                align: obj.align,
                onClick: () => handleSelect(obj.id),
                onTap: () => handleSelect(obj.id),
                onDragEnd: (e: KonvaEventObject<DragEvent>) =>
                  updateObject(obj.id, { x: e.target.x(), y: e.target.y() }),
              };

              switch (obj.type) {
                case "rect":
                  return <Rect key={obj.id} {...baseProps} />;
                case "text":
                  return (
                    <Text
                      key={obj.id}
                      {...baseProps}
                      onDblClick={() => startEditingText(obj)}
                    />
                  );
                case "image":
                  return <KonvaImage key={obj.id} {...baseProps} image={obj.image} />;
                case "lottie":
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
                      loop
                    />
                  );
                default:
                  return null;
              }
            })}

            {/* Transformer */}
            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>
    </div>
  );
});

export default EditorCanvas;
