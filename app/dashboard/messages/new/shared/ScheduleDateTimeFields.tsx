"use client";

import { useEffect, useState } from "react";
import {
  displayToYmd,
  normalizeHHmm,
  ymdToDisplay,
} from "@/lib/formatScheduleDateTime";

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
};

/**
 * Date field that always displays DD/MM/YYYY (LTR).
 * Parent state stays YYYY-MM-DD — scheduling logic unchanged.
 */
export function ScheduleDateField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const [text, setText] = useState(() => ymdToDisplay(value));

  useEffect(() => {
    setText(ymdToDisplay(value));
  }, [value]);

  function commit(raw: string) {
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
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      placeholder="DD/MM/YYYY"
      autoComplete="off"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={className}
      aria-label="תאריך שליחה"
    />
  );
}

/**
 * Time field that always displays HH:mm (24h, no AM/PM).
 * Parent state stays HH:mm — scheduling logic unchanged.
 */
export function ScheduleTimeField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  const [text, setText] = useState(() => value || "");

  useEffect(() => {
    setText(value || "");
  }, [value]);

  function commit(raw: string) {
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

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      placeholder="HH:mm"
      autoComplete="off"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={className}
      aria-label="שעת שליחה"
    />
  );
}
