"use client";

export default function TextEditorPanel({ selected, onApply }) {
  // selected = האובייקט המסומן (טקסט)
  if (!selected) return null;

  const fontFamily = selected.fontFamily || "Heebo";
  const fontSize = Number(selected.fontSize || 36);
  const fill = selected.fill || "#111111";
  const fontStyle = selected.fontStyle || "normal"; // "bold" / "italic" / "normal"
  const align = selected.align || "right";

  const toggleBold = () =>
    onApply({ fontStyle: fontStyle === "bold" ? "normal" : "bold" });

  const toggleItalic = () =>
    onApply({ fontStyle: fontStyle === "italic" ? "normal" : "italic" });

  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleBold}
          className={`px-3 py-2 rounded-xl border text-sm ${
            fontStyle === "bold" ? "bg-black text-white" : "bg-white"
          }`}
        >
          B
        </button>

        <button
          onClick={toggleItalic}
          className={`px-3 py-2 rounded-xl border text-sm ${
            fontStyle === "italic" ? "bg-black text-white" : "bg-white"
          }`}
        >
          I
        </button>

        <select
          value={align}
          onChange={(e) => onApply({ align: e.target.value })}
          className="flex-1 px-3 py-2 rounded-xl border text-sm"
        >
          <option value="right">Right</option>
          <option value="center">Center</option>
          <option value="left">Left</option>
        </select>
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Font</div>
          <select
            value={fontFamily}
            onChange={(e) => onApply({ fontFamily: e.target.value })}
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
            onChange={(e) => onApply({ fontSize: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl border text-sm"
          />
        </div>
      </div>

      {/* Row 3 */}
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
    </div>
  );
}
