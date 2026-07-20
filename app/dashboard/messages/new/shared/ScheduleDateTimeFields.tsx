"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  displayToYmd,
  normalizeHHmm,
  pad2,
  ymdToDisplay,
} from "@/lib/formatScheduleDateTime";

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad2(i * 5));

function parseHHmm(value: string): { hour: string; minute: string } {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return { hour: "12", minute: "00" };
  return { hour: m[1], minute: m[2] };
}

function openNativePicker(input: HTMLInputElement | null) {
  if (!input || input.disabled) return;
  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch {
    // fall through
  }
  input.focus();
  input.click();
}

/**
 * Date: large typed DD/MM/YYYY field + calendar icon (native picker).
 * Parent state stays YYYY-MM-DD.
 */
export function ScheduleDateField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => ymdToDisplay(value));

  useEffect(() => {
    setText(ymdToDisplay(value));
  }, [value]);

  function commitText(raw: string) {
    const ymd = displayToYmd(raw);
    if (!ymd) {
      setText(ymdToDisplay(value));
      return;
    }
    if (min && ymd < min) {
      setText(ymdToDisplay(value));
      return;
    }
    onChange(ymd);
    setText(ymdToDisplay(ymd));
  }

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        placeholder="DD/MM/YYYY"
        autoComplete="off"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-w-0 flex-1 bg-transparent p-0 text-base font-semibold text-[#2D241D] outline-none border-0 placeholder:font-normal placeholder:text-gray-400 disabled:opacity-60"
        aria-label="תאריך שליחה"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => openNativePicker(pickerRef.current)}
        className="shrink-0 text-[#8A6A3D] transition hover:text-[#5C4030] disabled:opacity-50"
        aria-label="בחירת תאריך"
        title="בחירת תאריך"
      >
        <CalendarIcon />
      </button>

      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        disabled={disabled}
        min={min}
        value={value || ""}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          setText(ymdToDisplay(next));
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Time: large typed HH:mm field + compact hour/minute selects (no tall modal).
 * Parent state stays HH:mm. Always 24h, never AM/PM.
 */
export function ScheduleTimeField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const [text, setText] = useState(() => value || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const parsed = parseHHmm(value || "12:00");

  const minuteOptions = (() => {
    const base = [...MINUTES];
    if (parsed.minute && !base.includes(parsed.minute)) {
      base.push(parsed.minute);
      base.sort();
    }
    return base;
  })();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setText(value || "");
  }, [value]);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuStyle(null);
      return;
    }
    function update() {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function commitText(raw: string) {
    const hhmm = normalizeHHmm(raw);
    if (!hhmm) {
      setText(value || "");
      return;
    }
    if (min && hhmm < min) {
      setText(value || "");
      return;
    }
    onChange(hhmm);
    setText(hhmm);
  }

  function apply(hour: string, minute: string) {
    const next = `${hour}:${minute}`;
    if (min && next < min) return;
    onChange(next);
    setText(next);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder="HH:mm"
          autoComplete="off"
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setMenuOpen(false)}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="min-w-0 flex-1 bg-transparent p-0 text-base font-semibold text-[#2D241D] outline-none border-0 placeholder:font-normal placeholder:text-gray-400 disabled:opacity-60"
          aria-label="שעת שליחה"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setMenuOpen((v) => !v)}
          className="shrink-0 text-[#8A6A3D] transition hover:text-[#5C4030] disabled:opacity-50"
          aria-label="בחירת שעה"
          title="בחירת שעה"
          aria-expanded={menuOpen}
        >
          <ClockIcon />
        </button>
      </div>

      {mounted &&
        menuOpen &&
        !disabled &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            dir="ltr"
            style={menuStyle}
            className="flex items-center gap-2 rounded-xl border border-[#E6D6BC] bg-white p-2 shadow-[0_8px_24px_rgba(78,49,27,0.14)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <select
              value={parsed.hour}
              disabled={disabled}
              onChange={(e) => apply(e.target.value, parsed.minute)}
              className="min-w-0 flex-1 rounded-lg border border-[#E6D6BC] bg-[#FFF9F1] px-2 py-2.5 text-lg font-bold text-[#2D241D] outline-none"
              aria-label="שעה"
            >
              {HOURS.map((hour) => {
                const blocked = !!min && `${hour}:${parsed.minute}` < min;
                return (
                  <option key={hour} value={hour} disabled={blocked}>
                    {hour}
                  </option>
                );
              })}
            </select>

            <span className="text-lg font-black text-[#8A6A3D]">:</span>

            <select
              value={
                minuteOptions.includes(parsed.minute) ? parsed.minute : "00"
              }
              disabled={disabled}
              onChange={(e) => {
                apply(parsed.hour, e.target.value);
                setMenuOpen(false);
              }}
              className="min-w-0 flex-1 rounded-lg border border-[#E6D6BC] bg-[#FFF9F1] px-2 py-2.5 text-lg font-bold text-[#2D241D] outline-none"
              aria-label="דקה"
            >
              {minuteOptions.map((minute) => {
                const blocked = !!min && `${parsed.hour}:${minute}` < min;
                return (
                  <option key={minute} value={minute} disabled={blocked}>
                    {minute}
                  </option>
                );
              })}
            </select>
          </div>,
          document.body
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
