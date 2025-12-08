"use client";

import { Stage, Layer, Rect, Image, Text } from "react-konva";
import useImage from "use-image";
import { useState, useCallback, useEffect } from "react";
import TableView from "./TableView";

export default function SeatingEditor({ background }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  const [bgImage] = useImage(background || "", "anonymous");

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
     רינדור הקנבס
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

      <Stage width={window.innerWidth} height={window.innerHeight - 80}>
        <Layer>
          {/* רקע (אם הועלה) */}
          {bgImage && (
            <Image
              image={bgImage}
              width={window.innerWidth}
              height={window.innerHeight - 80}
            />
          )}

          {/* שולחנות */}
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

          {/* טקסט של שמות שולחנות */}
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

      {/* פתיחת תצוגת שולחן */}
      {selectedTable && (
        <TableView
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}
