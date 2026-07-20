"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
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

type PopoverPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad2(i * 5));
const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTHS_HE = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

function parseHHmm(value: string): { hour: string; minute: string } {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return { hour: "12", minute: "00" };
  return { hour: m[1], minute: m[2] };
}

function isBeforeMin(hhmm: string, min?: string) {
  if (!min) return false;
  return hhmm < min;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

function toYmd(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Flush popover attached under the field (same width, tiny gap). */
function useAttachedPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  preferredHeight: number
) {
  const [pos, setPos] = useState<PopoverPos | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 2;
      const edge = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - edge;
      const spaceAbove = rect.top - gap - edge;
      const openDown = spaceBelow >= 120 || spaceBelow >= spaceAbove;
      const available = openDown ? spaceBelow : spaceAbove;
      const maxHeight = Math.max(110, Math.min(preferredHeight, available));
      const top = openDown
        ? rect.bottom + gap
        : Math.max(edge, rect.top - gap - maxHeight);

      setPos({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, preferredHeight]);

  return pos;
}

function AttachedPopover({
  open,
  anchorRef,
  onClose,
  preferredHeight,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  preferredHeight: number;
  children: (maxHeight: number) => ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useAttachedPosition(open, anchorRef, preferredHeight);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !pos) return null;

  const style: CSSProperties = {
    position: "fixed",
    top: pos.top,
    left: pos.left,
    width: pos.width,
    maxHeight: pos.maxHeight,
    zIndex: 99999,
  };

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="overflow-hidden rounded-b-2xl rounded-t-md border border-[#E6D6BC] border-t-[#F0E3D1] bg-white shadow-[0_10px_28px_rgba(78,49,27,0.14)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children(pos.maxHeight)}
    </div>,
    document.body
  );
}

/**
 * Date: type DD/MM/YYYY manually, or open a small calendar flush under the field.
 * Parent state stays YYYY-MM-DD.
 */
export function ScheduleDateField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => ymdToDisplay(value));

  const selected = parseYmd(value);
  const minDate = parseYmd(min || "");
  const [view, setView] = useState(() =>
    selected ? new Date(selected.y, selected.m - 1, 1) : new Date()
  );

  useEffect(() => {
    setText(ymdToDisplay(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    setView(selected ? new Date(selected.y, selected.m - 1, 1) : new Date());
  }, [open, value]);

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

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function isDisabledDay(day: number) {
    if (!minDate) return false;
    const ymd = toYmd(year, month + 1, day);
    return ymd < toYmd(minDate.y, minDate.m, minDate.d);
  }

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center gap-2 ${className}`}
    >
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
        className="min-w-0 flex-1 bg-transparent p-0 text-sm outline-none border-0 disabled:opacity-60"
        aria-label="תאריך שליחה"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 text-[#8A6A3D] transition hover:text-[#5C4030] disabled:opacity-50"
        aria-label="בחירת תאריך"
        title="בחירת תאריך"
      >
        <CalendarIcon />
      </button>

      <AttachedPopover
        open={open && !disabled}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        preferredHeight={220}
      >
        {(maxHeight) => (
          <div
            dir="rtl"
            className="bg-white p-1.5"
            style={{ maxHeight, overflow: "auto" }}
          >
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                className="rounded px-1 text-xs text-[#8A6A3D] hover:bg-[#FFF3DD]"
                onClick={() => setView(new Date(year, month - 1, 1))}
              >
                ‹
              </button>
              <div className="text-[11px] font-bold text-[#3A2417]">
                {MONTHS_HE[month]} {year}
              </div>
              <button
                type="button"
                className="rounded px-1 text-xs text-[#8A6A3D] hover:bg-[#FFF3DD]"
                onClick={() => setView(new Date(year, month + 1, 1))}
              >
                ›
              </button>
            </div>

            <div className="mb-0.5 grid grid-cols-7 text-center text-[9px] text-[#A07A4A]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-0.5">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const ymd = toYmd(year, month + 1, day);
                const active = value === ymd;
                const blocked = isDisabledDay(day);
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={blocked}
                    onClick={() => {
                      onChange(ymd);
                      setText(ymdToDisplay(ymd));
                      setOpen(false);
                    }}
                    className={`h-6 rounded text-[11px] font-semibold ${
                      active
                        ? "bg-[#C5964D] text-white"
                        : blocked
                          ? "text-gray-300"
                          : "text-[#3A2417] hover:bg-[#FFF3DD]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </AttachedPopover>
    </div>
  );
}

/**
 * Time: type HH:mm manually, or open a small 24h list flush under the field.
 * Parent state stays HH:mm.
 */
export function ScheduleTimeField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => value || "");
  const [draft, setDraft] = useState(() => parseHHmm(value || "12:00"));

  const minuteOptions = (() => {
    const base = [...MINUTES];
    if (draft.minute && !base.includes(draft.minute)) {
      base.push(draft.minute);
      base.sort();
    }
    return base;
  })();

  useEffect(() => {
    setText(value || "");
  }, [value]);

  useEffect(() => {
    if (open) setDraft(parseHHmm(value || "12:00"));
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;
    hourListRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "center" });
    minuteListRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "center" });
  }, [open, draft.hour, draft.minute]);

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

  function pick(hour: string, minute: string, close: boolean) {
    const next = `${hour}:${minute}`;
    if (isBeforeMin(next, min)) return;
    setDraft({ hour, minute });
    onChange(next);
    setText(next);
    if (close) setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center gap-2 ${className}`}
    >
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        placeholder="HH:mm"
        autoComplete="off"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-w-0 flex-1 bg-transparent p-0 text-sm outline-none border-0 disabled:opacity-60"
        aria-label="שעת שליחה"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 text-[#8A6A3D] transition hover:text-[#5C4030] disabled:opacity-50"
        aria-label="בחירת שעה"
        title="בחירת שעה"
      >
        <ClockIcon />
      </button>

      <AttachedPopover
        open={open && !disabled}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        preferredHeight={150}
      >
        {(maxHeight) => (
          <div className="grid grid-cols-2 bg-white" style={{ height: maxHeight }}>
            <div
              ref={hourListRef}
              className="h-full overflow-y-auto border-r border-[#F0E3D1] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {HOURS.map((hour) => {
                const blocked = isBeforeMin(`${hour}:${draft.minute}`, min);
                const active = draft.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    data-active={active ? "true" : "false"}
                    disabled={blocked}
                    onClick={() => pick(hour, draft.minute, false)}
                    className={`block w-full py-1 text-center text-xs font-semibold ${
                      active
                        ? "bg-[#C5964D] text-white"
                        : blocked
                          ? "text-gray-300"
                          : "text-[#3A2417] hover:bg-[#FFF3DD]"
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            <div
              ref={minuteListRef}
              className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {minuteOptions.map((minute) => {
                const blocked = isBeforeMin(`${draft.hour}:${minute}`, min);
                const active = draft.minute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    data-active={active ? "true" : "false"}
                    disabled={blocked}
                    onClick={() => pick(draft.hour, minute, true)}
                    className={`block w-full py-1 text-center text-xs font-semibold ${
                      active
                        ? "bg-[#C5964D] text-white"
                        : blocked
                          ? "text-gray-300"
                          : "text-[#3A2417] hover:bg-[#FFF3DD]"
                    }`}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </AttachedPopover>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
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
      width="16"
      height="16"
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
