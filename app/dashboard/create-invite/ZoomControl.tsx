"use client";

import { useEditorStore } from "./editorStore";
import type { EditorCanvasRef } from "./EditorCanvas";

/* =========================================================
   Zoom limits
========================================================= */
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const STEP = 0.1;

/* =========================================================
   Props
========================================================= */
type ZoomControlProps = {
  canvasRef: React.RefObject<EditorCanvasRef | null>;
};

/* =========================================================
   Component
========================================================= */
export default function ZoomControl({ canvasRef }: ZoomControlProps) {
  const scale = useEditorStore((s) => s.scale);

  const zoomIn = () => {
    canvasRef.current?.zoomIn?.();
  };

  const zoomOut = () => {
    canvasRef.current?.zoomOut?.();
  };

  const resetZoom = () => {
    canvasRef.current?.resetZoom?.();
  };

  const onSliderChange = (value: number) => {
    const clamped = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Number(value.toFixed(2)))
    );

    // להזיז את הסקייל בהדרגה לכיוון הערך
    const current = scale;

    if (clamped > current) {
      canvasRef.current?.zoomIn?.();
    } else if (clamped < current) {
      canvasRef.current?.zoomOut?.();
    }
  };

  return (
  <div
    className="
      fixed bottom-6 right-106
      z-50
      bg-white
      shadow-lg
      rounded-full
      px-3 py-2
      flex items-center gap-3
    "
  >

      {/* ➖ Zoom out */}
      <button
        onClick={zoomOut}
        className="
          w-8 h-8
          flex items-center justify-center
          rounded-full
          border
          hover:bg-gray-100
          active:scale-95
        "
        aria-label="Zoom out"
      >
        −
      </button>

      {/* 🎚 Slider */}
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.01}
        value={scale}
        onChange={(e) => onSliderChange(Number(e.target.value))}
        className="w-32 accent-violet-600"
      />

      {/* ➕ Zoom in */}
      <button
        onClick={zoomIn}
        className="
          w-8 h-8
          flex items-center justify-center
          rounded-full
          border
          hover:bg-gray-100
          active:scale-95
        "
        aria-label="Zoom in"
      >
        +
      </button>

      {/* 🔢 Percentage / Reset */}
      <button
        onClick={resetZoom}
        className="
          ml-1
          px-2 py-1
          rounded-md
          text-xs
          border
          hover:bg-gray-100
        "
        title="Reset zoom"
      >
        {Math.round(scale * 100)}%
      </button>
    </div>
  );
}
