"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "./editorStore";

// 🟣 טאבים חדשים מהמאגר
import ElementsTab from "./ElementsTab";
import ShapesTab from "./ShapesTab";
import BackgroundsTab from "./BackgroundsTab";
import LottieTab from "./LottieTab";

/* -------------------------------------------
   Sidebar Props
-------------------------------------------- */
interface SidebarProps {
  canvasRef: any;
  googleApiKey: string; // Google Fonts API Key
}

/* -------------------------------------------
   Sidebar Component
-------------------------------------------- */
export default function Sidebar({ canvasRef, googleApiKey }: SidebarProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const addText = useEditorStore((s) => s.addText);
  const addRect = useEditorStore((s) => s.addRect);
  const addCircle = useEditorStore((s) => s.addCircle);
  const removeObject = useEditorStore((s) => s.removeObject);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);

  const selectedObject = objects.find((o) => o.id === selectedId);

  /* -------------------------------------------
     Tabs
  -------------------------------------------- */
  const [tab, setTab] = useState<"text" | "elements" | "images" | "backgrounds" | "lottie">("text");

  /* -------------------------------------------
     Google Fonts
  -------------------------------------------- */
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

  /* -------------------------------------------
     Text Controls
  -------------------------------------------- */
  const alignments: { label: string; value: "left" | "center" | "right" }[] = [
    { label: "ימין", value: "right" },
    { label: "מרכז", value: "center" },
    { label: "שמאל", value: "left" },
  ];

  /* -------------------------------------------
     Sidebar UI
  -------------------------------------------- */
  return (
    <aside className="w-72 bg-white border-r shadow-lg h-screen flex flex-col">
      {/* HEADER */}
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
              tab === key ? "bg-purple-100 text-purple-700 font-bold" : "hover:bg-gray-50"
            }`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB: TEXT (לא נגעתי בכלום!) */}
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

          {/* ADD TEXT */}
          <button
            onClick={addText}
            className="w-full bg-purple-600 text-white py-2 rounded"
          >
            הוסף טקסט
          </button>
        </div>
      )}

      {/* TAB: ELEMENTS — מהמאגר */}
      {tab === "elements" && <ElementsTab />}

      {/* TAB: SHAPES — מהמאגר (במקום addRect / addCircle) */}
      {tab === "images" && <ShapesTab />}

      {/* TAB: BACKGROUNDS — מהמאגר */}
      {tab === "backgrounds" && <BackgroundsTab />}

      {/* TAB: LOTTIE — מהמאגר */}
      {tab === "lottie" && <LottieTab />}
    </aside>
  );
}
