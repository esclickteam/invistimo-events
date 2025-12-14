"use client";

import React, { useEffect, useRef, useState } from "react";
import type { EditorObject } from "../../dashboard/create-invite/editorStore";

interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type TextObject = EditorObject & { type: "text" };

interface EditableTextOverlayProps {
  obj: TextObject | null;
  rect: OverlayRect | null;
  onFinish: (newText: string) => void;
  onLiveChange?: (newValue: string) => void;
}

/**
 * EditableTextOverlay
 * תיבת עריכה חיה לטקסט — מיושרת בדיוק על Konva.Text (בלי קפיצה)
 */
export default function EditableTextOverlay({
  obj,
  rect,
  onFinish,
  onLiveChange,
}: EditableTextOverlayProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(obj?.text ?? "");

  /* בכל פעם שנבחר טקסט חדש */
  useEffect(() => {
    if (obj) setValue(obj.text ?? "");
  }, [obj]);

  /* פוקוס מיידי + סמן בסוף */
  useEffect(() => {
    if (inputRef.current && rect) {
      const el = inputRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [rect]);

  /* גובה דינמי */
  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  if (!rect || !obj) return null;

  const fontStyle = `${obj.italic ? "italic " : ""}${obj.fontWeight === "bold" ? "bold" : "normal"}`;

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => {
        const newVal = e.target.value;
        setValue(newVal);
        onLiveChange?.(newVal);
      }}
      onBlur={() => onFinish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onFinish(value);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onFinish(obj.text ?? "");
        }
      }}
      style={{
        position: "fixed",
        top: rect.y,
        left: rect.x,
        width: rect.width,
        height: rect.height,

        /* ✅ חשובים למיקום מושלם */
        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
        boxSizing: "border-box",
        transform: "translateZ(0)", // מניעת anti-alias blur בדפדפנים

        /* ✅ סגנון זהה ל-Konva.Text */
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontStyle,
        fontWeight: obj.fontWeight ?? "normal",
        lineHeight: String(obj.lineHeight || 1.1),
        letterSpacing: obj.letterSpacing ? `${obj.letterSpacing}px` : "0px",
        color: obj.fill ?? "#000",
        textAlign: obj.align || "center",
        textDecoration: obj.underline ? "underline" : "none",

        /* עברית ותמיכה מלאה */
        direction: "rtl",
        unicodeBidi: "plaintext",

        /* ממש כמו קאנבה */
        whiteSpace: "pre-wrap",
        zIndex: 99999,
        cursor: "text",
      }}
    />
  );
}
