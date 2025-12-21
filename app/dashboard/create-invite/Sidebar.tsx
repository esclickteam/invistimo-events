"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "./editorStore";

// טאבים קיימים
import ElementsTab from "./ElementsTab";
import ShapesTab from "./ShapesTab";
import BackgroundsTab from "./BackgroundsTab";

// ⭐ טאב חדש לאנימציות
import AnimationsTab from "./AnimationsTab";

interface SidebarProps {
  canvasRef: any;
  googleApiKey: string;
}

export default function Sidebar({ canvasRef, googleApiKey }: SidebarProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const addText = useEditorStore((s) => s.addText);
  const removeObject = useEditorStore((s) => s.removeObject);

  const selectedObject = objects.find((o) => o.id === selectedId);

  // ⭐ הוספתי animations לרשימת הבחירה
  const [tab, setTab] = useState<
    "text" | "elements" | "shapes" | "backgrounds" | "animations"
  >("text");

  const [fonts, setFonts] = useState<string[]>([]);
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=${googleApiKey}&sort=alpha`
        );
        const data = await res.json();
        setFonts(data.items.map((f: any) => f.family));
      } catch (err) {
        console.error("Error fetching Google Fonts:", err);
      }
    };
    fetchFonts();
  }, [googleApiKey]);

  // 🟣 עדכון ישיר של טקסט על הקנבס (בלי שכפול)
  const handleChange = (field: string, value: any) => {
    if (!selectedId) return;
    updateObject(selectedId, { [field]: value });
  };

  return (
    <aside className="w-72 bg-white border-r shadow-lg h-screen flex flex-col">
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* ⭐ TABS כולל אנימציות */}
       <div className="flex flex-wrap border-b text-sm font-medium">
        {[
          ["text", "טקסט"],
          ["elements", "ברית/ה"],
          ["shapes", "חתונה"],
          ["backgrounds", "רקעים"],
          ["animations", "בר/ת מצווה, חינה ועוד"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`flex-1 p-2 text-center border-l first:border-l-0 ${
              tab === key
                ? "bg-purple-100 text-purple-700 font-bold"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* ---- TEXT ---- */}
        {tab === "text" && (
          <div className="space-y-4">
            {selectedObject?.type === "text" && (
              <div className="p-3 border bg-gray-50 rounded space-y-4">
                <div>
                  <label>פונט</label>
                  <select
                    value={selectedObject.fontFamily}
                    onChange={(e) => handleChange("fontFamily", e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    {fonts.map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>גודל</label>
                  <input
                    type="number"
                    value={selectedObject.fontSize}
                    onChange={(e) =>
                      handleChange("fontSize", Number(e.target.value))
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label>צבע</label>
                  <input
                    type="color"
                    value={selectedObject.fill}
                    onChange={(e) => handleChange("fill", e.target.value)}
                    className="w-full h-10 border rounded"
                  />
                </div>

                <button
                  onClick={() => removeObject(selectedId!)}
                  className="w-full bg-red-500 text-white py-2 rounded"
                >
                  מחק
                </button>
              </div>
            )}

            <button
              onClick={addText}
              className="w-full bg-purple-600 text-white py-2 rounded"
            >
              הוסף טקסט
            </button>
          </div>
        )}

        {/* ---- ELEMENTS ---- */}
        {tab === "elements" && <ElementsTab />}

        {/* ---- SHAPES ---- */}
        {tab === "shapes" && <ShapesTab />}

        {/* ---- BACKGROUNDS ---- */}
        {tab === "backgrounds" && <BackgroundsTab />}

        {/* ⭐ ---- ANIMATIONS ---- */}
        {tab === "animations" && <AnimationsTab />}
      </div>
    </aside>
  );
}
