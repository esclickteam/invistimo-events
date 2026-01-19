"use client";

import React from "react";

/**
 * ⚠️ הקובץ הזה הושבת בכוונה
 *
 * כל הלוגיקה של Live Seating
 * מנוהלת כיום דרך:
 * 👉 useSeatingStore (Zustand)
 *
 * הקובץ נשאר רק לתאימות לאחור
 * כדי שלא יישברו imports ישנים
 */

/* =========================
   Provider (NO-OP)
========================= */
export function LiveSeatingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/* =========================
   Hook – חסום במפורש
========================= */
export function useLiveSeating(): never {
  throw new Error(
    "❌ useLiveSeating is deprecated. Use useSeatingStore instead."
  );
}
