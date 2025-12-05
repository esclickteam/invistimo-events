"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "./editorStore";

// טאבים מהמאגר
import ElementsTab from "./ElementsTab";
import ShapesTab from "./ShapesTab";
import BackgroundsTab from "./BackgroundsTab";
import LottieTab from "./LottieTab";

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

  const [tab, setTab] = useState<
    "text" | "elements" | "images" | "backgrounds" | "lottie"
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

  const alignments: { label: string; value: "left" | "center" | "right" }[] = [
    { label: "ימין", value: "right" },
    { label: "מרכז", value: "center" },
    { label: "שמאל", value: "left" },
  ];

  // פונקציה לדוגמה להוספה למאגר
  const handleAddToLibrary = (tabKey: string) => {
    alert(`נוסיף אובייקט למאגר של הטאב: ${tabKey}`);
    // כאן אפשר לממש קריאה ל-API או פתיחת Modal
  };

  return (
    <aside className="w-72 bg-white border-r shadow-lg h-screen flex flex-col">
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* TABS */}
      <div className="flex flex-wrap border-b text-sm font-medium">
        {[
          ["text", "טקסט"],
          ["elements", "אלמנטים"],
          ["images", "צורות"],
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

      {/* TAB TEXT */}
      {tab === "text" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          {selectedObject?.type === "text" && (
            <div className="p-3 border bg-gray-50 rounded space-y-4">
              <div>
                <label>פונט</label>
                <select
                  value={selectedObject.fontFamily}
                  onChange={(e) =>
                    updateObject(selectedId!, { fontFamily: e.target.value })
                  }
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
                    updateObject(selectedId!, { fontSize: Number(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label>צבע</label>
                <input
                  type="color"
                  value={selectedObject.fill}
                  onChange={(e) =>
                    updateObject(selectedId!, { fill: e.target.value })
                  }
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

      {/* TAB ELEMENTS */}
      {tab === "elements" && (
        <div className="p-3">
          <ElementsTab />
          <button
            onClick={() => handleAddToLibrary("elements")}
            className="w-full bg-green-500 text-white py-2 rounded my-2"
          >
            הוסף למאגר
          </button>
        </div>
      )}

      {/* TAB SHAPES */}
      {tab === "images" && (
        <div className="p-3">
          <ShapesTab />
          <button
            onClick={() => handleAddToLibrary("shapes")}
            className="w-full bg-green-500 text-white py-2 rounded my-2"
          >
            הוסף למאגר
          </button>
        </div>
      )}

      {/* TAB BACKGROUNDS */}
      {tab === "backgrounds" && (
        <div className="p-3">
          <BackgroundsTab />
          <button
            onClick={() => handleAddToLibrary("backgrounds")}
            className="w-full bg-green-500 text-white py-2 rounded my-2"
          >
            הוסף למאגר
          </button>
        </div>
      )}

      {/* TAB LOTTIE */}
      {tab === "lottie" && (
        <div className="p-3">
          <LottieTab />
          <button
            onClick={() => handleAddToLibrary("lottie")}
            className="w-full bg-green-500 text-white py-2 rounded my-2"
          >
            הוסף למאגר
          </button>
        </div>
      )}
    </aside>
  );
}
