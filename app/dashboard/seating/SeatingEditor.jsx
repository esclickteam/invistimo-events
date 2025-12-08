"use client";

import { useState, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Image, Text } from "react-konva";
import useImage from "use-image";
import TableView from "./TableView";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // ✅ טוען את הרקע אם קיים
  const [bgImage] = useImage(background || "", "anonymous");

  // ✅ קובע את גודל הקנבס רק בצד הלקוח
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateSize = () => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 80,
        });
      };

      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, []);

  /* =========================================================
     הוספת שולחן חדש
  ========================================================= */
  const addTable = () => {
    const newTable = {
      id: `table_${Date.now()}`,
      x: 100 + tables.length * 50,
      y: 100 + tables.length * 30,
      name: `שולחן ${tables.length + 1}`,
      seats: 10,
    };
    setTables((prev) => [...prev, newTable]);
  };

  /* =========================================================
     גרירת שולחן
  ========================================================= */
  const handleDrag = useCallback((id, e) => {
    const { x, y } = e.target.position();
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x, y } : t))
    );
  }, []);

  /* =========================================================
     רינדור ראשי
  ========================================================= */
  return (
    <div className="relative h-full w-full bg-gray-100">
      {/* כפתור הוספת שולחן */}
      <button
        onClick={addTable}
        className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700"
      >
        ➕ הוסף שולחן
      </button>

      {/* רק כאשר יש גודל ידוע */}
      {dimensions.width > 0 && (
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {/* רקע (אם קיים) */}
            {bgImage && (
              <Image
                image={bgImage}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}

            {/* ציור כל השולחנות */}
            {tables.map((table) => (
              <Rect
                key={table.id}
                x={table.x}
                y={table.y}
                width={100}
                height={100}
                fill="#60a5fa"
                cornerRadius={10}
                draggable
                onDragEnd={(e) => handleDrag(table.id, e)}
                onClick={() => setSelectedTable(table)}
                shadowBlur={5}
              />
            ))}

            {/* טקסט של שמות השולחנות */}
            {tables.map((table) => (
              <Text
                key={`${table.id}_text`}
                x={table.x + 15}
                y={table.y + 40}
                text={table.name}
                fontSize={14}
                fill="white"
              />
            ))}
          </Layer>
        </Stage>
      )}

      {/* תצוגת השולחן הפתוח */}
      {selectedTable && (
        <TableView
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}
