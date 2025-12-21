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
 *
 * ✅ Enter יורד שורה ונשאר בתוך העורך (כמו Canva)
 * ✅ התאמת גובה אוטומטית לפי תוכן (לא “נחתך”)
 * ✅ סיום עריכה בלחיצה מחוץ לתיבה
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
     🔥 סנכרון ערך בתחילת עריכה בלבד (לפי id)
  ============================================================ */
  useEffect(() => {
    if (!obj) return;
    setValue(obj.text ?? "");
  }, [obj?.id]);

  /* ============================================================
     ✅ סיום עריכה בלחיצה מחוץ לתיבה
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
     ✅ התאמת גובה אוטומטית + שמירה בתוך rect
     (חשוב ל-Enter כדי שיראו את השורה החדשה בתוך העורך)
  ============================================================ */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    // ✅ לא נחתך גם אם יש הרבה שורות (אפשר גלילה פנימית)
    // אם את רוצה "כמו Canva" שזה תמיד גדל - תשאירי overflow hidden
    // אם את רוצה לא להגזים ולהישאר בתוך התיבה - תשאירי hidden כמו פה
  }, [value, rect?.width, obj?.fontSize, obj?.lineHeight, obj?.letterSpacing]);

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

      onKeyDown={(e) => {
  // ✅ Enter = ירידת שורה בלבד
  if (e.key === "Enter") {
    e.stopPropagation(); // 🔥 הכי חשוב
    return;
  }

  // ⌨️ Esc (רק דסקטופ) – ביטול עריכה
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

        // ✅ תיבת העריכה כמו "תיבה" בקאנבה
        width: rect.width,
        minHeight: rect.height,

        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        background: "transparent",

        resize: "none",
        overflow: "hidden", // ✅ נשאר "בתוך העורך" ולא גולש
        boxSizing: "border-box",

        /* טיפוגרפיה – זהה ל־Konva.Text */
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight ?? "normal",
        fontStyle: obj.italic ? "italic" : "normal",
        lineHeight: String(obj.lineHeight || 1.1),

        letterSpacing:
          !isMobile && obj.letterSpacing ? `${obj.letterSpacing}px` : "0px",

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
