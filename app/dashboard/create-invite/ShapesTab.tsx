"use client";

import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface ShapeItem {
  _id: string;
  shapeData: {
    width?: number;
    height?: number;
    radius?: number;
    cornerRadius?: number;
    fill?: string;
  };
}

export default function ShapesTab() {
  const { data = [] } = useInvityLibrary("shape");
  const addObject = useEditorStore((s: any) => s.addObject);

  return (
    <div className="grid grid-cols-3 gap-3 p-3">
      {data.map((item: ShapeItem) => {
        const shape = item.shapeData;

        const type: "circle" | "rect" =
          typeof shape.radius === "number" && shape.radius > 0
            ? "circle"
            : "rect";

        const newShape = {
          id: crypto.randomUUID(),
          type,
          x: 100,
          y: 100,
          width: shape.width ?? 120,
          height: shape.height ?? 120,
          radius: shape.radius,
          cornerRadius: shape.cornerRadius,
          fill: shape.fill || "#000",
        };

        return (
          <div
            key={item._id}
            className="cursor-pointer"
            onClick={() => addObject(newShape)}
          >
            <div
              style={{
                width: 70,
                height: 70,
                background: shape.fill || "#000",
                borderRadius: shape.cornerRadius || shape.radius || 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
