"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorObject } from "../../dashboard/create-invite/editorStore";

interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditableTextOverlayProps {
  obj: EditorObject | null;
  rect: OverlayRect | null;
  onFinish: (newText: string) => void;
}

/**
 * EditableTextOverlay
 * מופיע מעל הקנבס בזמן עריכת טקסט — כמו קאנבה
 */
export default function EditableTextOverlay({
  obj,
  rect,
  onFinish,
}: EditableTextOverlayProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(obj?.text || "");

  /* עדכון ערך כאשר אובייקט חדש נבחר */
  useEffect(() => {
    if (obj) setValue(obj.text || "");
  }, [obj]);

  /* פוקוס אוטומטי */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [rect]);

  if (!rect || !obj) return null;

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onFinish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onFinish(value);
        }
        if (e.key === "Escape") {
          onFinish(obj.text || "");
        }
      }}
      style={{
        position: "absolute",
        top: rect.y,
        left: rect.x,
        width: rect.width || 200,
        height: rect.height || (obj.fontSize || 20) * 1.4,

        /* סטייל כמו קאנבה */
        padding: "4px 6px",
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.italic ? "italic" : "normal",
        textDecoration: obj.underline ? "underline" : "none",
        lineHeight: obj.lineHeight,
        letterSpacing: obj.letterSpacing || 0,
        color: obj.fill || "#000",

        background: "rgba(255,255,255,0.95)",
        border: "1px solid #aaa",
        borderRadius: "4px",
        zIndex: 9999,
        resize: "none",
        outline: "none",
        whiteSpace: "pre-wrap",
      }}
    />
  );
}
