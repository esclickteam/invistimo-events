"use client";

import { useEditorStore } from "./editorStore";

export default function Toolbar() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const removeObject = useEditorStore((s) => s.removeObject);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);

  if (!selectedId) return null;

  const obj = objects.find((o) => o.id === selectedId);
  if (!obj) return null;

  /* ✨ פונטים זמינים */
  const fontOptions = [
    "Assistant",
    "Heebo",
    "Rubik",
    "Arial",
    "David",
    "Noto Sans Hebrew",
  ];

  /* ✨ יישור טקסט */
  const alignments: Array<{ label: string; value: "left" | "center" | "right" }> = [
    { label: "שמאל", value: "left" },
    { label: "מרכז", value: "center" },
    { label: "ימין", value: "right" },
  ];

  return (
    <div className="h-14 px-4 bg-white border-b shadow flex items-center gap-4 overflow-x-auto">

      {/* 🎨 צבע */}
      {obj.type === "text" && (
        <input
          type="color"
          value={obj.fill || "#000000"}
          onChange={(e) => updateObject(obj.id, { fill: e.target.value })}
          className="w-10 h-10 rounded"
        />
      )}

      {/* 🔤 פונט */}
      {obj.type === "text" && (
        <select
          value={obj.fontFamily || ""}
          className="border p-1 rounded"
          onChange={(e) => updateObject(obj.id, { fontFamily: e.target.value })}
        >
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      )}

      {/* 🔠 גודל טקסט */}
      {obj.type === "text" && (
        <input
          type="number"
          value={obj.fontSize || 40}
          className="border p-1 w-16 rounded"
          onChange={(e) =>
            updateObject(obj.id, { fontSize: Number(e.target.value) })
          }
        />
      )}

      {/* 🅱 Bold */}
      {obj.type === "text" && (
        <button
          className={`border px-3 py-1 rounded ${
            obj.fontWeight === "bold" ? "bg-gray-200" : ""
          }`}
          onClick={() =>
            updateObject(obj.id, {
              fontWeight: obj.fontWeight === "bold" ? "normal" : "bold",
            })
          }
        >
          <b>B</b>
        </button>
      )}

      {/* 📏 יישור */}
      {obj.type === "text" && (
        <div className="flex gap-1">
          {alignments.map((a) => (
            <button
              key={a.value}
              className={`border px-2 py-1 rounded ${
                obj.align === a.value ? "bg-gray-200" : ""
              }`}
              onClick={() =>
                updateObject(obj.id, { align: a.value })
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* 🔁 סיבוב */}
      <label className="flex items-center gap-1">
        סיבוב:
        <input
          type="number"
          value={obj.rotation || 0}
          className="border p-1 w-20 rounded"
          onChange={(e) =>
            updateObject(obj.id, { rotation: Number(e.target.value) })
          }
        />
      </label>

      {/* 🔼 קדימה */}
      <button
        className="border px-3 py-1 rounded hover:bg-gray-100"
        onClick={() => bringToFront(obj.id)}
      >
        קדימה
      </button>

      {/* 🔽 אחורה */}
      <button
        className="border px-3 py-1 rounded hover:bg-gray-100"
        onClick={() => sendToBack(obj.id)}
      >
        אחורה
      </button>

      {/* 🗑 מחיקה */}
      <button
        className="border px-3 py-1 rounded hover:bg-red-200 text-red-600"
        onClick={() => removeObject(obj.id)}
      >
        מחק
      </button>
    </div>
  );
}
