"use client";

import type { ReactNode } from "react";
import { DEMO } from "./weddingUtils";
import { useCountdownTimer } from "./useWeddingInteractions";

export type WeddingCountdownUnit = {
  label: string;
  value: number;
};

export function weddingCountdownUnits(time: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}): WeddingCountdownUnit[] {
  return [
    { label: "ימים", value: time.days },
    { label: "שעות", value: time.hours },
    { label: "דקות", value: time.minutes },
    { label: "שניות", value: time.seconds },
  ];
}

export function WeddingCountdownGrid({
  className = "",
  children,
  weddingDate,
  weddingTime,
}: {
  className?: string;
  children: (unit: WeddingCountdownUnit, index: number) => ReactNode;
  weddingDate?: string;
  weddingTime?: string;
}) {
  const time = useCountdownTimer(
    weddingDate || DEMO.weddingDate,
    weddingTime || DEMO.weddingTime
  );
  const units = weddingCountdownUnits(time);

  return (
    <div
      dir="ltr"
      data-ww-countdown="units"
      data-ww-edit="countdown"
      data-ww-path="countdown"
      data-ww-label="ספירה לאחור"
      className={className}
      style={{ direction: "ltr" }}
    >
      {units.map((unit, index) => children(unit, index))}
    </div>
  );
}

export default WeddingCountdownGrid;
