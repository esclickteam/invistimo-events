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

  onFinish: (payload: { text: string; height: number }) => void;
  onLiveChange?: (payload: { text: string; height?: number }) => void;
}

/* ============================================================
   Component
============================================================ */
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
     סנכרון טקסט בתחילת עריכה בלבד
  ============================================================ */
  useEffect(() => {
    if (!obj) return;
    setValue(obj.text ?? "");
  }, [obj?.id]);

  /* ============================================================
     click / touch מחוץ ל־textarea = סיום עריכה
  ============================================================ */
  useEffect(() => {
    if (!obj) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const el = inputRef.current;
      if (!el) return;

      const target = e.target as Node | null;
      if (target && el.contains(target)) return;

      onFinish({
        text: value,
        height: el.scrollHeight || rect?.height || 0,
      });
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    };
  }, [obj?.id, value, onFinish, rect?.height]);

  /* ============================================================
     פוקוס + cursor בסוף + auto-grow ראשוני
  ============================================================ */
  useEffect(() => {
    if (!inputRef.current || !rect) return;

    const el = inputRef.current;
    el.focus({ preventScroll: true });

    const len = el.value.length;
    el.setSelectionRange(len, len);

    // auto-grow ראשוני
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [rect]);

  /* ============================================================
     auto-grow בזמן הקלדה / שינויי סגנון
  ============================================================ */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [
    value,
    rect?.width,
    obj?.fontSize,
    obj?.lineHeight,
    obj?.letterSpacing,
  ]);

  if (!obj || !rect) return null;

  return (
    <textarea
      ref={inputRef}
      value={value}
      rows={1}
      onChange={(e) => {
        const newText = e.target.value;
        setValue(newText);

        const el = inputRef.current;
        if (!el) return;

        onLiveChange?.({
          text: newText,
          height: el.scrollHeight,
        });
      }}
      onKeyDown={(e) => {
        /* Escape = ביטול עריכה (דסקטופ) */
        if (!isMobile && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();

          const el = inputRef.current;
          onFinish({
            text: obj.text ?? "",
            height: el?.scrollHeight || rect.height,
          });
        }
      }}
      style={{
        position: "fixed",
        top: rect.y,
        left: rect.x,

        width: rect.width,
        height: rect.height,

        margin: 0,
        padding: 6,
        border: "none",
        outline: "none",
        background: "transparent",

        resize: "none",
        overflow: "hidden",
        boxSizing: "border-box",

        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight ?? "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        lineHeight: String(obj.lineHeight || 1.1),
        letterSpacing:
          !isMobile && obj.letterSpacing
            ? `${obj.letterSpacing}px`
            : "0px",

        color: obj.fill ?? "#000",
        textAlign: obj.align || "center",
        textDecoration: obj.underline ? "underline" : "none",

        direction: "rtl",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",

        zIndex: 99999,
        cursor: "text",
        userSelect: "text",
        pointerEvents: "auto",
      }}
    />
  );
}
