"use client";

import { useEditorStore } from "./editorStore";
import type { EditorObject } from "./editorStore";

/* ============================================================
   Types
============================================================ */
type Align = "left" | "center" | "right";

/* ============================================================
   Component
============================================================ */
export default function Toolbar() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const removeObject = useEditorStore((s) => s.removeObject);

  if (!selectedId) return null;

  const obj = objects.find(
    (o) => o.id === selectedId
  ) as EditorObject | undefined;
  if (!obj) return null;

  const isText = obj.type === "text";

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
  const alignments: Array<{ label: string; value: Align }> = [
    { label: "שמאל", value: "left" },
    { label: "מרכז", value: "center" },
    { label: "ימין", value: "right" },
  ];

  /* ============================================================
     Helper – עדכון אחיד (קריטי למובייל)
  ============================================================ */
  const apply = (changes: Partial<EditorObject>) => {
    const affectsLayout =
      obj.type === "text" &&
      ("fontSize" in changes ||
        "fontFamily" in changes ||
        "align" in changes ||
        "fontWeight" in changes);

    updateObject(obj.id, {
      ...changes,
      ...(affectsLayout ? { height: undefined } : null),
    });
  };

  return (
    <div className="h-14 px-4 bg-white border-b shadow flex items-center gap-4 overflow-x-auto">
      {/* 🎨 צבע */}
      {isText && (
        <input
          type="color"
          value={obj.fill || "#000000"}
          onChange={(e) => apply({ fill: e.target.value })}
          className="w-10 h-10 rounded"
          aria-label="צבע טקסט"
        />
      )}

      {/* 🔤 פונט */}
      {isText && (
        <select
          value={obj.fontFamily || "Assistant"}
          className="border p-1 rounded min-w-[160px]"
          onChange={(e) => apply({ fontFamily: e.target.value })}
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
            min={6}
            max={300}
            className="border p-1 w-20 rounded"
            onChange={(e) =>
              apply({ fontSize: Number(e.target.value) })
            }
          />
        </label>
      )}

      {/* 🅱 Bold */}
      {isText && (
        <button
          className={`border px-3 py-1 rounded ${
            obj.fontWeight === "bold"
              ? "bg-gray-200"
              : "hover:bg-gray-100"
          }`}
          onClick={() =>
            apply({
              fontWeight:
                obj.fontWeight === "bold" ? "normal" : "bold",
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
                obj.align === a.value
                  ? "bg-gray-200"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => apply({ align: a.value })}
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
            apply({ rotation: Number(e.target.value) })
          }
        />
      </label>

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
