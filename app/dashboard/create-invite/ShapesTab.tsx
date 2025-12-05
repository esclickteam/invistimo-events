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
  url?: string; // אם רוצים תמונה מהמאגר
}

export default function ShapesTab() {
  const { data = [] } = useInvityLibrary("shape"); // שימוש רק ב-data
  const addObject = useEditorStore((s: any) => s.addObject);

  // גם אם אין נתונים במאגר, נציג טאב ריק
  const shapesData = data.length > 0 ? data : [];

  return (
    <div className="p-3">
      {/* רשימת הצורות מהמאגר */}
      <div className="grid grid-cols-3 gap-3">
        {shapesData.map((item: ShapeItem) => {
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
            url: item.url,
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
    </div>
  );
}
