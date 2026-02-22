"use client";

import { X, Trash2, Type, Palette, AlignCenter } from "lucide-react";

export default function MobileEditorSheet({
  open,
  onClose,
  selectedType,
  canvasRef,
}: {
  open: boolean;
  onClose: () => void;
  selectedType: "text" | "image" | "shape" | null;
  canvasRef: any;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-xl p-4 animate-slideUp">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold">כלי עיצוב</span>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* ===== אוריינטציה (זה החלק החשוב) ===== */}
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 border rounded py-2 text-sm"
            onClick={() =>
              canvasRef?.current?.setOrientation?.("portrait")
            }
          >
            📱 אורך
          </button>

          <button
            className="flex-1 border rounded py-2 text-sm"
            onClick={() =>
              canvasRef?.current?.setOrientation?.("landscape")
            }
          >
            🖥️ רוחב
          </button>
        </div>

        {/* actions */}
        <div className="flex justify-around text-sm">
          {selectedType === "text" && (
            <>
              <button className="flex flex-col items-center gap-1">
                <Type /> טקסט
              </button>
              <button className="flex flex-col items-center gap-1">
                <Palette /> צבע
              </button>
              <button className="flex flex-col items-center gap-1">
                <AlignCenter /> יישור
              </button>
            </>
          )}

          <button className="flex flex-col items-center gap-1 text-red-500">
            <Trash2 /> מחיקה
          </button>
        </div>
      </div>
    </div>
  );
}