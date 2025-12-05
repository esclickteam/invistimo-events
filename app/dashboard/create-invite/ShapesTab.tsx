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
  url?: string; // אם רוצים לשמור URL של תמונה במאגר
}

export default function ShapesTab() {
  const { data = [], addToLibrary } = useInvityLibrary("shape"); // שימוש ב-hook שלך
  const addObject = useEditorStore((s: any) => s.addObject);

  // דיפולטיבי למקרה שהמאגר ריק
  const shapesData = data.length > 0 ? data : [
    {
      _id: "dummy-shape-1",
      shapeData: { width: 120, height: 120, fill: "#000" },
      url: "https://res.cloudinary.com/dnbewcz79/image/upload/v1764969094/1_wafk5l.png"
    }
  ];

  const handleAddToLibrary = async () => {
    // כאן תוכלי לפתוח UI להוספת תמונה חדשה או פריט חדש
    const newItem = {
      _id: crypto.randomUUID(),
      shapeData: { width: 120, height: 120, fill: "#888" },
      url: "https://res.cloudinary.com/dnbewcz79/image/upload/v1764969094/1_wafk5l.png"
    };
    await addToLibrary(newItem); // פונקציה ב-hook ששומרת את הפריט במאגר
  };

  return (
    <div className="p-3">
      <button
        onClick={handleAddToLibrary}
        className="w-full mb-3 bg-purple-600 text-white py-2 rounded"
      >
        הוסף למאגר
      </button>

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
