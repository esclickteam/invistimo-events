"use client";

import type { ReactNode } from "react";
import { DEMO } from "./weddingUtils";
import { useCountdownTimer } from "./useWeddingInteractions";
import { useWeddingSite } from "../editable/WeddingSiteContext";

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
  const site = useWeddingSite();
  const time = useCountdownTimer(
    weddingDate || DEMO.weddingDate,
    weddingTime || DEMO.weddingTime
  );
  const units = weddingCountdownUnits(time);
  // The selection hooks belong to the editor only; the published site must not
  // carry any editing attributes.
  const isEditor = site?.mode === "editor";
  const role = site?.live?.role;
  const demo = role !== "couple" && role !== "guest";

  if (time.past) {
    return (
      <p
        data-ww-countdown="past"
        data-ww-edit={isEditor ? "countdown" : undefined}
        data-ww-path={isEditor ? "countdown" : undefined}
        data-ww-label={isEditor ? "ספירה לאחור" : undefined}
        className="text-center text-lg font-semibold leading-8"
      >
        {demo ? "האירוע לדוגמה כבר התקיים" : "החתונה התקיימה"}
      </p>
    );
  }

  return (
    <div
      dir="ltr"
      data-ww-countdown="units"
      data-ww-edit={isEditor ? "countdown" : undefined}
      data-ww-path={isEditor ? "countdown" : undefined}
      data-ww-label={isEditor ? "ספירה לאחור" : undefined}
      className={className}
      style={{ direction: "ltr" }}
    >
      {units.map((unit, index) => children(unit, index))}
    </div>
  );
}

export default WeddingCountdownGrid;
