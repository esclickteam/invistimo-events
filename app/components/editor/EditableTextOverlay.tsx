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
 * תיבת עריכה חיה לטקסט — מותאמת ל־RTL ומובייל
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

  /* 🔥 סנכרון מלא עם האובייקט */
  useEffect(() => {
    if (!obj) return;
    setValue(obj.text ?? "");
  }, [obj?.id, obj?.text]);

  /* פוקוס אוטומטי */
  useEffect(() => {
    if (!inputRef.current || !rect) return;
    const el = inputRef.current;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [rect]);

  /* התאמת גובה */
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

        /* ❗️ קריטי: letterSpacing מותאם לנייד */
        letterSpacing: isMobile
          ? "normal"
          : obj.letterSpacing
          ? `${obj.letterSpacing}px`
          : "0px",

        color: obj.fill ?? "#000",
        textAlign: obj.align || "center",
        textDecoration: obj.underline ? "underline" : "none",

        /* RTL תקין במובייל */
        direction: "rtl",
        whiteSpace: "pre-wrap",

        zIndex: 99999,
        cursor: "text",
      }}
    />
  );
}
