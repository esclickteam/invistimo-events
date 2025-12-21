"use client";

import { useState, useEffect, useCallback } from "react";
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
  activeTab?: string; // ✅ מגיע מהתפריט התחתון במובייל: text / blessing / wedding / backgrounds / batmitzvah
}

type SidebarTab = "text" | "elements" | "shapes" | "backgrounds" | "animations";

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

export default function Sidebar({ canvasRef, googleApiKey, activeTab }: SidebarProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const addText = useEditorStore((s) => s.addText);
  const removeObject = useEditorStore((s) => s.removeObject);

  const selectedObject = objects.find((o) => o.id === selectedId);

  const [tab, setTab] = useState<SidebarTab>("text");

  // ✅ סנכרון קשיח: כל שינוי בתפריט התחתון חייב להחליף את הטאב הפנימי
  useEffect(() => {
    setTab(mapActiveToInternalTab(activeTab));
  }, [activeTab]);

  const [fonts, setFonts] = useState<string[]>([]);
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=${googleApiKey}&sort=alpha`
        );
        const data = await res.json();
        setFonts(Array.isArray(data?.items) ? data.items.map((f: any) => f.family) : []);
      } catch (err) {
        console.error("Error fetching Google Fonts:", err);
      }
    };
    if (googleApiKey) fetchFonts();
  }, [googleApiKey]);

  const handleChange = useCallback(
    (field: string, value: any) => {
      if (!selectedId) return;
      updateObject(selectedId, { [field]: value });
    },
    [selectedId, updateObject]
  );

  // ✅ כשעובדים מהמובייל: אל תתני לטאבים הפנימיים "להתנגש" עם הבחירה מהתפריט התחתון
  // במובייל הטאב נקבע רק דרך activeTab (התפריט התחתון).
  const isMobile =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false;

  const onInternalTabClick = (next: SidebarTab) => {
    if (isMobile) return; // במובייל לא משנים פה — רק מהתפריט התחתון
    setTab(next);
  };

  return (
    <aside className="w-full md:w-72 bg-white border-r shadow-lg h-full flex flex-col">
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* טאבים בעברית */}
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
            className={`flex-1 p-2 text-center border-l first:border-l-0 ${
              tab === key
                ? "bg-purple-100 text-purple-700 font-bold"
                : "hover:bg-gray-50"
            }`}
            onClick={() => onInternalTabClick(key)}
            // במובייל הכפתורים האלה מוצגים רק כויזואל (כמו שראית אצלך),
            // אבל אנחנו מונעים מהם לשנות את ה-state כדי שלא "יערבבו" טאבים.
            type="button"
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
                    value={selectedObject.fontFamily || ""}
                    onChange={(e) => handleChange("fontFamily", e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>גודל</label>
                  <input
                    type="number"
                    value={Number(selectedObject.fontSize || 40)}
                    onChange={(e) => handleChange("fontSize", Number(e.target.value))}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label>צבע</label>
                  <input
                    type="color"
                    value={selectedObject.fill || "#000000"}
                    onChange={(e) => handleChange("fill", e.target.value)}
                    className="w-full h-10 border rounded"
                  />
                </div>

                <button
                  onClick={() => selectedId && removeObject(selectedId)}
                  className="w-full bg-red-500 text-white py-2 rounded"
                  type="button"
                >
                  מחק טקסט
                </button>
              </div>
            )}

            <button
              onClick={addText}
              className="w-full bg-purple-600 text-white py-2 rounded"
              type="button"
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
