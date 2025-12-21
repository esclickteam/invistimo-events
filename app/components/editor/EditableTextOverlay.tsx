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
 * תיבת עריכת טקסט חיה מעל Konva
 * מותאמת ל־RTL + מובייל
 */
export default function EditableTextOverlay({
  obj,
  rect,
  onFinish,
  onLiveChange,
}: EditableTextOverlayProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState("");

  /* זיהוי מובייל */
  const isMobile =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  /* סנכרון עם האובייקט */
  useEffect(() => {
    if (!obj) return;
    setValue(obj.text ?? "");
  }, [obj?.id]);

  /* פוקוס אוטומטי */
  useEffect(() => {
    if (!inputRef.current || !rect) return;

    const el = inputRef.current;
    el.focus({ preventScroll: true });

    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [rect]);

  /* התאמת גובה אוטומטית */
  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (!obj || !rect) return null;

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => {
        const newVal = e.target.value;
        setValue(newVal);
        onLiveChange?.(newVal);
      }}
      onBlur={() => {
        onFinish(value);
      }}
      onKeyDown={(e) => {
        // Enter = סיום (לא ירידת שורה)
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onFinish(value);
        }

        // Escape = ביטול
        if (e.key === "Escape") {
          e.preventDefault();
          onFinish(obj.text ?? "");
        }
      }}
      style={{
        position: "absolute",
        top: rect.y,
        left: rect.x,
        width: rect.width,
        minHeight: rect.height,

        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
        boxSizing: "border-box",

        /* טיפוגרפיה */
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight ?? "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        lineHeight: String(obj.lineHeight || 1.1),

        /* letterSpacing – מובייל לא אוהב ערכים קטנים */
        letterSpacing:
          !isMobile && obj.letterSpacing
            ? `${obj.letterSpacing}px`
            : "0px",

        color: obj.fill ?? "#000",
        textAlign: obj.align || "center",
        textDecoration: obj.underline ? "underline" : "none",

        direction: "rtl",
        whiteSpace: "pre-wrap",

        zIndex: 99999,
        cursor: "text",
        userSelect: "text",
      }}
    />
  );
}
