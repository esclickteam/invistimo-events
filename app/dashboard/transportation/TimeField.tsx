"use client";

import { useEffect, useState } from "react";
import { isValidTimeInput, normalizeTimeInput } from "@/lib/transportation/time";

type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
};

/**
 * Dual time input: native time picker + free-text HH:MM entry.
 */
export default function TimeField({
  label,
  value,
  onChange,
  placeholder = "08:00",
  hint,
  disabled,
}: TimeFieldProps) {
  const [text, setText] = useState(value || "");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(value || "");
    setInvalid(false);
  }, [value]);

  function commitText(next: string) {
    const trimmed = next.trim();
    if (!trimmed) {
      setInvalid(false);
      onChange("");
      setText("");
      return;
    }
    if (!isValidTimeInput(trimmed)) {
      setInvalid(true);
      return;
    }
    const normalized = normalizeTimeInput(trimmed);
    setInvalid(false);
    setText(normalized);
    onChange(normalized);
  }

  const pickerValue = normalizeTimeInput(value) || "";

  return (
    <label className="tx-time-field">
      <span className="tx-time-label">{label}</span>
      <div className="tx-time-row">
        <input
          type="time"
          className="tx-input tx-time-picker"
          value={pickerValue}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setInvalid(false);
            setText(next);
            onChange(next);
          }}
          aria-label={`${label} — בחירה משעון`}
        />
        <input
          type="text"
          className={`tx-input tx-time-text ${invalid ? "tx-time-invalid" : ""}`}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          inputMode="numeric"
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          onBlur={() => commitText(text)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText(text);
            }
          }}
          aria-label={`${label} — הזנה ידנית`}
        />
      </div>
      {invalid ? (
        <span className="tx-time-hint tx-time-error">הקלידו שעה תקינה כמו 08:00 או 00:30</span>
      ) : hint ? (
        <span className="tx-time-hint">{hint}</span>
      ) : (
        <span className="tx-time-hint">שעון או הקלדה ידנית (HH:MM)</span>
      )}
    </label>
  );
}
