"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Minus, Plus, UserRound } from "lucide-react";
import { RECORD_MAX, RECORD_MIN, clampRecords } from "@/lib/pricing/packageQuote";

type GuestRecordSliderProps = {
  value: number;
  onChange: (value: number) => void;
  /** Fires once when a drag gesture ends — used for a single gold flash on package cards. */
  onDragEnd?: () => void;
};

const MARKS = [0, 250, 500, 750, 1000];
/** Rate-table brackets used for a subtle tick when crossing a new records tier. */
const TIER_STEP = 50;

export default function GuestRecordSlider({
  value,
  onChange,
  onDragEnd,
}: GuestRecordSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const [tick, setTick] = useState(false);
  const lastTier = useRef(Math.floor(clampRecords(value) / TIER_STEP));
  const safeValue = clampRecords(value);
  const percent = (safeValue / RECORD_MAX) * 100;

  useEffect(() => {
    const tier = Math.floor(safeValue / TIER_STEP);
    if (tier === lastTier.current) return;
    lastTier.current = tier;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setTick(true);
    const timer = window.setTimeout(() => setTick(false), 280);
    return () => window.clearTimeout(timer);
  }, [safeValue]);

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

  function beginDrag(clientX: number, target?: HTMLDivElement, pointerId?: number) {
    if (target && typeof pointerId === "number") {
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // Some environments reject capture; mouse fallbacks still work.
      }
    }
    draggingRef.current = true;
    setDragging(true);
    moveTo(clientX);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    beginDrag(event.clientX, event.currentTarget, event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    moveTo(event.clientX);
  }

  function endDrag(event?: PointerEvent<HTMLDivElement>) {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    setDragging(false);
    if (wasDragging) onDragEnd?.();
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

  function nudge(delta: number) {
    onChange(clampRecords(safeValue + delta));
    onDragEnd?.();
  }

  // Keep the bubble inside the track: clamp horizontal offset near edges.
  const bubbleShift =
    percent <= 6 ? "translate(10%, 0)" : percent >= 94 ? "translate(90%, 0)" : "translate(50%, 0)";

  return (
    <div dir="rtl" className="px-1 sm:px-4">
      <div className="mb-3 flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label="הקטן מספר רשומות"
          onClick={() => nudge(-1)}
          disabled={safeValue <= RECORD_MIN}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7B98D] bg-[#FFFDF9] text-[#A86F2B] shadow-[0_8px_18px_rgba(168,111,43,0.1)] transition enabled:hover:border-[#C9A46A] enabled:hover:bg-[#FFF8EE] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="min-w-[8.5rem] text-center">
          <p
            data-testid="record-display"
            className={`pricing-record-display text-4xl font-black tabular-nums leading-none text-[#3E2D20] sm:text-5xl ${
              tick ? "is-tick" : ""
            }`}
            aria-live="polite"
          >
            {safeValue.toLocaleString("he-IL")}
          </p>
          <p className="mt-1 text-xs font-bold text-[#A07C52]">רשומות</p>
        </div>

        <button
          type="button"
          aria-label="הגדל מספר רשומות"
          onClick={() => nudge(1)}
          disabled={safeValue >= RECORD_MAX}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7B98D] bg-[#FFFDF9] text-[#A86F2B] shadow-[0_8px_18px_rgba(168,111,43,0.1)] transition enabled:hover:border-[#C9A46A] enabled:hover:bg-[#FFF8EE] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

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
        onMouseDown={(event) => {
          // Fallback when PointerEvent capture is unavailable.
          if (event.button !== 0) return;
          beginDrag(event.clientX);
        }}
        onMouseMove={(event) => {
          if (!draggingRef.current) return;
          if ((event.buttons & 1) === 0) return;
          moveTo(event.clientX);
        }}
        onMouseUp={() => endDrag()}
        onKeyDown={onKeyDown}
        className="relative h-16 cursor-grab touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-[#D8B16A]/30 active:cursor-grabbing sm:h-14"
      >
        <div className="pricing-slider-track-bg absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full shadow-inner sm:h-2.5" />
        <div
          className="pricing-slider-fill absolute top-1/2 h-3 -translate-y-1/2 rounded-full sm:h-2.5"
          style={{ width: `${percent}%`, right: 0 }}
        />

        <div
          className={`pricing-slider-thumb absolute top-1/2 z-10 ${dragging ? "is-dragging" : ""}`}
          style={{
            right: `${percent}%`,
            transform: dragging ? undefined : "translate(50%, -50%)",
            transition: dragging ? "none" : "right 90ms linear",
          }}
        >
          <span
            className={`pricing-slider-bubble absolute bottom-[calc(100%+0.45rem)] left-1/2 whitespace-nowrap rounded-full border border-[#D4B06E] bg-[#3E2D20] px-2.5 py-1 text-[11px] font-black tabular-nums text-[#F7E9D3] shadow-[0_10px_22px_rgba(62,45,32,0.28)] ${
              tick ? "is-tick" : ""
            }`}
            style={{ transform: bubbleShift }}
            aria-hidden="true"
          >
            {safeValue.toLocaleString("he-IL")}
            <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#3E2D20]" />
          </span>

          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-[#C89545] bg-[#FFFDF9] text-[#A86F2B] shadow-[0_12px_24px_rgba(168,111,43,0.28)] sm:h-12 sm:w-12 ${
              dragging ? "ring-4 ring-[#D8B16A]/35" : ""
            }`}
          >
            <UserRound size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] font-bold text-[#9C866D] sm:text-xs">
        {MARKS.map((mark) => (
          <span key={mark}>{mark.toLocaleString("he-IL")}</span>
        ))}
      </div>
    </div>
  );
}
