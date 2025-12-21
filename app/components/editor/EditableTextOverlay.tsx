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
     סיום עריכה בלחיצה מחוץ לתיבה
  ============================================================ */
  useEffect(() => {
    if (!obj) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const el = inputRef.current;
      if (!el) return;

      const target = e.target as Node | null;
      if (target && el.contains(target)) return;

      onFinish(value);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    };
  }, [obj?.id, value, onFinish]);

  /* ============================================================
     פוקוס אוטומטי
  ============================================================ */
  useEffect(() => {
    if (!inputRef.current || !rect) return;

    const el = inputRef.current;
    el.focus({ preventScroll: true });

    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [rect]);

  /* ============================================================
     התאמת גובה textarea בזמן אמת
  ============================================================ */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, rect?.width, obj?.fontSize, obj?.lineHeight, obj?.letterSpacing]);

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
        /* ==============================
           Enter = שורה חדשה (כמו Canva)
        ============================== */
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();

          const el = inputRef.current;
          if (!el) return;

          const start = el.selectionStart;
          const end = el.selectionEnd;
          const newText =
            value.slice(0, start) + "\n" + value.slice(end);

          setValue(newText);

          requestAnimationFrame(() => {
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;

            onLiveChange?.({
              text: newText,
              height: el.scrollHeight,
            });

            el.selectionStart = el.selectionEnd = start + 1;
          });

          return;
        }

        /* ==============================
           Escape = ביטול עריכה (דסקטופ)
        ============================== */
        if (!isMobile && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onFinish(obj.text ?? "");
        }
      }}
      style={{
        position: "fixed",
        top: rect.y,
        left: rect.x,

        width: rect.width,
        height: rect.height, // 🔥 לא minHeight

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
