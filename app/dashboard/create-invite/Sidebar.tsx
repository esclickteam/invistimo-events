"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "./editorStore";

// טאבים
import ElementsTab from "./ElementsTab";
import ShapesTab from "./ShapesTab";
import BackgroundsTab from "./BackgroundsTab";
import LottieTab from "./LottieTab";

interface SidebarProps {
  canvasRef: any;
  googleApiKey: string;
  selectedObject: any | null;
}

export default function Sidebar({
  canvasRef,
  googleApiKey,
  selectedObject,
}: SidebarProps) {
  const updateObject = useEditorStore((s) => s.updateObject);
  const addText = useEditorStore((s) => s.addText);
  const removeObject = useEditorStore((s) => s.removeObject);

  const [tab, setTab] = useState<
    "text" | "elements" | "shapes" | "backgrounds" | "lottie"
  >("text");

  /* =========================
     Google Fonts (ללא שינוי)
  ========================= */
  const [fonts, setFonts] = useState<string[]>([]);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=${googleApiKey}&sort=popularity`
        );

        const data = await res.json();
        setFonts(data.items.map((f: any) => f.family));
      } catch (err) {
        console.error("Error loading fonts:", err);
      }
    };

    loadFonts();
  }, [googleApiKey]);

  /* =========================
        SIDEBAR HTML
  ========================= */

  return (
    <aside className="w-72 bg-white border-r shadow-lg h-screen flex flex-col">
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b text-sm font-medium">
        {[
          ["text", "טקסט"],
          ["elements", "אלמנטים"],
          ["shapes", "צורות"],
          ["backgrounds", "רקעים"],
          ["lottie", "אנימציות"],
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

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-3">

        {/* טקסט — משוחזר כמו שהיה */}
        {tab === "text" && (
          <div className="space-y-4">

            {selectedObject?.type === "text" && (
              <div className="p-3 border bg-gray-50 rounded space-y-4">

                {/* פונט */}
                <div>
                  <label>פונט</label>
                  <select
                    value={selectedObject.fontFamily}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        fontFamily: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded"
                  >
                    {fonts.map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                </div>

                {/* גודל */}
                <div>
                  <label>גודל</label>
                  <input
                    type="number"
                    value={selectedObject.fontSize}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>

                {/* צבע */}
                <div>
                  <label>צבע</label>
                  <input
                    type="color"
                    value={selectedObject.fill}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        fill: e.target.value,
                      })
                    }
                    className="w-full h-10 border rounded"
                  />
                </div>

                {/* מחיקה */}
                <button
                  onClick={() => removeObject(selectedObject.id)}
                  className="w-full bg-red-500 text-white py-2 rounded"
                >
                  מחק
                </button>
              </div>
            )}

            {/* הוסף טקסט */}
            <button
              onClick={addText}
              className="w-full bg-purple-600 text-white py-2 rounded"
            >
              הוסף טקסט
            </button>
          </div>
        )}

        {/* שאר הטאבים */}
        {tab === "elements" && <ElementsTab />}
        {tab === "shapes" && <ShapesTab />}
        {tab === "backgrounds" && <BackgroundsTab />}
        {tab === "lottie" && <LottieTab />}
      </div>
    </aside>
  );
}
