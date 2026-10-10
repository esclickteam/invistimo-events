"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { UserRound } from "lucide-react";
import { RECORD_MAX, RECORD_MIN, clampRecords } from "@/lib/pricing/packageQuote";

type GuestRecordSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

const MARKS = [0, 250, 500, 750, 1000];

export default function GuestRecordSlider({
  value,
  onChange,
}: GuestRecordSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const safeValue = clampRecords(value);
  const percent = (safeValue / RECORD_MAX) * 100;

  function valueFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return safeValue;

    const fromLeft = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, fromLeft));
    // The page is RTL: 0 sits on the right and 1,000 on the left.
    return clampRecords(Math.round((1 - clamped) * RECORD_MAX));
  }

  function moveTo(clientX: number) {
    onChange(valueFromClientX(clientX));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    moveTo(event.clientX);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    moveTo(event.clientX);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 1;
    let next = safeValue;

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next += step;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") next -= step;
    else if (event.key === "Home") next = RECORD_MIN;
    else if (event.key === "End") next = RECORD_MAX;
    else if (event.key === "PageUp") next += 10;
    else if (event.key === "PageDown") next -= 10;
    else return;

    event.preventDefault();
    onChange(clampRecords(next));
  }

  return (
    <div dir="rtl" className="px-8 sm:px-10">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="כמות רשומות מוזמנים"
        aria-orientation="horizontal"
        aria-valuemin={RECORD_MIN}
        aria-valuemax={RECORD_MAX}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} רשומות`}
        data-testid="guest-slider"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => setDragging(false)}
        onKeyDown={onKeyDown}
        className="relative h-16 cursor-grab touch-pan-y select-none outline-none focus-visible:ring-4 focus-visible:ring-[#D8B16A]/30 active:cursor-grabbing"
      >
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-[#E8D9C7] shadow-inner" />
        <div
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-gradient-to-l from-[#A86F2B] to-[#E4C48A]"
          style={{ width: `${percent}%`, right: 0 }}
        />
        <div
          className="absolute top-1/2 z-10"
          style={{
            right: `${percent}%`,
            transform: `translate(50%, -50%) scale(${dragging ? 1.08 : 1})`,
            transition: dragging
              ? "transform 140ms ease"
              : "right 90ms linear, transform 140ms ease",
          }}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#C89545] bg-[#FFFDF9] text-[#A86F2B] shadow-[0_12px_24px_rgba(168,111,43,0.28)] ${
              dragging ? "ring-4 ring-[#D8B16A]/30" : ""
            }`}
          >
            <UserRound size={28} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-bold text-[#9C866D] sm:text-xs">
        {MARKS.map((mark) => (
          <span key={mark}>{mark.toLocaleString("he-IL")}</span>
        ))}
      </div>
    </div>
  );
}
