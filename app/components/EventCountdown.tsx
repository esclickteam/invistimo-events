"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type Props = {
  invitation: any;
  compact?: boolean; // ⭐️ חדש – מצב קומפקטי להידר
};

export default function EventCountdown({
  invitation,
  compact = false,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!invitation?.eventDate) return;

    const target = new Date(invitation.eventDate).getTime();
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24);

      const months = Math.floor(totalDays / 30);
      const weeks = Math.floor((totalDays % 30) / 7);
      const days = totalDays % 7;

      setTimeLeft({
        months,
        weeks,
        days,
        hours: totalHours % 24,
        minutes: totalMinutes % 60,
        seconds: totalSeconds % 60,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation?.eventDate]);

  if (!timeLeft) return null;

  const boxes = [
    timeLeft.months > 0 && { label: "חודשים", value: timeLeft.months },
    timeLeft.weeks > 0 && { label: "שבועות", value: timeLeft.weeks },
    timeLeft.days > 0 && { label: "ימים", value: timeLeft.days },
    { label: "שעות", value: timeLeft.hours },
    { label: "דקות", value: timeLeft.minutes },
    { label: "שניות", value: timeLeft.seconds },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div dir="rtl">
      <div
        className={`
          inline-block
          bg-gradient-to-l from-black to-zinc-800
          text-white
          rounded-2xl
          border-2 border-[#c9b48f]
          shadow-[0_8px_22px_rgba(0,0,0,0.45)]
          ${compact ? "px-3 py-2" : "px-4 py-4"}
        `}
      >
        {/* כותרת – לא בהידר */}
        {!compact && (
          <div className="text-sm font-semibold mb-3 text-center">
            האירוע{" "}
            <span className="text-[#c9b48f] font-bold">
              {invitation.title || "שלך"}
            </span>{" "}
            יתחיל בעוד:
          </div>
        )}

        {/* ספירה */}
        <div
          className={`
            grid
            ${compact ? "grid-cols-3 gap-1" : "grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2"}
          `}
        >
          {boxes.map((b) => (
            <TimeBox
              key={b.label}
              value={b.value}
              label={b.label}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeBox({
  value,
  label,
  compact,
}: {
  value: number;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        bg-white/10
        border border-white/20
        rounded-xl
        text-center
        ${compact ? "px-2 py-1" : "py-2"}
      `}
    >
      <span
        className={`
          font-bold tabular-nums
          ${compact ? "text-sm" : "text-lg"}
        `}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className={`
          opacity-80
          ${compact ? "text-[10px]" : "text-[11px]"}
        `}
      >
        {label}
      </span>
    </div>
  );
}
