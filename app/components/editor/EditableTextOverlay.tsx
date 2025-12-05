"use client";

import React, { useEffect, useRef, useState } from "react";
import type { EditorObject } from "../../dashboard/create-invite/editorStore";

interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** טיפוס תקין ובטוח — אובייקט טקסט */
type TextObject = EditorObject & { type: "text" };

interface EditableTextOverlayProps {
  obj: TextObject | null;
  rect: OverlayRect | null;
  onFinish: (newText: string) => void;
  onLiveChange?: (newValue: string) => void;
}

/**
 * EditableTextOverlay
 * עריכת טקסט על הקנבס — כמו קאנבה
 */
export default function EditableTextOverlay({
  obj,
  rect,
  onFinish,
  onLiveChange,
}: EditableTextOverlayProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(obj?.text ?? "");

  /* בכל פעם שנבחר אובייקט טקסט חדש */
  useEffect(() => {
    if (obj) {
      setValue(obj.text ?? "");
    }
  }, [obj]);

  /* פוקוס אוטומטי */
  useEffect(() => {
    if (inputRef.current && rect) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [rect]);

  /* התאמת גובה לתוכן */
  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;

    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  if (!rect || !obj) return null;

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => {
        const newVal = e.target.value;
        setValue(newVal);
        onLiveChange?.(newVal); // עדכון חי לקנבס
      }}
      onBlur={() => onFinish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onFinish(value);
        }
        if (e.key === "Escape") {
          onFinish(obj.text ?? "");
        }
      }}
      style={{
        position: "absolute",
        top: rect.y,
        left: rect.x,
        width: rect.width,
        minHeight: rect.height,

        /* עיצוב מלא — כמו קאנבה */
        background: "transparent",
        padding: 0,
        margin: 0,
        border: "none",
        outline: "none",
        resize: "none",

        fontSize: obj.fontSize ?? 16,
        fontFamily: obj.fontFamily ?? "Inter",
        fontWeight: obj.fontWeight ?? "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        textDecoration: obj.underline ? "underline" : "none",
        color: obj.fill ?? "#000",
        lineHeight: obj.lineHeight ? `${obj.lineHeight}` : "1.2",
        letterSpacing: obj.letterSpacing ?? 0,

        whiteSpace: "pre-wrap",
        overflow: "hidden",
        zIndex: 99999,
      }}
    />
  );
}
