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
  activeTab?: string; // ✅ מאפשר קבלת טאב חיצוני ממובייל
}

export default function Sidebar({ canvasRef, googleApiKey, activeTab }: SidebarProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const addText = useEditorStore((s) => s.addText);
  const removeObject = useEditorStore((s) => s.removeObject);

  const selectedObject = objects.find((o) => o.id === selectedId);

  // ✅ סנכרון בין טאב חיצוני (mobileTab) לבין הטאב הפנימי
  const [tab, setTab] = useState<
    "text" | "elements" | "shapes" | "backgrounds" | "animations"
  >("text");

  useEffect(() => {
    if (activeTab) {
      switch (activeTab) {
        case "blessing":
          setTab("elements");
          break;
        case "wedding":
          setTab("shapes");
          break;
        case "backgrounds":
          setTab("backgrounds");
          break;
        case "batmitzvah":
          setTab("animations");
          break;
        case "text":
        default:
          setTab("text");
      }
    }
  }, [activeTab]);

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

  // עדכון ישיר של טקסט על הקנבס
  const handleChange = (field: string, value: any) => {
    if (!selectedId) return;
    updateObject(selectedId, { [field]: value });
  };

  return (
    <aside className="w-72 bg-white border-r shadow-lg h-full flex flex-col">
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* טאבים בעברית */}
      <div className="flex flex-wrap border-b text-sm font-medium">
        {[
          ["text", "טקסט"],
          ["elements", "ברית/ה"],
          ["shapes", "חתונה"],
          ["backgrounds", "רקעים"],
          ["animations", "בת/מצווה, חינה ועוד"],
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

      {/* תוכן כל טאב */}
      <div className="flex-1 overflow-y-auto p-3">
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
                  מחק טקסט
                </button>
              </div>
            )}

            <button
              onClick={addText}
              className="w-full bg-purple-600 text-white py-2 rounded"
            >
              ➕ הוסף טקסט
            </button>
          </div>
        )}

        {tab === "elements" && <ElementsTab />}
        {tab === "shapes" && <ShapesTab />}
        {tab === "backgrounds" && <BackgroundsTab />}
        {tab === "animations" && <AnimationsTab />}
      </div>
    </aside>
  );
}
