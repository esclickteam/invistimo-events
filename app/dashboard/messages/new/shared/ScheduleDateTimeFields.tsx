"use client";

/**
 * Native date/time inputs — original scheduling UI look (no custom modals).
 * lang="en-GB" + CSS hide AM/PM so the clock stays 24h without redesign.
 * Parent state stays YYYY-MM-DD / HH:mm — scheduling logic unchanged.
 */

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
};

export function ScheduleDateField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  return (
    <span lang="en-GB" className="contents">
      <input
        type="date"
        lang="en-GB"
        value={value}
        min={min}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        aria-label="תאריך שליחה"
      />
    </span>
  );
}

export function ScheduleTimeField({
  value,
  onChange,
  className = "",
  disabled,
  min,
}: FieldProps) {
  return (
    <span lang="en-GB" className="contents">
      <input
        type="time"
        lang="en-GB"
        value={value}
        min={min}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, 5))}
        className={`schedule-time-24h ${className}`}
        aria-label="שעת שליחה"
      />
    </span>
  );
}
