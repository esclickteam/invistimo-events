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
 * תיבת עריכה חיה לטקסט — מותאמת RTL + מובייל
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
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  /* התאמת גובה דינמית */
  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
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
      dir="rtl"
      style={{
        /* 🔥 קריטי: מובייל = fixed, דסקטופ = absolute */
        position: isMobile ? "fixed" : "absolute",

        top: isMobile ? "auto" : rect.y,
        left: isMobile ? "5%" : rect.x,
        bottom: isMobile ? "90px" : "auto",

        width: isMobile ? "90%" : rect.width,
        minHeight: rect.height,

        margin: 0,
        padding: isMobile ? "12px 14px" : 0,
        border: isMobile ? "2px solid #2563eb" : "none",
        borderRadius: isMobile ? 12 : 0,
        outline: "none",
        background: isMobile ? "#fff" : "transparent",

        resize: "none",
        overflow: "hidden",
        boxSizing: "border-box",

        /* טיפוגרפיה */
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight ?? "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        lineHeight: String(obj.lineHeight || 1.1),
        letterSpacing: isMobile
          ? "normal"
          : obj.letterSpacing
          ? `${obj.letterSpacing}px`
          : "0px",

        color: obj.fill ?? "#000",
        textAlign: obj.align || "center",
        textDecoration: obj.underline ? "underline" : "none",

        whiteSpace: "pre-wrap",
        zIndex: 99999,
        cursor: "text",
      }}
    />
  );
}
