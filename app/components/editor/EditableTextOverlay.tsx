"use client";

import React, { useEffect, useRef, useState } from "react";
import type { EditorObject } from "../../dashboard/create-invite/editorStore";

/* ============================================================
   Types
============================================================ */
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

/* ============================================================
   Component
============================================================ */
/**
 * EditableTextOverlay
 * תיבת עריכת טקסט חיה מעל Konva
 * 🔥 מסונכרנת ל־Toolbar (צבע / גודל / פונט / יישור)
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

  /* ============================================================
     זיהוי מובייל
  ============================================================ */
  const isMobile =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  /* ============================================================
     🔥 סנכרון מלא עם האובייקט
     זה החלק שהיה חסר וגרם לכך שבמובייל
     צבע / פונט / גודל לא התעדכנו
  ============================================================ */
  useEffect(() => {
    if (!obj) return;

    setValue(obj.text ?? "");
  }, [
    obj?.id,
    obj?.text,
    obj?.fill,
    obj?.fontFamily,
    obj?.fontSize,
    obj?.fontWeight,
    obj?.italic,
    obj?.underline,
    obj?.align,
    obj?.letterSpacing,
    obj?.lineHeight,
  ]);

  /* ============================================================
     פוקוס אוטומטי בעת פתיחת עריכה
  ============================================================ */
  useEffect(() => {
    if (!inputRef.current || !rect) return;

    const el = inputRef.current;
    el.focus({ preventScroll: true });

    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [rect]);

  /* ============================================================
     התאמת גובה אוטומטית
  ============================================================ */
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
        /* Enter = סיום עריכה */
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onFinish(value);
        }

        /* Escape = ביטול */
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

        /* ======================================================
           טיפוגרפיה – חייבת להיות זהה ל־Konva.Text
        ====================================================== */
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight ?? "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        lineHeight: String(obj.lineHeight || 1.1),

        /* letterSpacing – במובייל נטרול ערכים בעייתיים */
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
