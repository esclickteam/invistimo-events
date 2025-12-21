"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditorStore } from "./editorStore";
import ElementsTab from "./ElementsTab";
import ShapesTab from "./ShapesTab";
import BackgroundsTab from "./BackgroundsTab";
import AnimationsTab from "./AnimationsTab";

interface SidebarProps {
  canvasRef: any;
  googleApiKey: string;
  activeTab?: string;
}

type SidebarTab =
  | "text"
  | "elements"
  | "shapes"
  | "backgrounds"
  | "animations";

function mapActiveToInternalTab(activeTab?: string): SidebarTab {
  switch (activeTab) {
    case "blessing":
      return "elements";
    case "wedding":
      return "shapes";
    case "backgrounds":
      return "backgrounds";
    case "batmitzvah":
      return "animations";
    case "text":
    default:
      return "text";
  }
}

export default function Sidebar({
  canvasRef,
  googleApiKey,
  activeTab,
}: SidebarProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const addText = useEditorStore((s) => s.addText);
  const removeObject = useEditorStore((s) => s.removeObject);

  const selectedObject = objects.find((o) => o.id === selectedId);

  const [tab, setTab] = useState<SidebarTab>("text");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    setTab(mapActiveToInternalTab(activeTab));
  }, [activeTab]);

  const [fonts, setFonts] = useState<string[]>([]);
  useEffect(() => {
    if (!googleApiKey) return;

    fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${googleApiKey}&sort=alpha`
    )
      .then((r) => r.json())
      .then((data) =>
        setFonts(
          Array.isArray(data?.items)
            ? data.items.map((f: any) => f.family)
            : []
        )
      )
      .catch(console.error);
  }, [googleApiKey]);

  const handleChange = useCallback(
    (field: string, value: any) => {
      if (!selectedId) return;
      updateObject(selectedId, { [field]: value });
    },
    [selectedId, updateObject]
  );

  return (
    <aside className="w-full md:w-72 bg-white border-r shadow-lg h-full flex flex-col">
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* טאבים */}
      <div className="flex flex-wrap border-b text-sm font-medium">
        {([
          ["text", "טקסט"],
          ["elements", "ברית/ה"],
          ["shapes", "חתונה"],
          ["backgrounds", "רקעים"],
          ["animations", "בת/מצווה, חינה ועוד"],
        ] as Array<[SidebarTab, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => !isMobile && setTab(key)}
            className={`flex-1 p-2 text-center border-l first:border-l-0 ${
              tab === key
                ? "bg-purple-100 text-purple-700 font-bold"
                : "hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* תוכן */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "text" && (
          <div className="space-y-4">
            <button
              onClick={addText}
              className="w-full bg-purple-600 text-white py-2 rounded font-semibold"
            >
              ➕ הוסף טקסט
            </button>

            {selectedObject?.type === "text" && (
              <div className="p-3 border bg-gray-50 rounded space-y-4">
                {/* פונט */}
                <div>
                  <label className="block text-sm mb-1">פונט</label>
                  <select
                    value={selectedObject.fontFamily}
                    onChange={(e) =>
                      handleChange("fontFamily", e.target.value)
                    }
                    className="w-full border p-2 rounded"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                {/* גודל */}
                <div>
                  <label className="block text-sm mb-1">גודל</label>
                  <input
                    type="number"
                    value={selectedObject.fontSize}
                    onChange={(e) =>
                      handleChange("fontSize", Number(e.target.value))
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>

                {/* צבע */}
                <div>
                  <label className="block text-sm mb-1">צבע</label>
                  <input
                    type="color"
                    value={selectedObject.fill || "#000000"}
                    onChange={(e) =>
                      handleChange("fill", e.target.value)
                    }
                    className="w-full h-10 border rounded"
                  />
                </div>

                {/* עיצוב */}
                <div className="flex gap-2">
                  <button
                    className={`border px-3 py-1 rounded ${
                      selectedObject.fontWeight === "bold"
                        ? "bg-gray-200"
                        : ""
                    }`}
                    onClick={() =>
                      handleChange(
                        "fontWeight",
                        selectedObject.fontWeight === "bold"
                          ? "normal"
                          : "bold"
                      )
                    }
                  >
                    <b>B</b>
                  </button>

                  {/* ✅ סדר RTL נכון */}
                  {[
                    { key: "right", label: "ימין" },
                    { key: "center", label: "מרכז" },
                    { key: "left", label: "שמאל" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`border px-3 py-1 rounded ${
                        selectedObject.align === key
                          ? "bg-gray-200"
                          : ""
                      }`}
                      onClick={() => handleChange("align", key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => selectedId && removeObject(selectedId)}
                  className="w-full bg-red-500 text-white py-2 rounded"
                >
                  מחק טקסט
                </button>
              </div>
            )}
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
