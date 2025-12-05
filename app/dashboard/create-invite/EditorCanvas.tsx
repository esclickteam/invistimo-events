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
  const updateObject = useEditorStore((s: any) => s.updateObject);
  const removeObject = useEditorStore((s: any) => s.removeObject);
  const scale = useEditorStore((s: any) => s.scale);
  const setScale = useEditorStore((s: any) => s.setScale);

  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 1600;

  /* שינוי scale לפי חלון */
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

  /* העתק/הדבק */
  const handleKeyDown = (e: KeyboardEvent) => {
    const selectedObj = objects.find((o: any) => o.id === stageRef.current?.selectedId);
    if (!selectedObj) return;

    if (e.ctrlKey && e.key === "c") {
      // copy
      window.localStorage.setItem("copiedObject", JSON.stringify(selectedObj));
    }

    if (e.ctrlKey && e.key === "v") {
      // paste
      const copied = JSON.parse(window.localStorage.getItem("copiedObject") || "{}");
      if (copied.id) {
        const newObj = { ...copied, id: `obj-${Date.now()}`, x: copied.x + 20, y: copied.y + 20 };
        useEditorStore.getState().objects.push(newObj);
      }
    }

    if (e.key === "Delete") {
      removeObject(selectedObj.id);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [objects]);

  /* פונקציות ל-Sidebar */
  useImperativeHandle(ref, () => ({
    addText: useEditorStore.getState().addText,
    addRect: useEditorStore.getState().addRect,
    addCircle: useEditorStore.getState().addCircle,
    addImage: useEditorStore.getState().addImage,
    addLottie: useEditorStore.getState().addLottie,
    setBackground: useEditorStore.getState().setBackground,
    duplicateObject: (id: string) => {
      const obj = objects.find((o: any) => o.id === id);
      if (!obj) return;
      const newObj = { ...obj, id: `obj-${Date.now()}`, x: obj.x + 20, y: obj.y + 20 };
      useEditorStore.getState().objects.push(newObj);
    },
  }));

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-auto relative">
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
                fontStyle: obj.fontWeight === "bold" ? "bold" : "normal",
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
                  return <Text key={obj.id} {...baseProps} />;
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

            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>
    </div>
  );
});

export default EditorCanvas;
