"use client";

import { useRef } from "react";
import { ymdToDisplay } from "@/lib/formatScheduleDateTime";

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

/**
 * Time field: always shows HH:mm (24h, no AM/PM), click opens native clock.
 * Parent state stays HH:mm — scheduling logic unchanged.
 */
export function ScheduleTimeField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const display = value || "";

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
        {display || "HH:mm"}
      </span>

      <span className="shrink-0 text-[#8A6A3D]" aria-hidden="true">
        <ClockIcon />
      </span>

      <input
        ref={pickerRef}
        type="time"
        lang="en-GB"
        tabIndex={-1}
        disabled={disabled}
        min={min}
        value={value || ""}
        onChange={(e) => onChange(e.target.value.slice(0, 5))}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        aria-label="שעת שליחה"
      />
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
