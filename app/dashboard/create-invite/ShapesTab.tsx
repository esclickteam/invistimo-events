"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "./editorStore";

interface CloudShape {
  name: string;
  url: string;
}

export default function ShapesTab() {
  const [shapes, setShapes] = useState<CloudShape[]>([]);
  const addObject = useEditorStore((s: any) => s.addObject);

  /* ===============================
     טוען צורות מהקלאודינרי
  =============================== */
  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const res = await fetch("/api/invity/library/shape");
        const data = await res.json();
        if (Array.isArray(data)) setShapes(data);
      } catch (err) {
        console.error("❌ Failed to load shapes:", err);
      }
    };
    fetchShapes();
  }, []);

  /* ===============================
     רינדור הצורות
  =============================== */
  return (
    <div className="p-3">
      <div className="grid grid-cols-3 gap-3">
        {shapes.map((shape) => (
          <div
            key={shape.name}
            className="cursor-pointer hover:scale-105 transition-transform"
            onClick={() =>
              addObject({
                id: crypto.randomUUID(),
                type: "image",
                x: 100,
                y: 100,
                width: 150,
                height: 150,
                url: shape.url,
              })
            }
          >
            <img
              src={shape.url}
              alt={shape.name}
              className="w-20 h-20 object-contain border rounded"
            />
          </div>
        ))}

        {/* במידה ואין צורות */}
        {shapes.length === 0 && (
          <p className="text-center text-gray-400 col-span-3">
            אין צורות זמינות כרגע.
          </p>
        )}
      </div>
    </div>
  );
}
