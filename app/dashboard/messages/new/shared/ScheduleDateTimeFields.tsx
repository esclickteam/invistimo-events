"use client";

import { useEffect, useRef, useState } from "react";
import { pad2, ymdToDisplay } from "@/lib/formatScheduleDateTime";

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
};

function openNativePicker(input: HTMLInputElement | null) {
  if (!input || input.disabled) return;
  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch {
    // ignore — fall back to click/focus
  }
  input.focus();
  input.click();
}

/**
 * Date field: always shows DD/MM/YYYY (LTR), click opens native calendar.
 * Parent state stays YYYY-MM-DD — scheduling logic unchanged.
 */
export function ScheduleDateField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const display = ymdToDisplay(value);

  return (
    <div
      className={`relative flex cursor-pointer items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
      onClick={() => openNativePicker(pickerRef.current)}
    >
      <span
        dir="ltr"
        className={`min-w-0 flex-1 select-none ${
          display ? "" : "text-gray-400"
        }`}
      >
        {display || "DD/MM/YYYY"}
      </span>

      <span className="shrink-0 text-[#8A6A3D]" aria-hidden="true">
        <CalendarIcon />
      </span>

      <input
        ref={pickerRef}
        type="date"
        lang="en-GB"
        tabIndex={-1}
        disabled={disabled}
        min={min}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        aria-label="תאריך שליחה"
      />
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));

function parseHHmm(value: string): { hour: string; minute: string } {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return { hour: "12", minute: "00" };
  return { hour: m[1], minute: m[2] };
}

function isBeforeMin(hhmm: string, min?: string) {
  if (!min) return false;
  return hhmm < min;
}

/**
 * Time field: always shows HH:mm (24h, no AM/PM).
 * Uses a custom 24h picker — never the native time input (which shows AM/PM).
 * Parent state stays HH:mm — scheduling logic unchanged.
 */
export function ScheduleTimeField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseHHmm(value || "12:00"));
  const display = value || "";

  useEffect(() => {
    if (open) setDraft(parseHHmm(value || "12:00"));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function commit(hour: string, minute: string, close: boolean) {
    const next = `${hour}:${minute}`;
    if (isBeforeMin(next, min)) return;
    setDraft({ hour, minute });
    onChange(next);
    if (close) setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-1 items-center gap-2 bg-transparent p-0 text-left outline-none"
        aria-label="שעת שליחה"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          dir="ltr"
          className={`min-w-0 flex-1 select-none ${
            display ? "" : "text-gray-400"
          }`}
        >
          {display || "HH:mm"}
        </span>
        <span className="shrink-0 text-[#8A6A3D]" aria-hidden="true">
          <ClockIcon />
        </span>
      </button>

      {open && !disabled && (
        <div
          dir="ltr"
          role="dialog"
          aria-label="בחירת שעה"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[#E6D6BC] bg-white shadow-[0_18px_50px_rgba(78,49,27,0.16)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 border-b border-[#F0E3D1] bg-[#FFF9F1] text-center text-xs font-bold text-[#8A6A3D]">
            <div className="px-3 py-2">שעה</div>
            <div className="px-3 py-2">דקה</div>
          </div>

          <div className="grid grid-cols-2">
            <div className="max-h-48 overflow-y-auto border-r border-[#F0E3D1]">
              {HOURS.map((hour) => {
                const sample = `${hour}:${draft.minute}`;
                const blocked = isBeforeMin(sample, min);
                const active = draft.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={blocked}
                    onClick={() => commit(hour, draft.minute, false)}
                    className={`block w-full px-3 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-[#C5964D] text-white"
                        : blocked
                          ? "cursor-not-allowed text-gray-300"
                          : "text-[#3A2417] hover:bg-[#FFF3DD]"
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            <div className="max-h-48 overflow-y-auto">
              {MINUTES.map((minute) => {
                const sample = `${draft.hour}:${minute}`;
                const blocked = isBeforeMin(sample, min);
                const active = draft.minute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    disabled={blocked}
                    onClick={() => commit(draft.hour, minute, true)}
                    className={`block w-full px-3 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-[#C5964D] text-white"
                        : blocked
                          ? "cursor-not-allowed text-gray-300"
                          : "text-[#3A2417] hover:bg-[#FFF3DD]"
                    }`}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
