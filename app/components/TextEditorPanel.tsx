"use client";

import { useEffect, useState } from "react";

/* =========================================================
   Types
========================================================= */
type TextEditorPanelProps = {
  selected: {
    id: string;
    text?: string;
    x?: number;
    width?: number;
    fontFamily?: string;
    fontSize?: number;
    fill?: string;
    fontStyle?: string;
    align?: "left" | "center" | "right";
  } | null;

  onApply: (patch: Record<string, any>) => void;
  onDelete: () => void;
};

/* =========================================================
   Component
========================================================= */
export default function TextEditorPanel({
  selected,
  onApply,
  onDelete,
}: TextEditorPanelProps) {
  if (!selected) return null;

  /* =========================
     Mobile Detection
  ========================= */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fontFamily = selected.fontFamily || "Heebo";
  const fontSize = Number(selected.fontSize || 36);
  const fill = selected.fill || "#111111";
  const fontStyle = selected.fontStyle || "normal";
  const align = selected.align || "right";

  /* =========================
     Bold / Italic
  ========================= */
  const toggleBold = () =>
    onApply({
      fontStyle: fontStyle === "bold" ? "normal" : "bold",
    });

  const toggleItalic = () =>
    onApply({
      fontStyle: fontStyle === "italic" ? "normal" : "italic",
    });

  /* =========================
     🔥 ALIGN – כמו Canva
  ========================= */
  const changeAlign = (nextAlign: "left" | "center" | "right") => {
    if (selected.x == null) return;

    const width = selected.width ?? 200;
    let nextX = selected.x;

    if (nextAlign === "center") {
      nextX = selected.x + width / 2;
    }

    if (nextAlign === "right") {
      nextX = selected.x + width;
    }

    if (nextAlign === "left") {
      nextX = selected.x;
    }

    onApply({
      align: nextAlign,
      x: nextX,
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* =========================
         Row 1 – Bold / Italic / Align
      ========================= */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleBold}
          className={`px-3 py-2 rounded-xl border text-sm ${
            fontStyle === "bold"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          B
        </button>

        <button
          onClick={toggleItalic}
          className={`px-3 py-2 rounded-xl border text-sm ${
            fontStyle === "italic"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          I
        </button>

        <select
          value={align}
          onChange={(e) =>
            changeAlign(e.target.value as "left" | "center" | "right")
          }
          className="flex-1 px-3 py-2 rounded-xl border text-sm"
        >
          <option value="right">Right</option>
          <option value="center">Center</option>
          <option value="left">Left</option>
        </select>
      </div>

      {/* =========================
         Row 2 – Font + Size
      ========================= */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Font</div>
          <select
            value={fontFamily}
            onChange={(e) =>
              onApply({ fontFamily: e.target.value })
            }
            className="w-full px-3 py-2 rounded-xl border text-sm"
          >
            <option value="Heebo">Heebo</option>
            <option value="Assistant">Assistant</option>
            <option value="Rubik">Rubik</option>
            <option value="Arial">Arial</option>
          </select>
        </div>

        <div className="w-32">
          <div className="text-xs text-gray-500 mb-1">Size</div>
          <input
            type="number"
            value={fontSize}
            min={8}
            max={180}
            onChange={(e) =>
              onApply({ fontSize: Number(e.target.value) })
            }
            className="w-full px-3 py-2 rounded-xl border text-sm"
          />
        </div>
      </div>

      {/* =========================
         Row 3 – Color
      ========================= */}
      <div className="flex items-center gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Color</div>
          <input
            type="color"
            value={fill}
            onChange={(e) => onApply({ fill: e.target.value })}
            className="h-10 w-14 p-1 rounded-xl border"
          />
        </div>

        <button
          onClick={() => onApply({ fill: "#111111" })}
          className="px-3 py-2 rounded-xl border text-sm"
        >
          שחור
        </button>

        <button
          onClick={() => onApply({ fill: "#ffffff" })}
          className="px-3 py-2 rounded-xl border text-sm"
        >
          לבן
        </button>
      </div>

      <div className="flex-1" />

      {/* =========================
         Delete – Desktop only
      ========================= */}
      {!isMobile && (
        <button
          onClick={onDelete}
          className="
            w-full
            py-3
            rounded-xl
            bg-red-600
            text-white
            text-sm
            font-medium
            active:scale-95
          "
        >
          🗑️ מחק טקסט
        </button>
      )}
    </div>
  );
}
