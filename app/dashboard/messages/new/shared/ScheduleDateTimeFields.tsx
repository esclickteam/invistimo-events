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
import { pad2, ymdToDisplay } from "@/lib/formatScheduleDateTime";

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

function useDropdownPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>
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
      const gap = 8;
      // Always open downward (portal escapes parent overflow clipping).
      const top = rect.bottom + gap;
      const width = Math.max(rect.width, 260);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      setPos({ top, left, width });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  return pos;
}

function PickerPortal({
  open,
  anchorRef,
  onClose,
  children,
  minWidth = 260,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(open, anchorRef);
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
    width: Math.max(pos.width, minWidth),
    zIndex: 99999,
  };

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="rounded-2xl border border-[#E6D6BC] bg-white shadow-[0_22px_60px_rgba(78,49,27,0.22)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * Date field: DD/MM/YYYY display + custom calendar opening below the field.
 * Parent state stays YYYY-MM-DD — scheduling logic unchanged.
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
  const display = ymdToDisplay(value);

  const selected = parseYmd(value);
  const minDate = parseYmd(min || "");
  const initialMonth = selected
    ? new Date(selected.y, selected.m - 1, 1)
    : new Date();
  const [view, setView] = useState(initialMonth);

  useEffect(() => {
    if (open) {
      setView(
        selected
          ? new Date(selected.y, selected.m - 1, 1)
          : new Date()
      );
    }
  }, [open, selected?.y, selected?.m, selected?.d]);

  const year = view.getFullYear();
  const month = view.getMonth(); // 0-based
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  // Hebrew week often starts Sunday — keep as-is matching native
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
      className={`relative flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-1 items-center gap-2 bg-transparent p-0 text-left outline-none"
        aria-label="תאריך שליחה"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          dir="ltr"
          className={`min-w-0 flex-1 select-none ${
            display ? "text-[#2D241D]" : "text-gray-400"
          }`}
        >
          {display || "DD/MM/YYYY"}
        </span>
        <span className="shrink-0 text-[#8A6A3D]" aria-hidden="true">
          <CalendarIcon />
        </span>
      </button>

      <PickerPortal
        open={open && !disabled}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        minWidth={300}
      >
        <div dir="rtl" className="bg-white p-3" role="dialog" aria-label="בחירת תאריך">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-xl px-2 py-1 text-sm font-bold text-[#8A6A3D] hover:bg-[#FFF3DD]"
              onClick={() => setView(new Date(year, month - 1, 1))}
              aria-label="חודש קודם"
            >
              ‹
            </button>
            <div className="text-sm font-black text-[#3A2417]">
              {MONTHS_HE[month]} {year}
            </div>
            <button
              type="button"
              className="rounded-xl px-2 py-1 text-sm font-bold text-[#8A6A3D] hover:bg-[#FFF3DD]"
              onClick={() => setView(new Date(year, month + 1, 1))}
              aria-label="חודש הבא"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#8A6A3D]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
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
                    setOpen(false);
                  }}
                  className={`h-9 rounded-xl text-sm font-bold transition ${
                    active
                      ? "bg-[#C5964D] text-white"
                      : blocked
                        ? "cursor-not-allowed text-gray-300"
                        : "text-[#3A2417] hover:bg-[#FFF3DD]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </PickerPortal>
    </div>
  );
}

/**
 * Time field: HH:mm (24h, no AM/PM) with portal popover opening below.
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
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseHHmm(value || "12:00"));
  const display = value || "";

  const minuteOptions = (() => {
    const base = [...MINUTES];
    if (draft.minute && !base.includes(draft.minute)) {
      base.push(draft.minute);
      base.sort();
    }
    return base;
  })();

  useEffect(() => {
    if (open) setDraft(parseHHmm(value || "12:00"));
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;
    const hourBtn = hourListRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    const minuteBtn = minuteListRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    hourBtn?.scrollIntoView({ block: "center" });
    minuteBtn?.scrollIntoView({ block: "center" });
  }, [open, draft.hour, draft.minute]);

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
            display ? "text-[#2D241D]" : "text-gray-400"
          }`}
        >
          {display || "HH:mm"}
        </span>
        <span className="shrink-0 text-[#8A6A3D]" aria-hidden="true">
          <ClockIcon />
        </span>
      </button>

      <PickerPortal
        open={open && !disabled}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        minWidth={240}
      >
        <div dir="ltr" className="overflow-hidden rounded-2xl bg-white" role="dialog" aria-label="בחירת שעה">
          <div className="grid grid-cols-2 border-b border-[#F0E3D1] bg-[#FFF9F1] text-center text-xs font-bold text-[#8A6A3D]">
            <div className="px-3 py-2">שעה</div>
            <div className="px-3 py-2">דקה</div>
          </div>

          <div className="grid grid-cols-2">
            <div
              ref={hourListRef}
              className="max-h-56 overflow-y-auto border-r border-[#F0E3D1] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {HOURS.map((hour) => {
                const sample = `${hour}:${draft.minute}`;
                const blocked = isBeforeMin(sample, min);
                const active = draft.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    data-active={active ? "true" : "false"}
                    disabled={blocked}
                    onClick={() => commit(hour, draft.minute, false)}
                    className={`block w-full px-3 py-2.5 text-sm font-bold transition ${
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

            <div
              ref={minuteListRef}
              className="max-h-56 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {minuteOptions.map((minute) => {
                const sample = `${draft.hour}:${minute}`;
                const blocked = isBeforeMin(sample, min);
                const active = draft.minute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    data-active={active ? "true" : "false"}
                    disabled={blocked}
                    onClick={() => commit(draft.hour, minute, true)}
                    className={`block w-full px-3 py-2.5 text-sm font-bold transition ${
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
      </PickerPortal>
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
