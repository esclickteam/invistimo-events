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
  const alignments: Array<{ label: string; value: "left" | "center" | "right" }> =
    [
      { label: "שמאל", value: "left" },
      { label: "מרכז", value: "center" },
      { label: "ימין", value: "right" },
    ];

  const isText = obj.type === "text";

  return (
    <div className="h-14 px-4 bg-white border-b shadow flex items-center gap-4 overflow-x-auto">
      {/* 🎨 צבע */}
      {isText && (
        <input
          type="color"
          value={obj.fill || "#000000"}
          onChange={(e) => updateObject(obj.id, { fill: e.target.value })}
          className="w-10 h-10 rounded"
          aria-label="צבע טקסט"
        />
      )}

      {/* 🔤 פונט */}
      {isText && (
        <select
          value={obj.fontFamily || "Assistant"}
          className="border p-1 rounded min-w-[160px]"
          onChange={(e) => updateObject(obj.id, { fontFamily: e.target.value })}
          aria-label="פונט"
        >
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      )}

      {/* 🔠 גודל טקסט */}
      {isText && (
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-700">גודל</span>
          <input
            type="number"
            value={Number(obj.fontSize ?? 40)}
            className="border p-1 w-20 rounded"
            min={6}
            max={300}
            onChange={(e) =>
              updateObject(obj.id, { fontSize: Number(e.target.value) })
            }
          />
        </label>
      )}

      {/* 🅱 Bold */}
      {isText && (
        <button
          className={`border px-3 py-1 rounded ${
            obj.fontWeight === "bold" ? "bg-gray-200" : "hover:bg-gray-100"
          }`}
          onClick={() =>
            updateObject(obj.id, {
              fontWeight: obj.fontWeight === "bold" ? "normal" : "bold",
            })
          }
          aria-label="הדגשה"
        >
          <b>B</b>
        </button>
      )}

      {/* 📏 יישור */}
      {isText && (
        <div className="flex gap-1">
          {alignments.map((a) => (
            <button
              key={a.value}
              className={`border px-2 py-1 rounded ${
                obj.align === a.value ? "bg-gray-200" : "hover:bg-gray-100"
              }`}
              onClick={() => updateObject(obj.id, { align: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* 🔁 סיבוב */}
      <label className="flex items-center gap-2">
        <span className="text-sm text-gray-700">סיבוב</span>
        <input
          type="number"
          value={Number(obj.rotation ?? 0)}
          className="border p-1 w-24 rounded"
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
